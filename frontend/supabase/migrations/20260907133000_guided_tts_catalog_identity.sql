-- Accept a registered TTS asset's exact BCP-47 code or the exact primary
-- subtag of the catalog code. Phrase and coordinate identity remain exact.
begin;

create table if not exists public.guided_tts_asset_usage_quarantine (
  usage_id uuid primary key,
  original_row jsonb not null check (jsonb_typeof(original_row) = 'object'),
  reason text not null check (length(btrim(reason)) between 1 and 500),
  quarantined_at timestamptz not null default now(),
  quarantined_by_migration text not null
);

alter table public.guided_tts_asset_usage_quarantine enable row level security;
revoke all on table public.guided_tts_asset_usage_quarantine from public, anon, authenticated;

do $$
declare
  v_usage public.guided_tts_asset_usages%rowtype;
  v_reason constant text := 'Core phrase source differs from canonical Guided catalog phrase';
begin
  select u.* into v_usage
    from public.guided_tts_asset_usages u
    join public.guided_phrase_catalog c
      on c.path_id = u.path_id and c.lesson_id = u.lesson_id and c.vibe = u.vibe
   where u.path_id = 'english-a1-practical-1'
     and u.lesson_id = 'english-a1-practical-001-first-contact'
     and u.vibe = 'wistful' and u.surface = 'corePhrase' and u.surface_key = '__self'
     and u.source_text = 'Sorry to ask — do you happen to speak English?'
     and c.phrase = 'Do you speak a little English?'
     and c.content_hash = '5ee4ca508e1d9ab9abb43da8c2308725a64a80770084a2376c9d7f3f3067a02d'
   for update of u;

  if found then
    insert into public.guided_tts_asset_usage_quarantine (
      usage_id, original_row, reason, quarantined_by_migration
    ) values (
      v_usage.id, to_jsonb(v_usage), v_reason, '20260907133000'
    ) on conflict (usage_id) do nothing;

    if not exists (
      select 1 from public.guided_tts_asset_usage_quarantine q
       where q.usage_id = v_usage.id and q.original_row = to_jsonb(v_usage)
         and q.reason = v_reason and q.quarantined_by_migration = '20260907133000'
    ) then
      raise exception 'Existing Guided TTS quarantine record does not match guarded source row'
        using errcode = '22023';
    end if;

    delete from public.guided_tts_asset_usages
     where id = v_usage.id
       and path_id = v_usage.path_id and lesson_id = v_usage.lesson_id
       and vibe = v_usage.vibe and surface = v_usage.surface
       and surface_key = v_usage.surface_key and source_text = v_usage.source_text;
    if not found then
      raise exception 'Guarded Guided TTS usage changed concurrently' using errcode = '40001';
    end if;
  elsif exists (
    select 1 from public.guided_tts_asset_usages u
     where u.path_id = 'english-a1-practical-1'
       and u.lesson_id = 'english-a1-practical-001-first-contact'
       and u.vibe = 'wistful' and u.surface = 'corePhrase' and u.surface_key = '__self'
  ) then
    raise exception 'Unexpected Guided TTS usage at quarantined coordinate' using errcode = '22023';
  end if;
end
$$;

create or replace function public.keep_guided_phrase(
  p_target_language text, p_base_language text, p_deck_name text,
  p_path_id text, p_lesson_id text, p_vibe text,
  p_phrase text, p_translation text
) returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_deck uuid;
  v_word uuid;
  v_audio text;
  v_audio_source text;
  v_audio_target text;
  v_audio_found boolean := false;
  v_catalog public.guided_phrase_catalog%rowtype;
  v_phrase text := btrim(p_phrase);
  v_translation text := btrim(p_translation);
  v_target text := btrim(p_target_language);
  v_base text := btrim(p_base_language);
  v_path text := btrim(p_path_id);
  v_lesson text := btrim(p_lesson_id);
  v_inserted boolean := false;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if v_target is null or length(v_target) not between 1 and 80
    or v_base is null or length(v_base) not between 1 and 80
    or p_vibe is null or p_vibe not in ('bright','wistful','sharp')
    or v_phrase is null or length(v_phrase) not between 1 and 500
    or v_translation is null or length(v_translation) not between 1 and 1000
    or p_deck_name is null or length(btrim(p_deck_name)) not between 1 and 120
    or v_path is null or length(v_path) not between 1 and 120
    or v_lesson is null or length(v_lesson) not between 1 and 160
  then raise exception 'Invalid guided phrase' using errcode = '22023'; end if;

  select * into v_catalog
    from public.guided_phrase_catalog c
   where c.path_id = v_path and c.lesson_id = v_lesson and c.vibe = p_vibe;
  if not found then
    raise exception 'Unregistered guided phrase' using errcode = '22023';
  end if;
  if v_catalog.target_language is distinct from v_target
    or btrim(v_catalog.phrase) is distinct from v_phrase
    or nullif(btrim(v_catalog.translations ->> v_base), '') is distinct from v_translation
  then
    raise exception 'Guided phrase does not match the canonical lesson catalog'
      using errcode = '22023';
  end if;

  select u.source_text, a.target_language_code,
         case when a.status = 'ready' then a.public_url else null end
    into v_audio_source, v_audio_target, v_audio
    from public.guided_tts_asset_usages u
    join public.guided_tts_assets a on a.id = u.asset_id
   where u.path_id = v_path and u.lesson_id = v_lesson and u.vibe = p_vibe
     and u.surface = 'corePhrase' and u.surface_key = '__self'
   limit 1;
  v_audio_found := found;
  if v_audio_found and (
    btrim(v_audio_source) is distinct from v_catalog.phrase
    or not coalesce((
      lower(btrim(v_audio_target)) = lower(btrim(v_catalog.target_language_code))
      or (
        position('-' in btrim(v_catalog.target_language_code)) > 0
        and lower(btrim(v_audio_target)) = split_part(lower(btrim(v_catalog.target_language_code)), '-', 1)
      )
    ), false)
  ) then
    raise exception 'Guided recording does not match the canonical lesson catalog'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':guided_phrase:' || v_target, 0));
  select g.deck_id into v_deck from public.guided_phrase_decks g
    join public.decks d on d.id = g.deck_id and d.user_id = v_user and d.target_language = v_target
      and d.deck_type = 'card_text' and d.source_kind = 'user'
    where g.user_id = v_user and g.target_language = v_target for update of d;
  if v_deck is null then
    delete from public.guided_phrase_decks where user_id = v_user and target_language = v_target;
    insert into public.decks(user_id,name,target_language,word_count,status,deck_type,source_kind)
      values(v_user,btrim(p_deck_name),v_target,0,'complete','card_text','user') returning id into v_deck;
    insert into public.guided_phrase_decks values(v_user,v_target,v_deck);
  end if;

  select id into v_word from public.words where user_id = v_user and deck_id = v_deck
    and lower(btrim(word)) = lower(v_phrase) and status <> 'failed' order by created_at limit 1;
  if v_word is null then
    insert into public.words(deck_id,user_id,word,word_slug,original_input,translation,
      tts_audio_url,tts_status,tts_generated_at,status,current_stage,music_state,metadata)
    values(v_deck,v_user,v_phrase,lower(v_phrase),v_phrase,v_translation,
      v_audio,case when v_audio is not null then 'ready' else null end,
      case when v_audio is not null then now() else null end,'complete','complete','pending',
      jsonb_build_object('origin','guided_today','is_phrase',true,'target_language',v_target,
        'base_language',v_base,'guided',jsonb_build_object('path_id',v_path,
          'lesson_id',v_lesson,'vibe',p_vibe,'surface','corePhrase','surface_key','__self',
          'catalog_hash',v_catalog.content_hash)))
    returning id into v_word;
    perform set_config('app.allow_phase1e_pipeline_update','on',true);
    update public.decks set word_count = word_count + 1, updated_at = now() where id = v_deck;
    v_inserted := true;
  end if;
  return jsonb_build_object('deck_id',v_deck,'word_id',v_word,'inserted',v_inserted);
end;
$$;
revoke all on function public.keep_guided_phrase(text,text,text,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.keep_guided_phrase(text,text,text,text,text,text,text,text)
  to authenticated;
notify pgrst, 'reload schema';

commit;
