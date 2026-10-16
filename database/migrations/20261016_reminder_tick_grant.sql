-- =============================================================================
-- 20261016_reminder_tick_grant.sql
-- Lets the 15-minute reminder tick (NotificationProcessor) read every
-- learner's reminder schedule as service_role.
--
-- ROOT CAUSE (2026-10-16, "reminders say on but never arrive"): the tick read
-- study_schedules with DatabaseService.query(), i.e. as plain `authenticator`,
-- which has no table grants, so every tick failed with "permission denied"
-- and no reminder was ever sent. Same bug as 015 (push_subscriptions). The
-- code now uses queryAsService(); self-hosted Supabase's bootstrap normally
-- grants service_role already, this makes it explicit. GRANT is idempotent.
-- =============================================================================

grant select on public.study_schedules to service_role;
