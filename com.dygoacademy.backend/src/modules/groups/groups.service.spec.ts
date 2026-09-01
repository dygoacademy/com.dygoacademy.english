import { ConflictException, GoneException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DatabaseService } from '../../database/database.service';
import { GroupsService } from './groups.service';

/** Builds a fresh GroupsService wired to a stubbed DatabaseService.queryAs (and, optionally, withUser). */
async function makeService(
  queryAsMock: jest.Mock,
  withUserMock?: jest.Mock,
): Promise<GroupsService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      GroupsService,
      {
        provide: DatabaseService,
        useValue: { queryAs: queryAsMock, withUser: withUserMock ?? jest.fn() },
      },
    ],
  }).compile();
  return moduleRef.get(GroupsService);
}

/** Fakes DatabaseService.withUser by handing the callback a stub pg client (same helper shape as SrsService's spec). */
function withUserOf(queryMock: jest.Mock): jest.Mock {
  return jest.fn((_userId: string, work: (client: { query: jest.Mock }) => unknown) =>
    work({ query: queryMock }),
  );
}

describe('GroupsService', () => {
  describe('findMine', () => {
    let service: GroupsService;
    let queryAsMock: jest.Mock;

    beforeEach(async () => {
      queryAsMock = jest.fn().mockResolvedValue([
        {
          id: 'group-1',
          tenant_id: 'tenant-1',
          name: "Sarah's IELTS Cohort",
          description: null,
          is_public: false,
          role: 'ADMIN',
          created_at: new Date('2026-08-01T00:00:00Z'),
        },
      ]);
      service = await makeService(queryAsMock);
    });

    it('scopes the query through queryAs with the caller id, not a raw query', async () => {
      await service.findMine('user-42');

      expect(queryAsMock).toHaveBeenCalledTimes(1);
      const [userId] = queryAsMock.mock.calls[0];
      expect(userId).toBe('user-42');
    });

    it('joins to group_members and filters on the caller — membership, not just RLS visibility', async () => {
      await service.findMine('user-42');

      const [, sql, params] = queryAsMock.mock.calls[0];
      expect(sql).toMatch(/join public\.group_members/i);
      expect(sql).toMatch(/where gm\.user_id = \$1/i);
      expect(params).toEqual(['user-42']);
    });

    it('returns the rows from the database layer unchanged', async () => {
      const result = await service.findMine('user-42');

      expect(result).toEqual([expect.objectContaining({ id: 'group-1', role: 'ADMIN' })]);
    });
  });

  describe('create', () => {
    let service: GroupsService;
    let queryAsMock: jest.Mock;

    beforeEach(async () => {
      queryAsMock = jest.fn().mockResolvedValue([
        {
          id: 'group-2',
          tenant_id: 'tenant-1',
          name: 'New Group',
          description: null,
          is_public: false,
          created_at: new Date('2026-09-01T00:00:00Z'),
        },
      ]);
      service = await makeService(queryAsMock);
    });

    it('lets Postgres compute tenant_id from the caller rather than trusting the body', async () => {
      await service.create('user-1', { name: '  New Group  ' });

      const [userId, sql, params] = queryAsMock.mock.calls[0];
      expect(userId).toBe('user-1');
      expect(sql).toMatch(/current_user_tenant_id\(\)/);
      // owner_id ($1) comes from the authenticated caller, trimmed name is $2 — the
      // request body never supplies tenant_id or owner_id directly.
      expect(params).toEqual(['user-1', 'New Group', null, false]);
    });

    it("returns the created group with the caller's role set to ADMIN, matching the trigger", async () => {
      const result = await service.create('user-1', { name: 'New Group' });

      expect(result.role).toBe('ADMIN');
      expect(result.id).toBe('group-2');
    });
  });

  describe('update', () => {
    it('coalesces omitted fields to null so Postgres keeps the existing value', async () => {
      const queryAsMock = jest.fn().mockResolvedValue([{ id: 'group-1', name: 'Renamed' }]);
      const service = await makeService(queryAsMock);

      await service.update('user-1', 'group-1', { name: 'Renamed' });

      const [userId, sql, params] = queryAsMock.mock.calls[0];
      expect(userId).toBe('user-1');
      expect(sql).toMatch(/update public\.groups/i);
      expect(params).toEqual(['group-1', 'Renamed', null, null]);
    });

    it('throws NotFoundException on zero rows — RLS filters non-ADMIN and missing groups identically', async () => {
      const queryAsMock = jest.fn().mockResolvedValue([]);
      const service = await makeService(queryAsMock);

      await expect(service.update('user-1', 'group-1', { name: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException on zero rows', async () => {
      const queryAsMock = jest.fn().mockResolvedValue([]);
      const service = await makeService(queryAsMock);

      await expect(service.remove('user-1', 'group-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('resolves when a row is deleted', async () => {
      const queryAsMock = jest.fn().mockResolvedValue([{ id: 'group-1' }]);
      const service = await makeService(queryAsMock);

      await expect(service.remove('user-1', 'group-1')).resolves.toBeUndefined();
    });
  });

  describe('findMembers', () => {
    it('scopes to the group id and lets RLS decide how much roster is visible', async () => {
      const queryAsMock = jest.fn().mockResolvedValue([
        {
          user_id: 'user-1',
          role: 'ADMIN',
          joined_at: new Date('2026-08-01T00:00:00Z'),
          email: 'sarah@dygo.test',
          display_name: 'Sarah',
        },
      ]);
      const service = await makeService(queryAsMock);

      const result = await service.findMembers('user-1', 'group-1');

      const [, sql, params] = queryAsMock.mock.calls[0];
      expect(sql).toMatch(/from public\.group_members/i);
      expect(params).toEqual(['group-1']);
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('sarah@dygo.test');
      expect(result[0].display_name).toBe('Sarah');
    });

    it('left joins profiles rather than inner joining, so a member with no visible profile is not dropped from the roster', async () => {
      const queryAsMock = jest.fn().mockResolvedValue([
        {
          user_id: 'user-2',
          role: 'READ',
          joined_at: new Date('2026-08-02T00:00:00Z'),
          email: null,
          display_name: null,
        },
      ]);
      const service = await makeService(queryAsMock);

      const result = await service.findMembers('user-1', 'group-1');

      const [, sql] = queryAsMock.mock.calls[0];
      expect(sql).toMatch(/left join public\.profiles/i);
      expect(result).toHaveLength(1);
      expect(result[0].email).toBeNull();
      expect(result[0].display_name).toBeNull();
    });
  });

  describe('updateMemberRole', () => {
    it('throws NotFoundException on zero rows', async () => {
      const queryAsMock = jest.fn().mockResolvedValue([]);
      const service = await makeService(queryAsMock);

      await expect(
        service.updateMemberRole('admin-1', 'group-1', 'member-1', 'WRITE'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('passes group id, member id and new role as parameters, in that order', async () => {
      const queryAsMock = jest
        .fn()
        .mockResolvedValue([{ user_id: 'member-1', role: 'WRITE', joined_at: new Date() }]);
      const service = await makeService(queryAsMock);

      await service.updateMemberRole('admin-1', 'group-1', 'member-1', 'WRITE');

      const [, , params] = queryAsMock.mock.calls[0];
      expect(params).toEqual(['group-1', 'member-1', 'WRITE']);
    });
  });

  describe('removeMember', () => {
    it('throws NotFoundException when the membership does not exist (or is not visible to the caller)', async () => {
      const queryMock = jest.fn().mockResolvedValueOnce({ rows: [] });
      const service = await makeService(jest.fn(), withUserOf(queryMock));

      await expect(service.removeMember('admin-1', 'group-1', 'member-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(queryMock).toHaveBeenCalledTimes(1); // stopped after the existence check, no delete attempted
    });

    it('removes a non-ADMIN member without checking the ADMIN count', async () => {
      const queryMock = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ role: 'WRITE' }] }) // membership lookup
        .mockResolvedValueOnce({ rows: [{ id: 'membership-1' }] }); // delete
      const service = await makeService(jest.fn(), withUserOf(queryMock));

      await service.removeMember('admin-1', 'group-1', 'member-1');

      expect(queryMock).toHaveBeenCalledTimes(2); // no ADMIN-count query for a non-ADMIN target
    });

    it('blocks removing the last ADMIN', async () => {
      const queryMock = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ role: 'ADMIN' }] }) // membership lookup
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // only one ADMIN left
      const service = await makeService(jest.fn(), withUserOf(queryMock));

      await expect(service.removeMember('admin-1', 'group-1', 'admin-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(queryMock).toHaveBeenCalledTimes(2); // stopped before the delete
    });

    it('allows removing an ADMIN when another ADMIN remains', async () => {
      const queryMock = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ role: 'ADMIN' }] })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'membership-1' }] });
      const service = await makeService(jest.fn(), withUserOf(queryMock));

      await expect(
        service.removeMember('admin-1', 'group-1', 'other-admin'),
      ).resolves.toBeUndefined();
      expect(queryMock).toHaveBeenCalledTimes(3);
    });

    it('throws NotFoundException when RLS blocks the delete itself (caller lacks ADMIN)', async () => {
      const queryMock = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ role: 'WRITE' }] })
        .mockResolvedValueOnce({ rows: [] }); // group_members_delete_admin filtered the DELETE's target row out
      const service = await makeService(jest.fn(), withUserOf(queryMock));

      await expect(service.removeMember('write-1', 'group-1', 'member-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createInvite', () => {
    it('generates a raw token, hashes it in Postgres, and returns the raw token exactly once', async () => {
      const queryAsMock = jest.fn().mockResolvedValue([
        {
          id: 'invite-1',
          grant_role: 'READ',
          max_uses: 20,
          use_count: 0,
          expires_at: null,
          created_at: new Date('2026-09-01T00:00:00Z'),
        },
      ]);
      const service = await makeService(queryAsMock);

      const result = await service.createInvite('admin-1', 'group-1', { maxUses: 20 });

      const [userId, sql, params] = queryAsMock.mock.calls[0];
      expect(userId).toBe('admin-1');
      expect(sql).toMatch(/public\.hash_invite_token/i);
      expect(params[0]).toBe('group-1');
      expect(params[1]).toBe('admin-1'); // created_by is the caller, not trusted from the body
      expect(typeof params[2]).toBe('string'); // the raw token
      expect(result.token).toBe(params[2]);
      expect(result.id).toBe('invite-1');
    });

    it('computes expires_at from expiresInHours rather than trusting a raw date from the body', async () => {
      const queryAsMock = jest.fn().mockResolvedValue([
        {
          id: 'invite-1',
          grant_role: 'READ',
          max_uses: null,
          use_count: 0,
          expires_at: null,
          created_at: new Date(),
        },
      ]);
      const service = await makeService(queryAsMock);
      const before = Date.now();

      await service.createInvite('admin-1', 'group-1', { expiresInHours: 24 });

      const [, , params] = queryAsMock.mock.calls[0];
      const expiresAt = params[5] as Date;
      expect(expiresAt.getTime()).toBeGreaterThan(before + 23 * 60 * 60 * 1000);
      expect(expiresAt.getTime()).toBeLessThan(before + 25 * 60 * 60 * 1000);
    });
  });

  describe('listInvites', () => {
    it('filters to live invites only — not revoked, not expired, not exhausted', async () => {
      const queryAsMock = jest.fn().mockResolvedValue([]);
      const service = await makeService(queryAsMock);

      await service.listInvites('admin-1', 'group-1');

      const [, sql] = queryAsMock.mock.calls[0];
      expect(sql).toMatch(/revoked_at is null/i);
      expect(sql).toMatch(/expires_at is null or expires_at > now\(\)/i);
      expect(sql).toMatch(/max_uses is null or use_count < max_uses/i);
    });
  });

  describe('revokeInvite', () => {
    it('throws NotFoundException on zero rows (not found or already revoked)', async () => {
      const queryAsMock = jest.fn().mockResolvedValue([]);
      const service = await makeService(queryAsMock);

      await expect(service.revokeInvite('admin-1', 'invite-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('is a soft-revoke UPDATE, not a DELETE', async () => {
      const queryAsMock = jest.fn().mockResolvedValue([{ id: 'invite-1' }]);
      const service = await makeService(queryAsMock);

      await service.revokeInvite('admin-1', 'invite-1');

      const [, sql] = queryAsMock.mock.calls[0];
      expect(sql).toMatch(/update public\.group_invites/i);
      expect(sql).toMatch(/set\s+revoked_at\s*=\s*now\(\)/i);
    });
  });

  describe('redeemInvite', () => {
    it('returns the redeemed row on success', async () => {
      const queryAsMock = jest.fn().mockResolvedValue([
        {
          group_id: 'group-1',
          group_name: 'Oxford',
          granted_role: 'READ',
          already_member: false,
        },
      ]);
      const service = await makeService(queryAsMock);

      const result = await service.redeemInvite('user-1', 'raw-token');

      expect(result.group_id).toBe('group-1');
      const [, sql, params] = queryAsMock.mock.calls[0];
      expect(sql).toMatch(/public\.redeem_group_invite/i);
      expect(params).toEqual(['raw-token']);
    });

    it('maps errcode P0002 (not found) to NotFoundException', async () => {
      const queryAsMock = jest
        .fn()
        .mockRejectedValue({ code: 'P0002', message: 'invite not found' });
      const service = await makeService(queryAsMock);

      await expect(service.redeemInvite('user-1', 'bad-token')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('maps errcode 22023 (revoked/expired/exhausted) to GoneException', async () => {
      const queryAsMock = jest
        .fn()
        .mockRejectedValue({ code: '22023', message: 'invite has expired' });
      const service = await makeService(queryAsMock);

      await expect(service.redeemInvite('user-1', 'dead-token')).rejects.toBeInstanceOf(
        GoneException,
      );
    });
  });
});
