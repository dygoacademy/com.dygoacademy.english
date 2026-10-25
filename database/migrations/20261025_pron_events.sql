-- Pronunciation v2, Step A (Dylan's plan of 2026-10-25, answer 4: events go
-- to a Postgres table via our API). product_events (20261025_product_events.sql)
-- already is that table: user_id, name, props, created_at, RLS insert own rows
-- only, read by service_role. This adds the pronunciation events to its names;
-- the app sends them with POST /events.

alter table public.product_events drop constraint product_events_name_check;
alter table public.product_events add constraint product_events_name_check
  check (name in ('seed_dropped', 'seed_planted', 'bed_harvested',
                  'packet_shown', 'packet_chosen', 'planting_empty',
                  'pron_scored', 'pron_not_heard', 'pron_chip_played', 'pron_word_played',
                  'pron_say_again', 'pron_skipped', 'pron_word_blocked'));

comment on table public.product_events is
  'Product analytics events: Seeds & Harvest (written by the API) and Pronunciation (POST /events). Read by service_role only.';
