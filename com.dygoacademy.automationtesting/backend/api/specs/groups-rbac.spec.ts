import { authHeader, ApiEnvelope, request } from '../support/client';
import { FIXTURES, GROUPS } from '../support/fixtures';

describe('Module 1 — Groups & RBAC', () => {
  describe('reading the seeded roster', () => {
    it("GET /groups lists sarah's own groups, including the private one", async () => {
      const res = await request.get('/groups').set(authHeader('sarah'));
      expect(res.status).toBe(200);
      const body: ApiEnvelope<Array<{ id: string }>> = res.body;
      const ids = body.data.map((g) => g.id);
      expect(ids).toEqual(expect.arrayContaining([GROUPS.ieltsClass, GROUPS.publicAwl]));
    });

    it('GET /groups never returns a group from another tenant (dana cannot see it)', async () => {
      const res = await request.get('/groups').set(authHeader('dana'));
      expect(res.status).toBe(200);
      const ids = (res.body as ApiEnvelope<Array<{ id: string }>>).data.map((g) => g.id);
      expect(ids).not.toContain(GROUPS.ieltsClass);
      expect(ids).not.toContain(GROUPS.publicAwl);
    });

    it('GET /groups/:id/members — WRITE (marco) sees the full roster', async () => {
      const res = await request.get(`/groups/${GROUPS.ieltsClass}/members`).set(authHeader('marco'));
      expect(res.status).toBe(200);
      const roles = (res.body as ApiEnvelope<Array<{ user_id: string; role: string }>>).data;
      expect(roles.length).toBeGreaterThanOrEqual(4); // sarah, marco, alex, priya
      expect(roles.find((r) => r.user_id === FIXTURES.sarah.id)?.role).toBe('ADMIN');
    });

    it('GET /groups/:id/members — READ (alex) sees only their own row', async () => {
      const res = await request.get(`/groups/${GROUPS.ieltsClass}/members`).set(authHeader('alex'));
      expect(res.status).toBe(200);
      const roles = (res.body as ApiEnvelope<Array<{ user_id: string }>>).data;
      expect(roles).toHaveLength(1);
      expect(roles[0].user_id).toBe(FIXTURES.alex.id);
    });
  });

  describe('write permission boundaries', () => {
    it('PATCH /groups/:id as a non-member is invisible (404, not 403 — RLS hides the row)', async () => {
      const res = await request
        .patch(`/groups/${GROUPS.ieltsClass}`)
        .set(authHeader('dana'))
        .send({ name: 'hacked by dana' });
      expect(res.status).toBe(404);
    });

    it('PATCH /groups/:id as WRITE (not ADMIN) is also blocked', async () => {
      const res = await request
        .patch(`/groups/${GROUPS.ieltsClass}`)
        .set(authHeader('marco'))
        .send({ name: 'renamed by marco' });
      expect(res.status).toBe(404);
    });

    it('PATCH /groups/:id as ADMIN succeeds and is visible on the next read', async () => {
      const newDescription = `QA pass @ ${new Date().toISOString()}`;
      const patch = await request
        .patch(`/groups/${GROUPS.ieltsClass}`)
        .set(authHeader('sarah'))
        .send({ description: newDescription });
      expect(patch.status).toBe(200);

      const list = await request.get('/groups').set(authHeader('sarah'));
      const group = (list.body as ApiEnvelope<Array<{ id: string; description: string }>>).data.find(
        (g) => g.id === GROUPS.ieltsClass,
      );
      expect(group?.description).toBe(newDescription);
    });
  });

  describe('self-service group creation (owner auto-ADMIN)', () => {
    // KNOWN FAILING as of 2026-09-01: the live Postgres volume predates the
    // trg_group_owner_membership trigger (committed 04:11 AM in
    // 001_initial_schema.sql, migration volume created 2026-08-30) and
    // 001-003 are not safe to re-run on an already-migrated database. This
    // test passes against the *code as written* and against a freshly
    // migrated database — it currently fails live, which is exactly the
    // regression it exists to catch. Re-run after the DB reset discussed
    // for 2026-09-01 (`docker compose down -v && up && apply-migrations.sh
    // --seed`) to confirm the fix, then delete this comment block.
    it('a fresh group seats its creator as ADMIN automatically', async () => {
      const created = await request
        .post('/groups')
        .set(authHeader('sarah'))
        .send({ name: `QA self-service group ${Date.now()}` });
      expect(created.status).toBe(201);
      const groupId = (created.body as ApiEnvelope<{ id: string }>).data.id;

      const members = await request.get(`/groups/${groupId}/members`).set(authHeader('sarah'));
      const roles = (members.body as ApiEnvelope<Array<{ user_id: string; role: string }>>).data;
      expect(roles).toContainEqual(
        expect.objectContaining({ user_id: FIXTURES.sarah.id, role: 'ADMIN' }),
      );

      await request.delete(`/groups/${groupId}`).set(authHeader('sarah'));
    });
  });

  describe('magic invite links (FR-1.3)', () => {
    let groupId: string;

    beforeAll(async () => {
      // Independent of the self-service-ADMIN bug above: seed this group's
      // membership explicitly isn't possible over the API, so this suite
      // mints an invite on the pre-seeded ieltsClass group instead, where
      // sarah is ADMIN for real (004_seed_data.sql inserts the row
      // directly, not via the trigger).
      groupId = GROUPS.ieltsClass;
    });

    it('ADMIN mints a READ invite, a stranger redeems it, and the roster updates', async () => {
      const minted = await request
        .post(`/groups/${groupId}/invites`)
        .set(authHeader('sarah'))
        .send({ grantRole: 'READ' });
      expect(minted.status).toBe(201);
      const token = (minted.body as ApiEnvelope<{ token: string }>).data.token;
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(10);

      const redeemed = await request.post(`/invites/${token}/redeem`).set(authHeader('dana'));
      expect(redeemed.status).toBe(200);
      const redeemedBody = (redeemed.body as ApiEnvelope<{ already_member: boolean }>).data;
      expect(redeemedBody.already_member).toBe(false);

      const replay = await request.post(`/invites/${token}/redeem`).set(authHeader('dana'));
      expect(replay.status).toBe(200);
      expect((replay.body as ApiEnvelope<{ already_member: boolean }>).data.already_member).toBe(
        true,
      );

      // Cleanup: revoke dana's read access isn't exposed by the API for a
      // non-ADMIN removing themselves; leave dana seated — 004's fixtures
      // are reset by a full migration reset anyway, not by test cleanup.
    });

    it('redeeming an unknown token is 404', async () => {
      const res = await request
        .post('/invites/not-a-real-token-00000000000000000000000000000000/redeem')
        .set(authHeader('priya'));
      expect(res.status).toBe(404);
    });

    it('a non-ADMIN (marco, WRITE) cannot mint an invite', async () => {
      const res = await request
        .post(`/groups/${groupId}/invites`)
        .set(authHeader('marco'))
        .send({ grantRole: 'READ' });
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('last-ADMIN-removal guard', () => {
    it('removing the sole ADMIN of a group is rejected with 409', async () => {
      // publicAwl has exactly one member: sarah, ADMIN. Removing her would
      // leave the group unmanageable.
      const res = await request
        .delete(`/groups/${GROUPS.publicAwl}/members/${FIXTURES.sarah.id}`)
        .set(authHeader('sarah'));
      expect(res.status).toBe(409);
    });
  });
});
