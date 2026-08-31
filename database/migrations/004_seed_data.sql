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

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'sarah@dygo.test'),
  ('22222222-2222-2222-2222-222222222222', 'marco@dygo.test'),
  ('33333333-3333-3333-3333-333333333333', 'alex@dygo.test'),
  ('44444444-4444-4444-4444-444444444444', 'priya@dygo.test'),
  ('55555555-5555-5555-5555-555555555555', 'dana@dygo.test')
on conflict (id) do nothing;

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

-- Memberships — every role represented ---------------------------------------
insert into public.group_members (group_id, user_id, role) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'ADMIN'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'WRITE'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'READ'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'READ'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'ADMIN'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 'ADMIN');

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
insert into public.master_lexicon
  (id, normalized_word, language_code, part_of_speech, ipa_us, ipa_uk, cefr_level,
   definition_en, audio_url, synonyms, antonyms, example_sentences, enriched_at) values
  ('dddddddd-0000-0000-0000-000000000001', 'ephemeral', 'en', 'adjective',
   '/ɪˈfem.ər.əl/', '/ɪˈfem.ər.əl/', 'C1',
   'Lasting for a very short time; transitory.',
   'https://cdn.dygo.academy/audio/en/us/ephemeral.mp3',
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
   'https://cdn.dygo.academy/audio/en/us/resilient.mp3',
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
  (user_id, topic_word_id, ease_factor, interval_days, repetitions,
   total_mistakes, recent_mistakes, is_leech, last_reviewed_at, next_due_at) values
  -- Alex: doing well on 'ephemeral', struggling badly on 'resilient' (a leech).
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-0000-0000-0000-000000000001',
   2.60, 7, 4, 1, 0, false, now() - interval '2 days', now() + interval '5 days'),
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-0000-0000-0000-000000000002',
   1.40, 0, 0, 6, 5, true,  now() - interval '3 hours', now() - interval '1 hour'),
  -- Priya: the mirror image, on the same two words.
  ('44444444-4444-4444-4444-444444444444', 'eeeeeeee-0000-0000-0000-000000000001',
   1.70, 1, 1, 3, 2, false, now() - interval '1 day', now() - interval '2 hours'),
  ('44444444-4444-4444-4444-444444444444', 'eeeeeeee-0000-0000-0000-000000000002',
   2.80, 16, 6, 0, 0, false, now() - interval '4 days', now() + interval '12 days');

-- Review history ------------------------------------------------------------
insert into public.review_logs
  (user_id, topic_word_id, rating, was_correct, response_ms,
   ease_factor_after, interval_days_after, reviewed_at) values
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-0000-0000-0000-000000000002',
   'AGAIN', false, 8200, 1.40, 0, now() - interval '3 hours'),
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-0000-0000-0000-000000000001',
   'GOOD',  true,  2100, 2.60, 7, now() - interval '2 days'),
  ('44444444-4444-4444-4444-444444444444', 'eeeeeeee-0000-0000-0000-000000000002',
   'EASY',  true,  1450, 2.80, 16, now() - interval '4 days');

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
