-- Phase 13 T1 (phase/phase 13/PHASE-13-SPEAKING-PLAN.md §2, "phase 13
-- implementation plan.md" §4): tables for adult speaking sessions.
--
--   * speaking_items: one sentence per target word per topic bed, with the
--     native UK / US audio (R2 object keys) and word + syllable timings.
--     Global content, written only by the T2 content script (service_role);
--     every signed-in user can read it, learners never write it.
--   * speaking_attempts: one row per Compare screen (SP3). Numbers only: the
--     learner's recording is never uploaded or stored (decision D2).
--
-- Mapped to the repo (handover names in brackets):
--   lexicon_id [word_id] -> master_lexicon(id), the target word;
--   topic_id -> topics(id), the bed the item was made for (one item per word
--     per bed in v1; see docs/phase13-notes.md, "Decisions taken with
--     defaults");
--   user_id -> profiles(id) [auth.users], like every other per-user table.
-- accent stays 'UK' / 'US' as in the handover (profiles.english_variety uses
-- 'en-GB' / 'en-US'; the API maps between them).
--
-- Each accent is optional on its own (D1 may give only one voice at first),
-- but its path and timings come together, and an item has at least one.
-- RLS: items are select-only for authenticated; attempts are owner-only
-- select / insert, with no update or delete (rows are history; Try again
-- stores a second row).

-- ---------------------------------------------------------------------------
-- Speaking items (content)
create table public.speaking_items (
  id            uuid primary key default gen_random_uuid(),
  lexicon_id    uuid not null references public.master_lexicon(id) on delete restrict,
  topic_id      uuid not null references public.topics(id) on delete cascade,
  sentence      text not null check (length(trim(sentence)) > 0),
  target_index  smallint not null check (target_index >= 0),
  audio_uk_path text,
  audio_us_path text,
  timings_uk    jsonb,
  timings_us    jsonb,
  created_at    timestamptz not null default now(),
  constraint speaking_items_one_per_word_per_topic unique (topic_id, lexicon_id),
  constraint speaking_items_uk_path_with_timings
    check ((audio_uk_path is null) = (timings_uk is null)),
  constraint speaking_items_us_path_with_timings
    check ((audio_us_path is null) = (timings_us is null)),
  constraint speaking_items_has_audio
    check (audio_uk_path is not null or audio_us_path is not null),
  constraint speaking_items_timings_uk_shape
    check (timings_uk is null or (jsonb_typeof(timings_uk) = 'object'
           and jsonb_typeof(timings_uk -> 'duration') is not distinct from 'number'
           and jsonb_typeof(timings_uk -> 'words') is not distinct from 'array')),
  constraint speaking_items_timings_us_shape
    check (timings_us is null or (jsonb_typeof(timings_us) = 'object'
           and jsonb_typeof(timings_us -> 'duration') is not distinct from 'number'
           and jsonb_typeof(timings_us -> 'words') is not distinct from 'array'))
);

comment on table public.speaking_items is
  'Phase 13: a sentence for one target word in a topic bed, with native UK/US '
  'audio (R2 object keys) and timings {duration, words:[{text,start,end,'
  'syllables:[{start,end,stressed}]}]}. Written by the T2 script as '
  'service_role; read-only for learners.';
comment on column public.speaking_items.target_index is
  'Index of the target word in the sentence tokens (timings words[]).';
comment on column public.speaking_items.audio_uk_path is
  'R2 object key (not a URL) of the UK clip; null until generated.';
comment on column public.speaking_items.audio_us_path is
  'R2 object key (not a URL) of the US clip; null until generated.';

create index idx_speaking_items_topic_id on public.speaking_items (topic_id);
create index idx_speaking_items_lexicon_id on public.speaking_items (lexicon_id);

alter table public.speaking_items enable row level security;

create policy speaking_items_select_all on public.speaking_items
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Speaking attempts (one per Compare)
create table public.speaking_attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid()
                     references public.profiles(id) on delete cascade,
  item_id          uuid not null references public.speaking_items(id) on delete cascade,
  accent           text not null check (accent in ('UK', 'US')),
  score            smallint not null check (score between 0 and 100),
  stage            text not null check (stage in ('seed', 'sprout', 'bloom', 'fruit')),
  word_marks       jsonb not null default '[]'::jsonb
                     check (jsonb_typeof(word_marks) = 'array'),
  user_duration_ms integer not null check (user_duration_ms >= 0),
  created_at       timestamptz not null default now()
);

comment on table public.speaking_attempts is
  'Phase 13: one row per speaking Compare (SP3). word_marks = [{index, ok, '
  'reason: stress_soft|missing|rushed|slow|null}]. No audio is stored (D2).';

create index idx_speaking_attempts_user_item_created
  on public.speaking_attempts (user_id, item_id, created_at desc);

alter table public.speaking_attempts enable row level security;

create policy speaking_attempts_select_own on public.speaking_attempts
  for select to authenticated using (user_id = auth.uid());
create policy speaking_attempts_insert_own on public.speaking_attempts
  for insert to authenticated with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants: start from nothing (Supabase's default privileges may hand out
-- more), then give signed-in users read on items and read/insert on their
-- attempts. Nothing for anon. service_role runs the T2 content script.
revoke all on public.speaking_items, public.speaking_attempts from anon, authenticated;
grant select on public.speaking_items to authenticated;
grant select, insert on public.speaking_attempts to authenticated;
grant select, insert, update, delete on
  public.speaking_items, public.speaking_attempts
to service_role;
