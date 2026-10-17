/**
 * Name of the Supabase session cookie, pinned so it doesn't follow the
 * Supabase host. @supabase/ssr otherwise names it after the first label of
 * NEXT_PUBLIC_SUPABASE_URL (`sb-<label>-auth-token`), so moving Supabase
 * from supabase.dygoacademy.com to sso.dygoacademy.com (2026-10-17) would
 * have signed every learner out. Keep this name even if the host changes
 * again.
 */
export const AUTH_COOKIE_OPTIONS = { name: 'sb-supabase-auth-token' } as const;
