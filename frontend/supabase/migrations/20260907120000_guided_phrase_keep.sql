-- Keep a practiced phrase in a stable caller-owned text deck, without generation
-- or credit use. The identity survives renames; deletion permits a fresh deck.
begin;

create table if not exists public.guided_phrase_decks (
  user_id uuid not null references auth.users(id) on delete cascade,
  target_language text not null,
  deck_id uuid not null unique references public.decks(id) on delete cascade,
  primary key (user_id, target_language)
);
alter table public.guided_phrase_decks enable row level security;
revoke all on public.guided_phrase_decks from public, anon, authenticated;
grant select on public.guided_phrase_decks to authenticated;
drop policy if exists guided_phrase_decks_read_own on public.guided_phrase_decks;
create policy guided_phrase_decks_read_own on public.guided_phrase_decks
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.keep_guided_phrase(
  p_target_language text, p_base_language text, p_deck_name text,
  p_path_id text, p_lesson_id text, p_vibe text,
  p_phrase text, p_translation text
) returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_deck uuid;
  v_word uuid;
  v_audio text;
  v_audio_source text;
  v_audio_target text;
  v_phrase text := btrim(p_phrase);
  v_target text := btrim(p_target_language);
  v_target_code text;
  v_path text := btrim(p_path_id);
  v_lesson text := btrim(p_lesson_id);
  v_inserted boolean := false;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if v_target is null or v_target not in ('English','German','French','Spanish','Italian','Portuguese','Polish','Russian','Japanese','Korean','Indonesian','Bisaya')
    or p_base_language is null or p_base_language not in ('English','German')
    or p_vibe is null or p_vibe not in ('bright','wistful','sharp')
    or v_phrase is null or length(v_phrase) not between 1 and 500
    or p_translation is null or length(btrim(p_translation)) not between 1 and 1000
    or p_deck_name is null or length(btrim(p_deck_name)) not between 1 and 120
    or v_path is null or length(v_path) not between 1 and 120
    or v_lesson is null or length(v_lesson) not between 1 and 160
  then raise exception 'Invalid guided phrase' using errcode = '22023'; end if;

  v_target_code := case v_target
    when 'English' then 'en-US'
    when 'German' then 'de-DE'
    when 'French' then 'fr-FR'
    when 'Spanish' then 'es-ES'
    when 'Italian' then 'it-IT'
    when 'Portuguese' then 'pt-BR'
    when 'Polish' then 'pl-PL'
    when 'Russian' then 'ru-RU'
    when 'Japanese' then 'ja-JP'
    when 'Korean' then 'ko-KR'
    when 'Indonesian' then 'id-ID'
    when 'Bisaya' then 'ceb-PH'
  end;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':guided_phrase:' || v_target, 0));
  select g.deck_id into v_deck from public.guided_phrase_decks g
    join public.decks d on d.id = g.deck_id and d.user_id = v_user and d.target_language = v_target
      and d.deck_type = 'card_text' and d.source_kind = 'user'
    where g.user_id = v_user and g.target_language = v_target for update of d;
  if v_deck is null then
    -- Remove only a stale identity whose referenced deck no longer matches.
    delete from public.guided_phrase_decks where user_id = v_user and target_language = v_target;
    insert into public.decks(user_id,name,target_language,word_count,status,deck_type,source_kind)
      values(v_user,btrim(p_deck_name),v_target,0,'complete','card_text','user') returning id into v_deck;
    insert into public.guided_phrase_decks values(v_user,v_target,v_deck);
  end if;

  -- A registered usage is the server-owned source of truth for its phrase.
  -- The caller cannot pair arbitrary text with a real lesson recording.
  select u.source_text, a.target_language_code,
         case when a.status = 'ready' then a.public_url else null end
    into v_audio_source, v_audio_target, v_audio
    from public.guided_tts_asset_usages u
    join public.guided_tts_assets a on a.id = u.asset_id
   where u.path_id = v_path and u.lesson_id = v_lesson and u.vibe = p_vibe
     and u.surface = 'corePhrase' and u.surface_key = '__self'
   limit 1;
  if found and btrim(v_audio_source) is distinct from v_phrase then
    raise exception 'Guided phrase does not match registered lesson audio'
      using errcode = '22023';
  end if;
  if found and v_audio_target is distinct from v_target_code then
    raise exception 'Guided target language does not match registered lesson audio'
      using errcode = '22023';
  end if;

  select id into v_word from public.words where user_id = v_user and deck_id = v_deck
    and lower(btrim(word)) = lower(v_phrase) and status <> 'failed' order by created_at limit 1;
  if v_word is null then
    insert into public.words(deck_id,user_id,word,word_slug,original_input,translation,
      tts_audio_url,tts_status,tts_generated_at,status,current_stage,music_state,metadata)
    values(v_deck,v_user,v_phrase,lower(v_phrase),v_phrase,btrim(p_translation),
      v_audio,case when v_audio is not null then 'ready' else null end,
      case when v_audio is not null then now() else null end,'complete','complete','pending',
      jsonb_build_object('origin','guided_today','is_phrase',true,'target_language',v_target,
        'base_language',p_base_language,'guided',jsonb_build_object('path_id',v_path,
          'lesson_id',v_lesson,'vibe',p_vibe,'surface','corePhrase','surface_key','__self')))
    returning id into v_word;
    perform set_config('app.allow_phase1e_pipeline_update','on',true);
    update public.decks set word_count = word_count + 1, updated_at = now() where id = v_deck;
    v_inserted := true;
  end if;
  return jsonb_build_object('deck_id',v_deck,'word_id',v_word,'inserted',v_inserted);
end;
$$;
revoke all on function public.keep_guided_phrase(text,text,text,text,text,text,text,text) from public,anon;
grant execute on function public.keep_guided_phrase(text,text,text,text,text,text,text,text) to authenticated;
notify pgrst, 'reload schema';
commit;
