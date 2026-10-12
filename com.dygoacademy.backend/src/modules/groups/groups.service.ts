import { randomBytes } from 'node:crypto';

import { ConflictException, GoneException, Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupRoleInput } from './dto/update-member-role.dto';

export type GroupRole = 'ADMIN' | 'WRITE' | 'READ';

export interface GroupSummary {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  /** The caller's own role in this group — always 'ADMIN' on the row just created. */
  role: GroupRole;
  created_at: Date;
}

export interface GroupRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: Date;
}

export interface GroupMember {
  user_id: string;
  role: GroupRole;
  joined_at: Date;
  /**
   * From a `left join` onto `profiles`, not `group_members` itself. Used to
   * be null for a member who joined via a redeemed invite link — their
   * `profiles.tenant_id` is always set (`006_solo_tenant_provisioning.sql`
   * provisions a personal tenant for every signup), but it's their OWN
   * personal tenant, deliberately distinct from the inviting teacher's, so
   * it never equality-matched the caller's `current_user_tenant_id()`.
   * Fixed in `008_profiles_group_visibility.sql`: `profiles_select_self_or_tenant`
   * gained a `shares_group_with(id)` clause, so any groupmate's profile is
   * now visible regardless of tenant. The left join (not inner) stays
   * deliberate anyway — a future profile genuinely invisible for some other
   * reason should still render as a roster row with no name, not vanish.
   */
  email: string | null;
  display_name: string | null;
}

export interface GroupInviteSummary {
  id: string;
  grant_role: GroupRole;
  max_uses: number | null;
  use_count: number;
  expires_at: Date | null;
  created_at: Date;
}

export interface CreatedInvite extends GroupInviteSummary {
  /** Shown exactly once. Only its SHA-256 hash is ever persisted. */
  token: string;
}

export interface RedeemedInvite {
  group_id: string;
  group_name: string;
  granted_role: GroupRole;
  already_member: boolean;
}

/** Postgres error codes/errcodes this service translates into HTTP responses. */
const PG_INVITE_NOT_FOUND = 'P0002';
const PG_INVITE_NO_LONGER_VALID = '22023';

/** Module 1 — Collaborative groups, topics & RBAC (Phase 1). */
@Injectable()
export class GroupsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Groups this user belongs to — deliberately narrower than
   * `groups_select` in 002_rls_policies.sql, which also lets a caller see
   * every public group and (for tenant admins) every group in their tenant.
   * "GET /groups" means "my groups" (docs/architecture/dygo_academy_api_surface.md §4), so this
   * adds an explicit membership join on top of RLS rather than relying on the
   * select policy alone — narrowing business semantics, not re-implementing
   * authorization: RLS still gates every row underneath this query.
   */
  async findMine(userId: string): Promise<GroupSummary[]> {
    return this.db.queryAs<GroupSummary>(
      userId,
      `select g.id,
              g.tenant_id,
              g.name,
              g.description,
              g.is_public,
              gm.role,
              g.created_at
         from public.groups g
         join public.group_members gm on gm.group_id = g.id
        where gm.user_id = $1
        order by g.created_at desc`,
      [userId],
    );
  }

  /**
   * Creates a group owned by the caller.
   *
   * `groups_insert` (002_rls_policies.sql) requires `owner_id = auth.uid()`
   * and `tenant_id = current_user_tenant_id()`, so tenant_id is computed by
   * Postgres from the caller's own profile rather than trusted from the
   * request body — a client cannot create a group in someone else's tenant
   * by lying about the id.
   *
   * No separate "add myself as ADMIN" step: trg_group_owner_membership
   * (001_initial_schema.sql) does that inside the same INSERT. Before that
   * trigger existed, this was impossible to do as an authenticated user at
   * all — groups_insert only checks owner_id, but adding the first
   * group_members row required already having ADMIN on the group. See the
   * trigger's own comment for the full explanation.
   *
   * **Fixed (9th pass):** `groups.tenant_id` is NOT NULL, and every caller
   * now always has one — `handle_new_auth_user()`
   * (006_solo_tenant_provisioning.sql) provisions a personal, unpaid
   * (0-seat) tenant for every new signup at the moment their profile is
   * created, closing the standing "solo-user tenant provisioning" gap.
   * `current_user_tenant_id()` can no longer return NULL for a real user.
   */
  async create(userId: string, dto: CreateGroupDto): Promise<GroupSummary> {
    const rows = await this.db.queryAs<GroupRow>(
      userId,
      `insert into public.groups (tenant_id, owner_id, name, description, is_public)
       values (public.current_user_tenant_id(), $1, $2, $3, $4)
       returning id, tenant_id, name, description, is_public, created_at`,
      [userId, dto.name.trim(), dto.description ?? null, dto.isPublic ?? false],
    );

    return { ...rows[0], role: 'ADMIN' };
  }

  /**
   * Rename / re-describe / toggle visibility. `groups_update_admin`
   * (002_rls_policies.sql) requires ADMIN — but RLS enforces that by
   * filtering rows, not by raising an error, so a non-member and a
   * non-ADMIN member get the identical zero-row result from Postgres. This
   * method cannot tell those two apart, and deliberately does not try to:
   * returning the same 404 either way avoids confirming to a non-member
   * that a private group with this id exists at all.
   */
  async update(userId: string, groupId: string, dto: UpdateGroupDto): Promise<GroupRow> {
    const rows = await this.db.queryAs<GroupRow>(
      userId,
      `update public.groups
          set name        = coalesce($2, name),
              description = coalesce($3, description),
              is_public   = coalesce($4, is_public),
              updated_at  = now()
        where id = $1
        returning id, tenant_id, name, description, is_public, created_at`,
      [groupId, dto.name?.trim() ?? null, dto.description ?? null, dto.isPublic ?? null],
    );

    if (rows.length === 0) {
      throw new NotFoundException('Group not found.');
    }
    return rows[0];
  }

  /** ADMIN only, via `groups_delete_admin`. Same 404-for-both-cases reasoning as update(). */
  async remove(userId: string, groupId: string): Promise<void> {
    const rows = await this.db.queryAs<{ id: string }>(
      userId,
      `delete from public.groups where id = $1 returning id`,
      [groupId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Group not found.');
    }
  }

  /**
   * The roster. `group_members_select` lets a READ member see only their
   * own row and a WRITE-or-above member see everyone (docs/architecture/dygo_academy_api_surface.md
   * §4: "READ members cannot enumerate classmates") — enforced entirely by
   * RLS, so a READ caller gets back a one-row list rather than a 403. That
   * is a deliberate product choice already encoded in the policy, not
   * something to re-check here.
   */
  async findMembers(userId: string, groupId: string): Promise<GroupMember[]> {
    return this.db.queryAs<GroupMember>(
      userId,
      `select gm.user_id, gm.role, gm.joined_at, p.email, p.display_name
         from public.group_members gm
         left join public.profiles p on p.id = gm.user_id
        where gm.group_id = $1
        order by gm.joined_at asc`,
      [groupId],
    );
  }

  /** ADMIN only, via `group_members_update_admin`. */
  async updateMemberRole(
    userId: string,
    groupId: string,
    memberUserId: string,
    role: GroupRoleInput,
  ): Promise<GroupMember> {
    const rows = await this.db.queryAs<GroupMember>(
      userId,
      `update public.group_members
          set role = $3
        where group_id = $1 and user_id = $2
        returning user_id, role, joined_at`,
      [groupId, memberUserId, role],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Membership not found.');
    }
    return rows[0];
  }

  /**
   * ADMIN only, via `group_members_delete_admin`.
   *
   * **Fixes a known gap** flagged since the second pass: nothing stopped an
   * ADMIN removing the group's last ADMIN (including themselves), leaving a
   * group no one could manage — `groups.owner_id` still points at them, but
   * ownership and `group_members` ADMIN role are tracked separately, so
   * losing the last ADMIN row is a real dead end, not just cosmetic. Not
   * specified in the BRD, so the rule chosen is the narrowest one that
   * prevents the dead end: block the delete only when the target is
   * genuinely the *last* ADMIN, via a count query inside the same
   * transaction as the delete (`withUser`, not `queryAs`, so nothing else
   * can remove/add an ADMIN between the count and the delete). A group is
   * still free to have zero WRITE/READ members, or to have its one ADMIN
   * remove everyone else — only the group's last management seat is
   * protected.
   *
   * The pre-delete SELECT runs under the same RLS as everything else here:
   * a non-ADMIN caller reaching this method at all (no application-level
   * role gate, matching this codebase's "RLS is the enforcement" rule) either
   * can't see the target row (READ members only see their own row) or can
   * see it but has the final DELETE blocked by `group_members_delete_admin`
   * — both cases still collapse to the same 404 they did before this fix,
   * not a new 403, so existing callers see no behavior change except when
   * the last-ADMIN case is actually hit.
   */
  async removeMember(userId: string, groupId: string, memberUserId: string): Promise<void> {
    return this.db.withUser(userId, async (client) => {
      const memberRows = await client.query<{ role: GroupRole }>(
        `select role from public.group_members where group_id = $1 and user_id = $2`,
        [groupId, memberUserId],
      );
      if (memberRows.rows.length === 0) {
        throw new NotFoundException('Membership not found.');
      }

      if (memberRows.rows[0].role === 'ADMIN') {
        const adminCountRows = await client.query<{ count: string }>(
          `select count(*) as count from public.group_members where group_id = $1 and role = 'ADMIN'`,
          [groupId],
        );
        if (Number(adminCountRows.rows[0].count) <= 1) {
          throw new ConflictException(
            'Cannot remove the last ADMIN from a group — assign another ADMIN first.',
          );
        }
      }

      const deleted = await client.query<{ id: string }>(
        `delete from public.group_members where group_id = $1 and user_id = $2 returning id`,
        [groupId, memberUserId],
      );
      if (deleted.rows.length === 0) {
        throw new NotFoundException('Membership not found.');
      }
    });
  }

  /**
   * Mints a magic invite link (FR-1.3). The raw token is generated here in
   * Node, returned to the caller exactly once, and never persisted —
   * `public.hash_invite_token` (005_group_invites_redeem.sql) computes the
   * SHA-256 that actually gets stored, so this service and
   * `redeem_group_invite` share one definition of "how a token becomes a
   * token_hash" rather than each hashing it independently.
   *
   * `group_invites_insert_admin` requires both `has_group_role(id, 'ADMIN')`
   * and `created_by = auth.uid()` — a caller cannot mint an invite and
   * attribute it to someone else.
   */
  async createInvite(
    userId: string,
    groupId: string,
    dto: CreateInviteDto,
  ): Promise<CreatedInvite> {
    const token = randomBytes(24).toString('base64url');
    const expiresAt = dto.expiresInHours
      ? new Date(Date.now() + dto.expiresInHours * 60 * 60 * 1000)
      : null;

    const rows = await this.db.queryAs<GroupInviteSummary>(
      userId,
      `insert into public.group_invites
         (group_id, created_by, token_hash, grant_role, max_uses, expires_at)
       values ($1, $2, public.hash_invite_token($3), $4, $5, $6)
       returning id, grant_role, max_uses, use_count, expires_at, created_at`,
      [groupId, userId, token, dto.grantRole ?? 'READ', dto.maxUses ?? null, expiresAt],
    );

    return { ...rows[0], token };
  }

  /**
   * "Live" invites only — not revoked, not expired, not exhausted. A caller
   * wanting the full history of dead links (revoked/expired/used-up) needs a
   * different endpoint; this one backs the "Create a group" turn's
   * invite-link screen, which only ever needs to show links that still work.
   * ADMIN-gated by `group_invites_select_admin`; a non-ADMIN gets `[]`, not
   * a 403 — same RLS-filters-rows reasoning as findMembers().
   */
  async listInvites(userId: string, groupId: string): Promise<GroupInviteSummary[]> {
    return this.db.queryAs<GroupInviteSummary>(
      userId,
      `select id, grant_role, max_uses, use_count, expires_at, created_at
         from public.group_invites
        where group_id = $1
          and revoked_at is null
          and (expires_at is null or expires_at > now())
          and (max_uses is null or use_count < max_uses)
        order by created_at desc`,
      [groupId],
    );
  }

  /**
   * Soft revoke — sets `revoked_at` rather than deleting the row, so a used
   * invite's audit trail (who created it, how many times it was redeemed)
   * survives being turned off. `group_invites_update_admin` gates this
   * (revoking is implemented as an UPDATE, not a DELETE, even though the
   * route is `DELETE /invites/:id` per docs/architecture/dygo_academy_api_surface.md §4).
   */
  async revokeInvite(userId: string, inviteId: string): Promise<void> {
    const rows = await this.db.queryAs<{ id: string }>(
      userId,
      `update public.group_invites
          set revoked_at = now()
        where id = $1 and revoked_at is null
        returning id`,
      [inviteId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Invite not found, or already revoked.');
    }
  }

  /**
   * Redeems a magic link. Delegates the actual privilege-crossing work to
   * `public.redeem_group_invite` (005_group_invites_redeem.sql) — a
   * SECURITY DEFINER function — because the joiner is, by definition, not
   * yet a member, so RLS cannot show them the group or let them insert their
   * own group_members row (see that migration's header comment for why this
   * is a function rather than a DATABASE_ADMIN_URL connection).
   */
  async redeemInvite(userId: string, token: string): Promise<RedeemedInvite> {
    try {
      // joined_group_id, not group_id: the SQL function's own output
      // column had to be renamed (migration 017) to stop colliding with
      // group_members.group_id inside its "on conflict (group_id, ...)"
      // clause — see that migration's header. Aliased back to group_id
      // here so RedeemedInvite's shape doesn't need to change.
      const rows = await this.db.queryAs<RedeemedInvite>(
        userId,
        `select joined_group_id as group_id, group_name, granted_role, already_member
           from public.redeem_group_invite($1)`,
        [token],
      );
      return rows[0];
    } catch (err) {
      throw this.translateRedeemError(err);
    }
  }

  private translateRedeemError(err: unknown): Error {
    const pgErr = err as { code?: string; message?: string };

    if (pgErr?.code === PG_INVITE_NOT_FOUND) {
      return new NotFoundException('Invite not found.');
    }
    if (pgErr?.code === PG_INVITE_NO_LONGER_VALID) {
      return new GoneException(pgErr.message ?? 'This invite is no longer valid.');
    }
    return err instanceof Error ? err : new Error(String(err));
  }
}
