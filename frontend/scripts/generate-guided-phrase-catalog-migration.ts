import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GUIDED_LESSONS } from '../src/data/guidedLessonsAuthoring.ts'
import { ACTIVE_GUIDED_VIBE_IDS, type ActiveGuidedVibeId } from '../src/data/guidedVibes.ts'

const destination = fileURLToPath(new URL('../supabase/migrations/20260907130000_guided_phrase_catalog.sql', import.meta.url))

export type GuidedPhraseCatalogRow = {
  pathId: string
  lessonId: string
  lessonNumber: number
  vibe: ActiveGuidedVibeId
  targetLanguage: string
  targetLanguageCode: string
  authoredBaseLanguage: string
  phrase: string
  translations: Record<string, string>
  contentHash: string
}

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function canonicalTargetLanguage(value: string) {
  return value === 'Cebuano' ? 'Bisaya' : value
}

function registeredTranslations(value: Partial<Record<'en' | 'de', string>>) {
  const translations: Record<string, string> = {}
  if (value.en?.trim()) translations.English = value.en.trim()
  if (value.de?.trim()) translations.German = value.de.trim()
  return translations
}

export function buildGuidedPhraseCatalogRows(): GuidedPhraseCatalogRow[] {
  const rows: GuidedPhraseCatalogRow[] = []
  for (const lesson of GUIDED_LESSONS) {
    for (const vibe of ACTIVE_GUIDED_VIBE_IDS) {
      const variant = lesson.vibeVariants[vibe]
      if (!variant) continue
      const row = {
        pathId: lesson.pathId,
        lessonId: lesson.id,
        lessonNumber: lesson.lessonNumber,
        vibe,
        targetLanguage: canonicalTargetLanguage(lesson.targetLanguage),
        targetLanguageCode: variant.speakTarget.language,
        authoredBaseLanguage: lesson.baseLanguage,
        phrase: variant.corePhrase.targetText.trim(),
        translations: registeredTranslations(variant.corePhrase.baseText),
      }
      rows.push({ ...row, contentHash: sha256(JSON.stringify(row)) })
    }
  }
  return rows.sort((a, b) =>
    a.pathId.localeCompare(b.pathId)
    || a.lessonNumber - b.lessonNumber
    || a.lessonId.localeCompare(b.lessonId)
    || ACTIVE_GUIDED_VIBE_IDS.indexOf(a.vibe) - ACTIVE_GUIDED_VIBE_IDS.indexOf(b.vibe),
  )
}

function sqlLiteral(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}

export function renderGuidedPhraseCatalogMigration() {
  const values = buildGuidedPhraseCatalogRows().map((row) => `  (${[
    row.pathId,
    row.lessonId,
    String(row.lessonNumber),
    row.vibe,
    row.targetLanguage,
    row.targetLanguageCode,
    row.authoredBaseLanguage,
    row.phrase,
    JSON.stringify(row.translations),
    row.contentHash,
  ].map((value, index) => index === 2 ? value : sqlLiteral(value)).join(', ')})`).join(',\n')

  return `-- Canonical Guided Today phrase registry. Generated from authored lesson data by
-- scripts/generate-guided-phrase-catalog-migration.ts; do not hand-edit seed rows.
begin;

create table if not exists public.guided_phrase_catalog (
  path_id text not null,
  lesson_id text not null,
  lesson_number integer not null check (lesson_number between 1 and 10),
  vibe text not null check (vibe in ('bright', 'wistful', 'sharp')),
  target_language text not null,
  target_language_code text not null,
  authored_base_language text not null,
  phrase text not null check (length(btrim(phrase)) between 1 and 500),
  translations jsonb not null check (jsonb_typeof(translations) = 'object'),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now(),
  primary key (path_id, lesson_id, vibe),
  check (length(btrim(path_id)) between 1 and 120),
  check (length(btrim(lesson_id)) between 1 and 160),
  check (length(btrim(target_language)) between 1 and 80),
  check (length(btrim(target_language_code)) between 1 and 32),
  check (length(btrim(authored_base_language)) between 1 and 80),
  check (translations ? authored_base_language),
  check (length(btrim(translations ->> authored_base_language)) between 1 and 1000)
);

alter table public.guided_phrase_catalog enable row level security;
revoke all on public.guided_phrase_catalog from public, anon, authenticated;

insert into public.guided_phrase_catalog (
  path_id, lesson_id, lesson_number, vibe, target_language,
  target_language_code, authored_base_language, phrase, translations, content_hash
) values
${values}
on conflict (path_id, lesson_id, vibe) do update set
  lesson_number = excluded.lesson_number,
  target_language = excluded.target_language,
  target_language_code = excluded.target_language_code,
  authored_base_language = excluded.authored_base_language,
  phrase = excluded.phrase,
  -- Keep offline-verified locale overlays across a byte-identical authored
  -- catalog redeploy. A source/authored-meaning change advances content_hash,
  -- so discard older overlays rather than attaching them to revised content.
  translations = case
    when guided_phrase_catalog.content_hash is distinct from excluded.content_hash
      then excluded.translations
    else guided_phrase_catalog.translations || excluded.translations
  end,
  content_hash = excluded.content_hash,
  updated_at = now()
where (
  guided_phrase_catalog.lesson_number,
  guided_phrase_catalog.target_language,
  guided_phrase_catalog.target_language_code,
  guided_phrase_catalog.authored_base_language,
  guided_phrase_catalog.phrase,
  guided_phrase_catalog.translations,
  guided_phrase_catalog.content_hash
) is distinct from (
  excluded.lesson_number,
  excluded.target_language,
  excluded.target_language_code,
  excluded.authored_base_language,
  excluded.phrase,
  excluded.translations,
  excluded.content_hash
);

-- Preserve public playback while making underlying RLS apply to view callers.
create or replace view public.guided_tts_playback
with (security_invoker = true) as
select u.path_id, u.lesson_id, u.vibe, u.surface, u.surface_key,
       a.public_url, a.duration_ms, a.status
from public.guided_tts_asset_usages u
join public.guided_tts_assets a on a.id = u.asset_id
where a.status = 'ready';
grant select on public.guided_tts_playback to anon, authenticated;

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
    or v_audio_target is distinct from v_catalog.target_language_code
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
`
}

const generated = renderGuidedPhraseCatalogMigration()
if (process.argv.includes('--check')) {
  if (readFileSync(destination, 'utf8') !== generated) {
    throw new Error('Guided phrase catalog migration is stale; regenerate it.')
  }
} else if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(destination, generated)
  console.log(`Wrote ${buildGuidedPhraseCatalogRows().length} guided phrase catalog rows to ${destination}`)
}
