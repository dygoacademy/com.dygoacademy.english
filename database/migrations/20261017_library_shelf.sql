-- A6 Topics: fixed filter groups (docs/design/garden/CHANGELOG.md,
-- 2026-10-17; "docs/plans/Topics filters and long names implementation plan.md").
--
-- The Topics filters used to be one chip per library collection (the public
-- group's name). They are now a fixed list: All · Mine · Academic · General ·
-- Work · Travel · Shared. A library bed shows under the shelf of its
-- collection; a collection with no shelf shows under All only.
--
--   groups.library_shelf   academic | general | work | travel | null.
--                          Only meaningful for public library groups.
--
-- Existing collections get a shelf only when their name is one of the four
-- below exactly (case and spaces ignored). Anything else (e.g. Everyday life)
-- stays null until Dylan decides (docs/design/QUESTIONS.md, Q-17).

alter table public.groups
  add column library_shelf text null
  check (library_shelf in ('academic', 'general', 'work', 'travel'));
comment on column public.groups.library_shelf is
  'A6 Topics filter for a public library collection: academic, general, work or travel; null = shown under All only.';

update public.groups
   set library_shelf = case lower(trim(name))
         when 'ielts academic' then 'academic'
         when 'ielts general' then 'general'
         when 'work & careers' then 'work'
         when 'travel' then 'travel'
       end
 where is_public
   and lower(trim(name)) in ('ielts academic', 'ielts general', 'work & careers', 'travel');
