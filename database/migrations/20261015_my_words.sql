-- My words: every learner gets a private personal group with one bed,
-- "My words" (fix plan "Fix plan: learning on your own", 2026-10-15).
--
-- Before this, a learner who signed up on their own had no group they could
-- write to, so they could not create a bed, and + on a library bed failed
-- with the raw "WRITE role" error. Now:
--
--   groups.is_personal   one per owner. Hidden from the Groups tab; a new
--                        bed with no group goes here (POST /topics).
--   topics.is_my_words   one per personal group. A word added with no
--                        topic (POST /words, e.g. + on a library bed) goes
--                        here.
--
-- provision_my_words() creates whichever of the two is missing, so a learner
-- who deletes My words gets a fresh one the next time a word needs it.
-- Signup (handle_new_auth_user) provisions both, and every existing profile
-- is backfilled at the end of this file.

alter table public.groups
  add column is_personal boolean not null default false;
create unique index groups_one_personal_per_owner
  on public.groups (owner_id) where is_personal;
comment on column public.groups.is_personal is
  'The owner''s private group for their own beds (My words). One per owner; never shown in the Groups tab.';

alter table public.topics
  add column is_my_words boolean not null default false;
create unique index topics_one_my_words_per_group
  on public.topics (group_id) where is_my_words;
comment on column public.topics.is_my_words is
  'The My words bed in a personal group: where words added outside an editable bed are saved.';

-- Internal: not callable by clients (it takes any user id).
create or replace function public.provision_my_words(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid;
  v_topic uuid;
begin
  select id into v_group from groups where owner_id = p_user and is_personal;
  if v_group is null then
    -- trg_group_owner_membership seats the owner as ADMIN.
    insert into groups (tenant_id, owner_id, name, is_personal)
    select p.tenant_id, p.id, 'My words', true
      from profiles p
     where p.id = p_user
    on conflict (owner_id) where is_personal do nothing
    returning id into v_group;
    if v_group is null then
      select id into v_group from groups where owner_id = p_user and is_personal;
    end if;
  end if;
  if v_group is null then
    return null;  -- no profile
  end if;

  select id into v_topic from topics where group_id = v_group and is_my_words;
  if v_topic is null then
    insert into topics (group_id, title, is_my_words)
    values (v_group, 'My words', true)
    on conflict (group_id) where is_my_words do nothing
    returning id into v_topic;
    if v_topic is null then
      select id into v_topic from topics where group_id = v_group and is_my_words;
    end if;
  end if;
  return v_topic;
end;
$$;

revoke all on function public.provision_my_words(uuid) from public;
revoke all on function public.provision_my_words(uuid) from anon, authenticated;

-- The caller's My words bed, created if missing.
create or replace function public.my_words_topic_id()
returns uuid
language sql
volatile
security definer
set search_path = public
as $$
  select case when auth.uid() is null then null else public.provision_my_words(auth.uid()) end;
$$;

-- The caller's personal group, created (with My words) if missing.
create or replace function public.my_personal_group_id()
returns uuid
language sql
volatile
security definer
set search_path = public
as $$
  select t.group_id from public.topics t where t.id = public.my_words_topic_id();
$$;

revoke all on function public.my_words_topic_id() from public;
revoke all on function public.my_personal_group_id() from public;
grant execute on function public.my_words_topic_id() to authenticated;
grant execute on function public.my_personal_group_id() to authenticated;

-- Signup: the personal tenant and profile as before, then My words.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_local_part text;
begin
  v_local_part := split_part(lower(new.email), '@', 1);

  insert into public.tenants (name)
  values (coalesce(nullif(trim(v_local_part), ''), 'Personal') || '''s Workspace')
  returning id into v_tenant_id;

  insert into public.profiles (id, email, tenant_id)
  values (new.id, lower(new.email), v_tenant_id)
  on conflict (id) do nothing;

  perform public.provision_my_words(new.id);

  return new;
end;
$$;

-- Backfill every existing learner.
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    perform public.provision_my_words(r.id);
  end loop;
end $$;
