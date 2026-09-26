-- Locale codes become full BCP 47 tags (phase 12, UI-L follow-up, 2026-09-26):
--
--   ui_locale       'en' → 'en-SG' (or 'en-US' when the profile's time zone is
--                   in the Americas, the same rule the garden used to pick
--                   the English format), 'vi' → 'vi-VN'; 'zh-CN' unchanged.
--                   Allowed: 'en-SG', 'en-US', 'vi-VN', 'zh-CN'.
--   meaning_locale  'vi' → 'vi-VN'; 'zh-CN' unchanged.
--                   Allowed: 'vi-VN', 'zh-CN'.
--
-- Runs after 20260926_profile_locales.sql (file names sort that way). The
-- frontend still reads the old short codes (and the old dygo_locale cookie)
-- until they're converted; PATCH /api/v1/profiles/me accepts only the new
-- ones. RLS and grants unchanged.

alter table public.profiles
  drop constraint if exists profiles_ui_locale_check,
  drop constraint if exists profiles_meaning_locale_check;

update public.profiles
   set ui_locale = case
         when ui_locale = 'vi' then 'vi-VN'
         when timezone like 'America/%' then 'en-US'
         else 'en-SG'
       end
 where ui_locale in ('en', 'vi');

update public.profiles
   set meaning_locale = 'vi-VN'
 where meaning_locale = 'vi';

alter table public.profiles
  add constraint profiles_ui_locale_check
    check (ui_locale is null or ui_locale in ('en-SG', 'en-US', 'vi-VN', 'zh-CN')),
  add constraint profiles_meaning_locale_check
    check (meaning_locale is null or meaning_locale in ('vi-VN', 'zh-CN'));

comment on column public.profiles.ui_locale is
  'Garden app locale (en-SG, en-US, vi-VN, zh-CN); null = not chosen. UI-L.';
comment on column public.profiles.meaning_locale is
  'Meaning language on the review card (vi-VN, zh-CN); null = English only. UI-L.';
