create or replace function public.compute_word_states(
  p_user_id uuid,
  p_target_language text,
  p_deck_id uuid default null,
  p_new_word_daily_cap int default 10
)
returns table (
  lemma_key text,
  display_word text,
  translation text,
  word_ids uuid[],
  deck_ids uuid[],
  state text,
  due boolean,
  next_due_at timestamptz,
  consecutive_correct int,
  total_attempts int,
  last_attempt_at timestamptz,
  last_knew_it boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  return query
  with params as (
    select
      now() as now_at,
      date_trunc('day', now()) as today_start,
      greatest(coalesce(p_new_word_daily_cap, 10), 0)::int as new_word_cap
  ),
  all_words as (
    select
      w.id,
      w.deck_id,
      w.word,
      w.translation,
      w.created_at,
      lower(btrim(w.word)) as lemma_key
    from public.words w
    join public.decks d on d.id = w.deck_id
      and d.user_id = p_user_id
    where w.user_id = p_user_id
      and d.target_language = p_target_language
      and w.status = 'complete'
      and nullif(lower(btrim(w.word)), '') is not null
  ),
  scoped_lemmas as (
    select distinct aw.lemma_key
    from all_words aw
    where p_deck_id is null
       or aw.deck_id = p_deck_id
  ),
  lemma_words as (
    select
      aw.lemma_key,
      (array_agg(aw.word order by aw.created_at asc, aw.id asc))[1]::text as display_word,
      (array_agg(aw.translation order by aw.created_at asc, aw.id asc))[1]::text as translation,
      array_agg(aw.id order by aw.created_at asc, aw.id asc)::uuid[] as word_ids,
      array_agg(distinct aw.deck_id)::uuid[] as deck_ids,
      min(aw.created_at) as first_word_created_at
    from all_words aw
    join scoped_lemmas sl on sl.lemma_key = aw.lemma_key
    group by aw.lemma_key
  ),
  attempt_rows as (
    select
      aw.lemma_key,
      ra.id as attempt_id,
      ra.knew_it,
      ra.created_at,
      row_number() over (
        partition by aw.lemma_key
        order by ra.created_at desc, ra.id desc
      ) as newest_rank
    from public.recall_attempts ra
    join all_words aw on aw.id = ra.word_id
    join scoped_lemmas sl on sl.lemma_key = aw.lemma_key
    where ra.user_id = p_user_id
      and ra.study_mode is distinct from 'runner'
  ),
  attempt_runs as (
    select
      ar.*,
      count(*) filter (where ar.knew_it = false) over (
        partition by ar.lemma_key
        order by ar.created_at desc, ar.attempt_id desc
        rows between unbounded preceding and 1 preceding
      ) as prior_misses
    from attempt_rows ar
  ),
  attempt_summaries as (
    select
      ar.lemma_key,
      count(*)::int as total_attempts,
      count(*) filter (
        where ar.knew_it = true
          and coalesce(ar.prior_misses, 0) = 0
      )::int as consecutive_correct
    from attempt_runs ar
    group by ar.lemma_key
  ),
  latest_attempts as (
    select
      ar.lemma_key,
      ar.created_at as last_attempt_at,
      ar.knew_it as last_knew_it
    from attempt_rows ar
    where ar.newest_rank = 1
  ),
  language_attempt_rows as (
    select
      aw.lemma_key,
      ra.created_at,
      row_number() over (
        partition by aw.lemma_key
        order by ra.created_at asc, ra.id asc
      ) as first_rank
    from public.recall_attempts ra
    join all_words aw on aw.id = ra.word_id
    where ra.user_id = p_user_id
      and ra.study_mode is distinct from 'runner'
  ),
  new_today as (
    select count(*)::int as new_today_count
    from language_attempt_rows lar
    cross join params p
    where lar.first_rank = 1
      and lar.created_at >= p.today_start
      and lar.created_at <= p.now_at
  ),
  classified as (
    select
      lw.lemma_key,
      lw.display_word,
      lw.translation,
      lw.word_ids,
      lw.deck_ids,
      lw.first_word_created_at,
      coalesce(asum.consecutive_correct, 0)::int as consecutive_correct,
      coalesce(asum.total_attempts, 0)::int as total_attempts,
      la.last_attempt_at,
      la.last_knew_it,
      case
        when coalesce(asum.total_attempts, 0) = 0 then 'new'
        when la.last_knew_it = false or coalesce(asum.consecutive_correct, 0) < 3 then 'learning'
        when coalesce(asum.consecutive_correct, 0) >= 3
          and coalesce(asum.consecutive_correct, 0) < 5 then 'reviewing'
        when coalesce(asum.consecutive_correct, 0) >= 5
          and la.last_knew_it = true then 'mastered'
        else 'learning'
      end as srs_state
    from lemma_words lw
    left join attempt_summaries asum on asum.lemma_key = lw.lemma_key
    left join latest_attempts la on la.lemma_key = lw.lemma_key
  ),
  scheduled as (
    select
      c.*,
      case
        when c.srs_state = 'new' then null::timestamptz
        when c.consecutive_correct = 0 then p.now_at
        when c.consecutive_correct = 1 then c.last_attempt_at + interval '1 day'
        when c.consecutive_correct = 2 then c.last_attempt_at + interval '3 days'
        when c.consecutive_correct = 3 then c.last_attempt_at + interval '7 days'
        when c.consecutive_correct = 4 then c.last_attempt_at + interval '14 days'
        when c.consecutive_correct = 5 then c.last_attempt_at + interval '30 days'
        when c.consecutive_correct = 6 then c.last_attempt_at + interval '60 days'
        else c.last_attempt_at + interval '90 days'
      end as next_due_at
    from classified c
    cross join params p
  ),
  new_ranked as (
    select
      s.*,
      row_number() over (
        partition by s.srs_state
        order by s.first_word_created_at asc, s.lemma_key asc
      ) as state_rank
    from scheduled s
  ),
  quota as (
    select greatest(p.new_word_cap - nt.new_today_count, 0)::int as remaining_new_quota
    from params p
    cross join new_today nt
  )
  select
    nr.lemma_key,
    nr.display_word,
    nr.translation,
    nr.word_ids,
    nr.deck_ids,
    nr.srs_state as state,
    case
      when nr.srs_state = 'new' then nr.state_rank <= q.remaining_new_quota
      else nr.next_due_at <= p.now_at
    end as due,
    nr.next_due_at,
    nr.consecutive_correct,
    nr.total_attempts,
    nr.last_attempt_at,
    nr.last_knew_it
  from new_ranked nr
  cross join params p
  cross join quota q
  order by nr.first_word_created_at asc, nr.lemma_key asc;
end;
$$;

grant execute on function public.compute_word_states(uuid, text, uuid, int) to authenticated;
