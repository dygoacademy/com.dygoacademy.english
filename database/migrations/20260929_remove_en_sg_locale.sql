-- UI-L follow-up (2026-09-29): en-SG is removed as an app locale. English
-- shipped as two regional variants (en-SG, en-US) from
-- 20260926_profile_locales_codes.sql; Dylan asked to collapse English
-- back to one variant, en-US, everywhere — i18n/config.ts's LOCALES,
-- this constraint, messages/en-US.json (en-SG.json deleted), and every
-- other reference in the app.
--
-- Any profile already stored as 'en-SG' becomes 'en-US' rather than
-- being left to violate the new constraint (or silently falling through
-- to the cookie/Accept-Language on next read, which would be a visible
-- behavior change for that learner rather than a data migration).
update public.profiles
   set ui_locale = 'en-US'
 where ui_locale = 'en-SG';

alter table public.profiles
  drop constraint if exists profiles_ui_locale_check;

alter table public.profiles
  add constraint profiles_ui_locale_check
    check (ui_locale is null or ui_locale in ('en-US', 'vi-VN', 'zh-CN'));

comment on column public.profiles.ui_locale is
  'Garden app locale (en-US, vi-VN, zh-CN); null = not chosen. UI-L. en-SG removed 2026-09-29.';
