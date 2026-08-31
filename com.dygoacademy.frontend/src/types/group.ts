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

/** `public.group_members` — the RBAC join table (Phase 1, Module 1). */
export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
}
