-- Seeds & Harvest analytics (plan section 5; Dylan 2026-10-24): a small
-- product event log, the app's first.
--
--   product_events   one row per event, written by the API inside the
--                    request's own transaction. name is one of the plan's
--                    events; props holds its properties.
--   product_events_daily   events per name and day (UTC), for a quick look.
--
-- planting_empty should stay at 0: the API also logs it as an ALERT line the
-- moment it happens (pm2 logs).
--
-- RLS: a learner may only insert their own events and never read them back;
-- reading is for service_role (reports).

create table public.product_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name       text not null check (name in ('seed_dropped', 'seed_planted', 'bed_harvested',
                                           'packet_shown', 'packet_chosen', 'planting_empty')),
  props      jsonb not null default '{}'::jsonb check (jsonb_typeof(props) = 'object'),
  created_at timestamptz not null default now()
);

create index product_events_name_time on public.product_events (name, created_at desc);

comment on table public.product_events is
  'Seeds & Harvest analytics events (plan section 5). Written by the API; read by service_role only.';

alter table public.product_events enable row level security;

create policy product_events_insert_own on public.product_events
  for insert to authenticated with check (user_id = auth.uid());

revoke all on public.product_events from anon, authenticated;
grant insert on public.product_events to authenticated;
grant select, insert, delete on public.product_events to service_role;

create view public.product_events_daily
with (security_invoker = true) as
select name, (created_at at time zone 'UTC')::date as day, count(*) as events,
       count(distinct user_id) as learners
  from public.product_events
 group by 1, 2;

revoke all on public.product_events_daily from anon, authenticated;
grant select on public.product_events_daily to service_role;
