import { authHeader, ApiEnvelope, request } from '../support/client';
import { GROUPS, TOPICS, WORDS } from '../support/fixtures';

describe('Module 1 — Topics', () => {
  it('GET /topics/:id returns topic detail plus words for a member (alex, READ)', async () => {
    const res = await request.get(`/topics/${TOPICS.unit1AbstractNouns}`).set(authHeader('alex'));
    expect(res.status).toBe(200);
    const body = (res.body as ApiEnvelope<{ words: Array<{ id: string; status: string }> }>).data;
    const ids = body.words.map((w) => w.id);
    expect(ids).toEqual(expect.arrayContaining([WORDS.ephemeral, WORDS.resilient]));
  });

  it('GET /topics/:id on a rival-tenant private topic is 404, not 403 (no existence leak)', async () => {
    const res = await request.get(`/topics/${TOPICS.rivalPrivateTopic}`).set(authHeader('alex'));
    expect(res.status).toBe(404);
  });

  it('GET /topics includes public topics from another tenant (awlSublist1 is is_public=true)', async () => {
    const res = await request.get('/topics').set(authHeader('dana'));
    expect(res.status).toBe(200);
    const ids = (res.body as ApiEnvelope<Array<{ id: string }>>).data.map((t) => t.id);
    expect(ids).toContain(TOPICS.awlSublist1);
    expect(ids).not.toContain(TOPICS.unit1AbstractNouns); // private, different tenant
  });

  describe('write permission boundaries', () => {
    it('POST /topics as READ (alex) is blocked', async () => {
      const res = await request
        .post('/topics')
        .set(authHeader('alex'))
        .send({ groupId: GROUPS.ieltsClass, title: 'Should not be created' });
      expect([403, 404]).toContain(res.status);
    });

    it('POST /topics as WRITE (marco) succeeds; PATCH by marco succeeds; DELETE by marco (WRITE, not ADMIN) is blocked', async () => {
      const created = await request
        .post('/topics')
        .set(authHeader('marco'))
        .send({ groupId: GROUPS.ieltsClass, title: `QA topic ${Date.now()}`, isPublic: false });
      expect(created.status).toBe(201);
      const topicId = (created.body as ApiEnvelope<{ id: string }>).data.id;

      const patched = await request
        .patch(`/topics/${topicId}`)
        .set(authHeader('marco'))
        .send({ description: 'edited by marco, a WRITE co-teacher' });
      expect(patched.status).toBe(200);

      const deleteAsWrite = await request.delete(`/topics/${topicId}`).set(authHeader('marco'));
      expect([403, 404]).toContain(deleteAsWrite.status);

      // ADMIN cleanup.
      const deleteAsAdmin = await request.delete(`/topics/${topicId}`).set(authHeader('sarah'));
      expect(deleteAsAdmin.status).toBe(204);
    });
  });

  describe('cloning a public topic (FR-1.1)', () => {
    it('WRITE caller clones a public topic into their own group, words included, lexicon reused', async () => {
      const clone = await request
        .post(`/topics/${TOPICS.awlSublist1}/clone`)
        .set(authHeader('marco'))
        .send({ targetGroupId: GROUPS.ieltsClass });
      expect(clone.status).toBe(201);
      const cloned = (clone.body as ApiEnvelope<{ id: string; is_public: boolean }>).data;
      expect(cloned.id).not.toBe(TOPICS.awlSublist1);
      expect(cloned.is_public).toBe(false); // private-by-default per the spec

      const detail = await request.get(`/topics/${cloned.id}`).set(authHeader('marco'));
      const words = (detail.body as ApiEnvelope<{ words: Array<{ source_word: string }> }>).data
        .words;
      expect(words.map((w) => w.source_word)).toContain('analyse');

      await request.delete(`/topics/${cloned.id}`).set(authHeader('sarah'));
    });

    it('cloning a topic that is not actually public is rejected even if the caller can read it', async () => {
      // unit1AbstractNouns is private; sarah owns it, so RLS alone would
      // let her "clone" it if the endpoint only checked RLS-readability
      // instead of explicitly checking is_public — this is the check the
      // route's own doc comment calls out.
      const res = await request
        .post(`/topics/${TOPICS.unit1AbstractNouns}/clone`)
        .set(authHeader('sarah'))
        .send({ targetGroupId: GROUPS.publicAwl });
      expect([400, 403, 404]).toContain(res.status);
    });
  });
});
