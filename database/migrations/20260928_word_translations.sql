-- UI-L follow-up (design system §14.8, "Word translations are content, not
-- UI messages. They live in the database per word and per meaning
-- language"). Closes the gap ReviewLive.tsx flagged with a hardcoded
-- `meaningTranslation: null` and a "no translations in the API yet"
-- comment: the review card's meaning-language line has never had
-- anything to show, in Vietnamese or Chinese.
--
-- word_id references master_lexicon, not topic_words: a translation is
-- keyed by the same deduplicated (normalized_word, language_code) cache
-- row as definition_en/synonyms/antonyms, so it's generated once per word
-- ever (>85% cache-hit KPI, BRD §2) rather than once per learner.
--
-- Populated by the same enrichment pass as master_lexicon
-- (GeminiEnrichmentService.enrichWord's `translations` field,
-- EnrichmentProcessor.enrichAndCache) — never written by a user, so RLS
-- and grants mirror master_lexicon's exactly (global shared cache,
-- readable by anyone, written only by the enrichment worker).
create table public.word_translations (
  id                  uuid primary key default gen_random_uuid(),
  word_id             uuid not null references public.master_lexicon (id) on delete cascade,
  -- Only the app's meaning-language options (i18n/config.ts MEANING_LOCALES).
  locale              text not null,
  meaning             text not null,
  -- The card's example sentence translated the same way (design system
  -- §14.8's `example_translation`); nullable because a word can have a
  -- meaning translation before Gemini has one for its example.
  example_translation text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint word_translations_unique_word_locale unique (word_id, locale),
  constraint word_translations_locale_is_meaning_locale
    check (locale in ('vi-VN', 'zh-CN'))
);

comment on table public.word_translations is
  'Per-word meaning translations for the review card''s meaning-language line (design system §14.8). One row per (word_id, locale).';

create index word_translations_word_id_idx on public.word_translations (word_id);

create trigger trg_word_translations_updated_at
  before update on public.word_translations
  for each row execute function public.set_updated_at();

alter table public.word_translations enable row level security;

create policy word_translations_select_all on public.word_translations
  for select to authenticated
  using (true);

-- Anonymous visitors already read master_lexicon (Phase 5 SSR/SEO on public
-- topic libraries), so a translation joined onto that same word is public too.
create policy word_translations_select_anon on public.word_translations
  for select to anon
  using (true);

grant select on public.word_translations to authenticated, anon;
grant select, insert, update on public.word_translations to service_role;
