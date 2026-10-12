-- UI-G (docs/plans/phase 12 implementation plan.md): aggregate-only reads for the
-- shared-garden screens (GR1, GR2, GR3, GR6).
--
-- Why SECURITY DEFINER at all: RLS hides most of a group from a READ
-- member (group_members_select shows them only their own row;
-- review_logs_select_own and user_word_srs are owner-only). The garden
-- screens need a few *counts* across the group — how many gardeners, how
-- many watered today, how many plants are ripe — and FR-1.2 forbids
-- showing any one learner's word-level progress. So each function below:
--   1. re-checks the caller's membership (has_group_role) itself,
--   2. returns counts only: never a user_id, never a per-person row,
--   3. is `stable`, `set search_path = public`, and executable by
--      `authenticated` only.
-- Same pattern as group_word_heatmap (FR-8.2) and redeem_group_invite.
--
-- Rain days are not stored anywhere yet (POST /notifications/groups/:id/
-- sprint sends a push and keeps no row), so nothing here reports them.

-- ---------------------------------------------------------------------------
-- GR1 / GR2: size of a garden. Empty (no row) for a non-member, so it can
-- be joined laterally without raising.
create or replace function public.group_garden_counts(p_group_id uuid)
returns table (member_count bigint, bed_count bigint, word_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.group_members gm where gm.group_id = p_group_id),
    (select count(*) from public.topics t where t.group_id = p_group_id),
    (select count(*)
       from public.topic_words tw
       join public.topics t on t.id = tw.topic_id
      where t.group_id = p_group_id)
  where public.has_group_role(p_group_id, 'READ')
$$;

comment on function public.group_garden_counts(uuid) is
  'UI-G: gardeners, shared beds and words in a group. Members only (no row '
  'otherwise). SECURITY DEFINER so a READ member, who can only see their own '
  'group_members row, still gets the real gardener count. Counts only.';

-- ---------------------------------------------------------------------------
-- GR2 hero: how many gardeners watered (reviewed a group word) since
-- p_since, and how many (gardener, word) plants in the group are ripe
-- (mastered). Raises 42501 for a non-member.
create or replace function public.group_garden_activity(p_group_id uuid, p_since timestamptz)
returns table (watered_count bigint, ripe_count bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_group_role(p_group_id, 'READ') then
    raise exception 'Only members can see a group garden.' using errcode = '42501';
  end if;

  return query
    select
      (select count(distinct rl.user_id)
         from public.review_logs rl
         join public.topic_words tw on tw.id = rl.topic_word_id
         join public.topics t on t.id = tw.topic_id
         join public.group_members gm on gm.group_id = t.group_id and gm.user_id = rl.user_id
        where t.group_id = p_group_id
          and rl.reviewed_at >= p_since),
      (select count(*)
         from public.user_word_srs s
         join public.topic_words tw on tw.id = s.topic_word_id
         join public.topics t on t.id = tw.topic_id
         join public.group_members gm on gm.group_id = t.group_id and gm.user_id = s.user_id
        where t.group_id = p_group_id
          and s.mastered_at is not null);
end;
$$;

comment on function public.group_garden_activity(uuid, timestamptz) is
  'UI-G GR2: gardeners who watered since p_since and ripe plants in a group, '
  'as two numbers. Members only (42501). Never per person (FR-1.2).';

-- ---------------------------------------------------------------------------
-- GR3 tricky patches: the words the group missed most since p_since, with
-- how many gardeners missed each. ADMIN only, like the heatmap.
create or replace function public.group_tricky_patches(
  p_group_id uuid,
  p_since timestamptz,
  p_limit integer default 5
)
returns table (topic_word_id uuid, source_word text, misses bigint, gardeners bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_group_role(p_group_id, 'ADMIN') then
    raise exception 'Only a group ADMIN can see tricky patches.' using errcode = '42501';
  end if;

  return query
    select tw.id, tw.source_word,
           count(*) as misses,
           count(distinct rl.user_id) as gardeners
      from public.review_logs rl
      join public.topic_words tw on tw.id = rl.topic_word_id
      join public.topics t on t.id = tw.topic_id
     where t.group_id = p_group_id
       and rl.reviewed_at >= p_since
       and rl.was_correct = false
     group by tw.id, tw.source_word
     order by count(*) desc, tw.source_word
     limit greatest(1, least(coalesce(p_limit, 5), 50));
end;
$$;

comment on function public.group_tricky_patches(uuid, timestamptz, integer) is
  'UI-G GR3: most-missed words of a group since p_since, with miss and '
  'gardener totals. ADMIN only (42501). Totals only, never a user_id.';

-- ---------------------------------------------------------------------------
-- GR6 join preview: what an invite link leads to, before joining. Any
-- signed-in caller holding a valid token. Same validity checks and error
-- codes as redeem_group_invite (P0002 not found, 22023 no longer valid),
-- and it changes nothing. Returns the inviter's display name (never the
-- email) and counts; nothing about the members.
create or replace function public.group_invite_preview(p_token text)
returns table (
  group_id          uuid,
  group_name        text,
  group_description text,
  inviter_name      text,
  grant_role        group_role,
  member_count      bigint,
  bed_count         bigint,
  word_count        bigint,
  already_member    boolean
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_caller uuid := auth.uid();
  v_invite public.group_invites;
begin
  if v_caller is null then
    raise exception 'group_invite_preview requires an authenticated caller' using errcode = '28000';
  end if;

  select * into v_invite
    from public.group_invites
   where token_hash = public.hash_invite_token(p_token);

  if not found then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
  if v_invite.revoked_at is not null then
    raise exception 'invite has been revoked' using errcode = '22023';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at <= now() then
    raise exception 'invite has expired' using errcode = '22023';
  end if;
  if v_invite.max_uses is not null and v_invite.use_count >= v_invite.max_uses then
    raise exception 'invite has reached its use limit' using errcode = '22023';
  end if;

  return query
    select g.id, g.name, g.description,
           nullif(trim(p.display_name), ''),
           v_invite.grant_role,
           (select count(*) from public.group_members gm where gm.group_id = g.id),
           (select count(*) from public.topics t where t.group_id = g.id),
           (select count(*)
              from public.topic_words tw
              join public.topics t on t.id = tw.topic_id
             where t.group_id = g.id),
           exists (select 1 from public.group_members gm
                    where gm.group_id = g.id and gm.user_id = v_caller)
      from public.groups g
      left join public.profiles p on p.id = v_invite.created_by
     where g.id = v_invite.group_id;
end;
$$;

comment on function public.group_invite_preview(text) is
  'UI-G GR6: group name, description, inviter display name, role and counts '
  'for a valid invite token, before redeeming. Read-only. Same errors as '
  'redeem_group_invite. No member data.';

-- Execute: signed-in users only (not anon).
revoke all on function public.group_garden_counts(uuid) from public;
revoke all on function public.group_garden_activity(uuid, timestamptz) from public;
revoke all on function public.group_tricky_patches(uuid, timestamptz, integer) from public;
revoke all on function public.group_invite_preview(text) from public;
grant execute on function public.group_garden_counts(uuid) to authenticated;
grant execute on function public.group_garden_activity(uuid, timestamptz) to authenticated;
grant execute on function public.group_tricky_patches(uuid, timestamptz, integer) to authenticated;
grant execute on function public.group_invite_preview(text) to authenticated;
