import type { GroupRole } from './user';

/** `public.groups`, database/migrations/001_initial_schema.sql line 141. */
export interface Group {
  id: string;
  tenant_id: string;
  owner_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * `GET /api/v1/groups` row shape — matches GroupsService.GroupSummary
 * exactly (com.dygoacademy.backend/src/modules/groups/groups.service.ts).
 * Narrower than `Group` above: no `owner_id`/`updated_at` (the endpoint's
 * SELECT never returns them), plus the caller's own `role`, which isn't a
 * column on `groups` at all — it comes from the `group_members` join.
 */
export interface GroupSummary {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  role: GroupRole;
  created_at: string;
}

/** `PATCH`/`POST /api/v1/groups` row shape — GroupsService.GroupRow. */
export interface GroupRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
}

/** `public.group_members` — the RBAC join table (Phase 1, Module 1). */
export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
}

/**
 * `GET /api/v1/groups/:id/members` row shape — GroupsService.GroupMember.
 * Deliberately narrower than the `GroupMember` table type above: no `id`/
 * `group_id`, since the roster endpoint is already scoped to one group and
 * never selects its own join-row primary key.
 */
export interface GroupRosterMember {
  user_id: string;
  role: GroupRole;
  joined_at: string;
}

/** `GET /api/v1/groups/:id/invites` row shape — GroupsService.GroupInviteSummary. */
export interface GroupInviteSummary {
  id: string;
  grant_role: GroupRole;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  created_at: string;
}

/**
 * `POST /api/v1/groups/:id/invites` response — the one and only place the
 * raw `token` is ever returned. Only its SHA-256 hash is persisted, so
 * losing this value means minting a new link, not recovering the old one.
 */
export interface CreatedInvite extends GroupInviteSummary {
  token: string;
}

/** `POST /api/v1/invites/:token/redeem` response — GroupsService.RedeemedInvite. */
export interface RedeemedInvite {
  group_id: string;
  group_name: string;
  granted_role: GroupRole;
  already_member: boolean;
}
