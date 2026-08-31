/**
 * `group_role` enum, database/migrations/001_initial_schema.sql line 23.
 * ADMIN > WRITE > READ — full control, add/edit words, study & quiz only
 * (tech spec §3.2 enum example; permission matrix in
 * dygo_academy_api_surface.md §"Module 1").
 */
export type GroupRole = 'ADMIN' | 'WRITE' | 'READ';

/**
 * `public.profiles`, database/migrations/001_initial_schema.sql line 61.
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
