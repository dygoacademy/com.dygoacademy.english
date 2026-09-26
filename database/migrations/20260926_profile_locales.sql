-- UI-L (phase 12 implementation plan.md): the learner's two language settings.
--
--   ui_locale       the garden's app language: 'en', 'zh-CN' or 'vi'.
--                   null = not chosen yet; the dygo_locale cookie, then the
--                   browser's Accept-Language, then English decide.
--   meaning_locale  the extra meaning line on the review card: 'zh-CN' or
--                   'vi'. null = English definition only.
--
-- Written by PATCH /api/v1/profiles/me. RLS is unchanged: the caller can
-- only update their own row (profiles_update_self), and authenticated
-- already has update on public.profiles (06_grants.sql).

alter table public.profiles
  add column if not exists ui_locale text,
  add column if not exists meaning_locale text;

alter table public.profiles
  add constraint profiles_ui_locale_check
    check (ui_locale is null or ui_locale in ('en', 'zh-CN', 'vi')),
  add constraint profiles_meaning_locale_check
    check (meaning_locale is null or meaning_locale in ('zh-CN', 'vi'));

comment on column public.profiles.ui_locale is
  'Garden app language (en, zh-CN, vi); null = not chosen. UI-L.';
comment on column public.profiles.meaning_locale is
  'Meaning language on the review card (zh-CN, vi); null = English only. UI-L.';
