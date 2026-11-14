-- =============================================================================
-- 20261114_reminder_settings.sql
-- A8c Reminder (Adult · Profile, approved 2026-11-14): one reminder per
-- learner, with the days it runs on, Smart time and the channels it uses.
--
-- 1. One row per learner. The table allowed one row per (user, time), so
--    choosing a new time added a second reminder instead of moving the
--    first; the app only ever showed the earliest, the others still sent.
--    Keep the earliest row (what the learner sees), drop the rest, and make
--    `user_id` unique. POST /notifications/schedules now moves the time.
-- 2. `days`: ISO weekdays the reminder runs on (1 = Monday … 7 = Sunday).
--    Existing rows get every day (they sent daily until now); new rows get
--    the A8c default, Monday to Saturday.
-- 3. `smart`: send at the hour (outside quiet hours) when most of today's
--    words ripen; `reminder_time` stays as the fallback.
-- 4. `channels`: 'push', 'zalo', 'email'. Only push has a sender today;
--    the other two are saved and shown as "Soon" (A8c).
-- Quiet hours (22:00–07:00) are a fixed rule in the backend
-- (reminder-rules.ts), not a column.
-- =============================================================================

delete from public.study_schedules s
 using public.study_schedules keep
 where keep.user_id = s.user_id
   and (keep.reminder_time, keep.id) < (s.reminder_time, s.id);

alter table public.study_schedules
  drop constraint study_schedules_unique_time_per_user,
  add constraint study_schedules_one_per_user unique (user_id);

alter table public.study_schedules
  add column days smallint[] not null default '{1,2,3,4,5,6,7}',
  add column smart boolean not null default false,
  add column channels text[] not null default '{push}';

alter table public.study_schedules
  alter column days set default '{1,2,3,4,5,6}';

alter table public.study_schedules
  add constraint study_schedules_days_check
    check (days <@ '{1,2,3,4,5,6,7}'::smallint[]),
  add constraint study_schedules_channels_check
    check (channels <@ '{push,zalo,email}'::text[]);
