-- seeds/01_core_fixtures.sql — Core fixtures: Sarah/Marco/Alex/Priya/Kenji, two tenants, groups, topics, words, SRS state.
-- Formerly migrations/004_seed_data.sql; content unchanged except
-- where noted. Loaded by database/apply-migrations.sh after the schema.

-- =============================================================================
-- Dygo Academy — 004_seed_data.sql
-- Development fixtures & master topics.
--
-- DEVELOPMENT ONLY. Never run against production: it inserts rows into
-- auth.users with fixed UUIDs so tests can assume stable identities.
--
-- Fixture cast (deliberately covers every RBAC branch):
--   Oxford English Center (tenant, 20 seats)
--     sarah@dygo.test   ADMIN  — tutor, owns the group
--     marco@dygo.test   WRITE  — co-teacher
--     alex@dygo.test    READ   — student
--     priya@dygo.test   READ   — student (proves SRS isolation from Alex)
--   Rival Academy (second tenant — proves cross-tenant isolation)
--     dana@dygo.test    ADMIN
-- =============================================================================

-- Fixed UUIDs so tests can reference them without a lookup.
-- ---------------------------------------------------------------------------
-- 1111… Sarah (ADMIN) | 2222… Marco (WRITE) | 3333… Alex (READ)
-- 4444… Priya (READ)  | 5555… Dana  (other tenant ADMIN)
-- ---------------------------------------------------------------------------

-- `encrypted_password`/`email_confirmed_at` were added in an earlier pass —
-- every insert here before that only set `id`/`email`, which is enough for
-- `scripts/dev-token.js` (it signs its own JWT with SUPABASE_JWT_SECRET and
-- never touches GoTrue at all) but NOT enough to sign in through the actual
-- `supabase-auth` (GoTrue) container the frontend's real login form talks to
-- — GoTrue rejects a null `encrypted_password` and an unconfirmed email
-- outright. All five fixtures share one dev-only password so UAT can sign in
-- through the browser instead of only through dev-token.js + curl/Swagger.
--
-- CORRECTION (live-verified 2026-09-01): that pass's own comment assumed
-- `instance_id`/`aud`/`role` fall back to the `supabase/postgres` image's
-- column defaults when omitted from the insert list, and left it
-- "unverified... confirm before relying on this for UAT." Confirmed live
-- against a real GoTrue container, and the assumption was wrong —
-- `POST /auth/v1/token?grant_type=password` failed with `invalid_credentials`
-- even with a correct `encrypted_password` (verified separately with
-- `crypt(password, encrypted_password) = encrypted_password`) and a
-- non-null `email_confirmed_at`. `instance_id`, `aud`, and `role` all came
-- back blank on the live row. GoTrue's own user lookup filters on
-- `instance_id` (self-hosted single-instance mode expects the all-zero
-- UUID) and checks `aud` against `GOTRUE_JWT_AUD` (`authenticated` in
-- docker-compose.yml) — a blank `instance_id` never matches, so GoTrue
-- reports the same generic "invalid credentials" it uses for a
-- nonexistent user, by design (it doesn't leak which check failed). Now set
-- explicitly rather than assumed, and included in the upsert so a fixture
-- seeded by an older version of this file gets repaired by a plain re-seed
-- instead of silently keeping its stale blank values forever.
-- CORRECTION #2 (live-verified 2026-09-03): even with instance_id/aud/role
-- fixed above, a FRESH volume (docker compose down -v && up -d && --seed)
-- still failed login, this time with a 500 "Database error querying
-- schema" and dygo_supabase_auth logging:
--   error finding user: sql: Scan error on column index 3, name
--   "confirmation_token": converting NULL to string is unsupported
-- The supabase/postgres image defines several auth.users text columns
-- with no default (confirmation_token, recovery_token,
-- email_change_token_new, email_change, email_change_token_current,
-- phone_change, phone_change_token, reauthentication_token) — GoTrue's Go
-- driver always selects them on login and can't scan a NULL into a plain
-- string field, so any insert that omits them (this file's original insert
-- did) leaves a login-breaking NULL rather than a harmless blank.
--
-- Tried a schema-level ALTER TABLE ... SET DEFAULT '' first (would survive
-- even a future insert that also forgets these columns) but that failed
-- live: "ERROR: must be owner of table users" — in self-hosted Supabase
-- auth.users is owned by supabase_auth_admin, not the postgres role this
-- script connects as, so ALTER TABLE is out even though INSERT/UPDATE are
-- grantable and do work. Explicit '' values below are therefore the only
-- fix available at this privilege level — same lesson as CORRECTION #1.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token,
  created_at, updated_at
) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sarah@dygo.test', crypt('dygo-dev-2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '', '', '', '', '', '', '', '', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marco@dygo.test', crypt('dygo-dev-2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '', '', '', '', '', '', '', '', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alex@dygo.test',  crypt('dygo-dev-2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '', '', '', '', '', '', '', '', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya@dygo.test', crypt('dygo-dev-2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '', '', '', '', '', '', '', '', now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dana@dygo.test',  crypt('dygo-dev-2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '', '', '', '', '', '', '', '', now(), now())
on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at),
  instance_id        = excluded.instance_id,
  aud                 = excluded.aud,
  role                = excluded.role,
  raw_app_meta_data   = coalesce(auth.users.raw_app_meta_data, excluded.raw_app_meta_data),
  confirmation_token         = coalesce(auth.users.confirmation_token, ''),
  recovery_token              = coalesce(auth.users.recovery_token, ''),
  email_change_token_new      = coalesce(auth.users.email_change_token_new, ''),
  email_change                = coalesce(auth.users.email_change, ''),
  email_change_token_current  = coalesce(auth.users.email_change_token_current, ''),
  phone_change                = coalesce(auth.users.phone_change, ''),
  phone_change_token          = coalesce(auth.users.phone_change_token, ''),
  reauthentication_token      = coalesce(auth.users.reauthentication_token, ''),
  created_at                   = coalesce(auth.users.created_at, excluded.created_at),
  updated_at                   = now();

-- Tenants -------------------------------------------------------------------
insert into public.tenants (id, name, purchased_seats, active_seats_used, price_per_seat_cents) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Oxford English Center', 20, 4, 399),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Rival Academy',          5, 1, 399);

-- Profiles ------------------------------------------------------------------
-- The trigger from 001 already created bare profiles on auth.users insert;
-- fill in tenant, name and timezone.
update public.profiles set tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001',
       display_name = 'Sarah Chen',  timezone = 'Asia/Singapore', daily_srs_goal = 30
 where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001',
       display_name = 'Marco Rossi', timezone = 'Europe/Rome'
 where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001',
       display_name = 'Alex Tan',    timezone = 'Asia/Singapore', daily_srs_goal = 20
 where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001',
       display_name = 'Priya Nair',  timezone = 'Asia/Kolkata'
 where id = '44444444-4444-4444-4444-444444444444';
update public.profiles set tenant_id = 'aaaaaaaa-0000-0000-0000-000000000002',
       display_name = 'Dana Okafor', timezone = 'Africa/Lagos'
 where id = '55555555-5555-5555-5555-555555555555';

-- Seats ---------------------------------------------------------------------
insert into public.tenant_seats (tenant_id, user_id, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'ACTIVE'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'ACTIVE'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'ACTIVE'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'ACTIVE'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 'ACTIVE');

-- Groups --------------------------------------------------------------------
insert into public.groups (id, tenant_id, owner_id, name, description, is_public) values
  ('bbbbbbbb-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'IELTS Band 8.0 Masterclass',
   'Private cohort — Sarah''s Tuesday/Thursday intensive.',
   false),
  ('bbbbbbbb-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'Public Academic Word List',
   'Open library, discoverable by any user.',
   true),
  ('bbbbbbbb-0000-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000002',
   '55555555-5555-5555-5555-555555555555',
   'Rival Academy Private Set',
   'Belongs to a different tenant. Must never be visible to Oxford users.',
   false);

-- Memberships — every role represented -----------------------------------------
-- The three ADMIN rows below (each group's owner) are also written by
-- trg_group_owner_membership the moment the insert above commits (see
-- 001_initial_schema.sql). Listing them here anyway keeps this file readable
-- as "the full roster per group" rather than a confusing partial list; ON
-- CONFLICT reconciles the duplicate instead of erroring on the unique
-- (group_id, user_id) constraint.
insert into public.group_members (group_id, user_id, role) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'ADMIN'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'WRITE'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'READ'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'READ'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'ADMIN'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 'ADMIN')
on conflict (group_id, user_id) do update set role = excluded.role;

-- Topics --------------------------------------------------------------------
insert into public.topics (id, group_id, title, description, is_public) values
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   'Unit 1 — Abstract Nouns', 'Week 1 target vocabulary.', false),
  ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002',
   'AWL Sublist 1', 'Averil Coxhead Academic Word List, sublist 1.', true),
  ('cccccccc-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000003',
   'Rival Private Topic', 'Cross-tenant isolation probe.', false);

-- Master lexicon — one fully enriched entry matching the tech spec §4.2 shape,
-- plus two lighter rows.
-- audio_url_us is null on purpose: `npm run audio-backfill` (backend) queues
-- every word without audio, reusing existing R2 audio or generating it with
-- Gemini TTS. (These seeds used to ship placeholder
-- links on cdn.dygo.academy, a domain that never existed.)
insert into public.master_lexicon
  (id, normalized_word, language_code, part_of_speech, ipa_us, ipa_uk, cefr_level,
   definition_en, audio_url_us, synonyms, antonyms, example_sentences, enriched_at) values
  ('dddddddd-0000-0000-0000-000000000001', 'ephemeral', 'en', 'adjective',
   '/ɪˈfem.ər.əl/', '/ɪˈfem.ər.əl/', 'C1',
   'Lasting for a very short time; transitory.',
   null,
   '[{"word":"transient","level":"C1"},{"word":"fleeting","level":"B2"},
     {"word":"momentary","level":"B1"},{"word":"short-lived","level":"B1"},
     {"word":"evanescent","level":"C2"}]'::jsonb,
   '[{"word":"permanent","level":"B1"},{"word":"enduring","level":"B2"},
     {"word":"eternal","level":"B2"},{"word":"everlasting","level":"B2"},
     {"word":"perpetual","level":"C1"}]'::jsonb,
   '[{"sentence":"Fame in the digital age is often ephemeral, fading as quickly as it arrives.",
      "level":"B2","translation_hint":"Lasting only a brief period"},
     {"sentence":"The ephemeral beauty of cherry blossoms draws millions of visitors each spring.",
      "level":"C1","translation_hint":"Transitory, short-lived"}]'::jsonb,
   now()),
  ('dddddddd-0000-0000-0000-000000000002', 'resilient', 'en', 'adjective',
   '/rɪˈzɪl.jənt/', '/rɪˈzɪl.i.ənt/', 'B2',
   'Able to recover quickly from difficulties.',
   null,
   '[{"word":"tough","level":"A2"},{"word":"hardy","level":"B2"}]'::jsonb,
   '[{"word":"fragile","level":"B1"},{"word":"brittle","level":"C1"}]'::jsonb,
   '[{"sentence":"Small businesses proved remarkably resilient during the downturn.",
      "level":"B2","translation_hint":"Recovering quickly"}]'::jsonb,
   now()),
  ('dddddddd-0000-0000-0000-000000000003', 'analyse', 'en', 'verb',
   '/ˈæn.əl.aɪz/', '/ˈæn.əl.aɪz/', 'B1',
   'Examine methodically and in detail.',
   null, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, now());

-- Topic words — covers all three status values -------------------------------
insert into public.topic_words
  (id, topic_id, lexicon_id, source_word, status, added_by) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000001', 'ephemeral', 'READY',
   '11111111-1111-1111-1111-111111111111'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000002', 'resilient', 'READY',
   '22222222-2222-2222-2222-222222222222'),
  -- Still in the BullMQ queue: no lexicon_id yet, exactly as POST /words leaves it.
  ('eeeeeeee-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000001',
   null, 'ubiquitous', 'ENRICHING',
   '22222222-2222-2222-2222-222222222222'),
  ('eeeeeeee-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000002',
   'dddddddd-0000-0000-0000-000000000003', 'analyse', 'READY',
   '11111111-1111-1111-1111-111111111111'),
  ('eeeeeeee-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000003',
   null, 'clandestine', 'ENRICHING',
   '55555555-5555-5555-5555-555555555555');

update public.topic_words
   set status = 'FAILED', failure_reason = 'Gemini quota exceeded after 3 retries'
 where id = 'eeeeeeee-0000-0000-0000-000000000003';

-- SRS state — Alex and Priya study the SAME words with DIFFERENT progress.
-- This pair is what the isolation test in 002 asserts against.
insert into public.user_word_srs
  (user_id, topic_word_id, fsrs_state, stability, difficulty, reps, lapses, scheduled_days,
   mastered_at,
   total_mistakes, recent_mistakes, is_leech, last_reviewed_at, next_due_at) values
  -- FSRS state (Phase 10).
  -- Alex: doing well on 'ephemeral' (mastered), struggling badly on 'resilient' (a leech).
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-0000-0000-0000-000000000001',
   'Review', 9.0, 4.5, 4, 1, 7, now() - interval '2 days',
   1, 0, false, now() - interval '2 days', now() + interval '5 days'),
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-0000-0000-0000-000000000002',
   'Relearning', 0.6, 8.1, 6, 6, 0, null,
   6, 5, true,  now() - interval '3 hours', now() - interval '1 hour'),
  -- Priya: the mirror image, on the same two words.
  ('44444444-4444-4444-4444-444444444444', 'eeeeeeee-0000-0000-0000-000000000001',
   'Review', 1.5, 6.3, 1, 3, 1, null,
   3, 2, false, now() - interval '1 day', now() - interval '2 hours'),
  ('44444444-4444-4444-4444-444444444444', 'eeeeeeee-0000-0000-0000-000000000002',
   'Review', 40.0, 2.8, 6, 0, 16, now() - interval '4 days',
   0, 0, false, now() - interval '4 days', now() + interval '12 days');

-- Review history ------------------------------------------------------------
insert into public.review_logs
  (user_id, topic_word_id, rating, was_correct, response_ms,
   state_before, stability_after, difficulty_after, reviewed_at) values
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-0000-0000-0000-000000000002',
   'AGAIN', false, 8200, 'Review', 0.6, 8.1, now() - interval '3 hours'),
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-0000-0000-0000-000000000001',
   'GOOD',  true,  2100, 'Review', 9.0, 4.5, now() - interval '2 days'),
  ('44444444-4444-4444-4444-444444444444', 'eeeeeeee-0000-0000-0000-000000000002',
   'EASY',  true,  1450, 'Review', 40.0, 2.8, now() - interval '4 days');

-- Habit schedules & push ----------------------------------------------------
insert into public.study_schedules (user_id, reminder_time, timezone, is_enabled) values
  ('33333333-3333-3333-3333-333333333333', '20:00', 'Asia/Singapore', true),
  ('44444444-4444-4444-4444-444444444444', '07:30', 'Asia/Kolkata',   true);

insert into public.push_subscriptions (user_id, endpoint, p256dh_key, auth_key, user_agent) values
  ('33333333-3333-3333-3333-333333333333',
   'https://fcm.googleapis.com/fcm/send/fixture-alex-endpoint',
   'BFixtureP256dhKeyForLocalDevelopmentOnly', 'FixtureAuthKey123',
   'Mozilla/5.0 (Macintosh) Chrome/140');

-- A live magic invite. token_hash stores sha256 of the raw token; the raw value
-- for local testing is the literal string 'dygo-dev-invite-token'.
insert into public.group_invites
  (group_id, created_by, token_hash, grant_role, max_uses, expires_at) values
  ('bbbbbbbb-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   digest('dygo-dev-invite-token', 'sha256'),
   'READ', 20, now() + interval '30 days');
