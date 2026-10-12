/**
 * `group_role` enum, database/schema/01_extensions_types.sql.
 * ADMIN > WRITE > READ — full control, add/edit words, study & quiz only
 * (tech spec §3.2 enum example; permission matrix in
 * docs/architecture/dygo_academy_api_surface.md §"Module 1").
 */
export type GroupRole = 'ADMIN' | 'WRITE' | 'READ';

/**
 * `public.profiles`, database/schema/02_tables.sql.
 * Distinct from Supabase's own `auth.users`/session `User` type (from
 * @supabase/supabase-js) — this is our application row, keyed 1:1 on it.
 */
export interface Profile {
  id: string;
  tenant_id: string | null;
  email: string;
  display_name: string | null;
  daily_srs_goal: number;
  timezone: string;
  created_at: string;
  updated_at: string;
}
