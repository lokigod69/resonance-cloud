create or replace function public.get_user_words_for_language(
    p_target_language text
)
returns text[]
language sql
security definer
set search_path = public
as $$
    with recent_owned as (
        select distinct on (lower(btrim(w.word)))
            lower(btrim(w.word)) as word_key,
            w.created_at
        from public.words w
        join public.decks d on d.id = w.deck_id
        where w.user_id = auth.uid()
          and d.target_language = nullif(p_target_language, '')
          and w.status <> 'failed'
          and nullif(btrim(w.word), '') is not null
        order by lower(btrim(w.word)), w.created_at desc
    ),
    capped as (
        select word_key
        from recent_owned
        order by created_at desc
        limit 300
    )
    select coalesce(array_agg(word_key order by word_key), array[]::text[])
    from capped;
$$;

revoke all on function public.get_user_words_for_language(text) from public, anon;
grant execute on function public.get_user_words_for_language(text) to authenticated, service_role;

comment on function public.get_user_words_for_language(text) is
    'Returns up to 300 distinct lowercased trimmed words owned by the authenticated user for the given target language. Excludes failed words. Used by suggest-words avoid-list.';
