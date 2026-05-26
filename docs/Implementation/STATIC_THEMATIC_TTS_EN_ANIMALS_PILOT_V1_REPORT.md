# Static Thematic TTS English Animals Pilot V1 Report

## Summary

Implemented the English Animals static thematic TTS pilot as a separate usage layer over existing Guided TTS assets. The browser only reads `public.static_tts_playback` and plays pre-existing static audio URLs; no frontend path calls ElevenLabs or any paid provider.

No generated MP3 files are committed. No production data is seeded or mutated by the migration.

## Files Changed

- `frontend/supabase/migrations/20260526010000_static_thematic_tts_v1.sql`
- `frontend/scripts/export-static-thematic-tts-inventory.ts`
- `frontend/scripts/test-static-thematic-tts.ts`
- `frontend/src/lib/staticThematicAudio.ts`
- `frontend/src/hooks/useStaticThematicAudio.ts`
- `frontend/src/pages/categories/LevelDetailPage.tsx`
- `frontend/src/pages/categories/Categories.module.css`
- `frontend/package.json`
- `scripts/generate_static_thematic_tts.py`
- `tests/test_static_thematic_tts.py`
- `docs/Implementation/STATIC_THEMATIC_TTS_EN_ANIMALS_PILOT_V1_REPORT.md`

## Migration

Migration name: `20260526010000_static_thematic_tts_v1.sql`

It adds:

- `public.static_tts_voice_assignments`
- `public.static_tts_asset_usages`
- `public.static_tts_playback`

`public.guided_tts_asset_usages` is intentionally unchanged.

The playback view exposes only:

- `target_language_code`
- `category_slug`
- `level_number`
- `concept_id`
- `spoken_text`
- `public_url`
- `duration_ms`
- `audio_version`
- `voice_profile_key`
- `qa_status`

It returns only `guided_tts_assets.status = 'ready'` and static usages with `qa_status in ('ready', 'approved')`.

## Storage Path

Bucket: `guided-tts`

Path convention:

```text
static/v1/{target_language_code}/{voice_profile_key}/{category_slug}/level-{level_number}/{concept_id}.mp3
```

Example:

```text
static/v1/en/static_thematic_en_animals_v1/animals/level-1/animals.dog.mp3
```

## Voice Strategy

Pilot voice profile key:

```text
static_thematic_en_animals_v1
```

The CLI first looks for an active `guided_voice_profiles` row with that key. If missing, it resolves the provider voice from `public.voices` by `--voice-name` or uses `--provider-voice-id` as an explicit fallback. The source code does not hardcode the Elisa provider voice ID.

Existing live Guided TTS documentation records the Bright English voice as **Elisa** rather than Eliza, so pilot commands use `--voice-name "Elisa"`.

## Pilot Commands

Export English Animals Level 1 inventory:

```powershell
npm --prefix frontend run tts:static:inventory -- --target-language en --category animals --level 1 --out ../tmp/static-tts-en-animals-level-1.json
```

Dry run, no DB writes and no provider calls:

```powershell
python scripts/generate_static_thematic_tts.py ^
  --inventory tmp/static-tts-en-animals-level-1.json ^
  --target-language en ^
  --category animals ^
  --voice-profile-key static_thematic_en_animals_v1 ^
  --voice-name "Elisa" ^
  --dry-run
```

Commit Level 1 generation. This is the only path that may call ElevenLabs:

```powershell
python scripts/generate_static_thematic_tts.py ^
  --inventory tmp/static-tts-en-animals-level-1.json ^
  --target-language en ^
  --category animals ^
  --voice-profile-key static_thematic_en_animals_v1 ^
  --voice-name "Elisa" ^
  --commit-db ^
  --allow-provider-calls ^
  --report-out tmp/static-tts-en-animals-level-1-report.json
```

To generate all Animals levels, first export with `--all-levels` and pass that inventory to the same CLI. Use `--limit N` for pilot safety.

## Supabase Verification

After a committed run, verify:

```sql
select * from public.static_tts_voice_assignments
where target_language_code = 'en' and category_slug = 'animals';

select concept_id, qa_status, voice_profile_key
from public.static_tts_asset_usages
where target_language_code = 'en' and category_slug = 'animals' and level_number = 1
order by concept_id;

select concept_id, public_url, duration_ms
from public.static_tts_playback
where target_language_code = 'en' and category_slug = 'animals' and level_number = 1
order by concept_id;
```

Storage objects should appear under:

```text
guided-tts/static/v1/en/static_thematic_en_animals_v1/animals/level-1/
```

## Frontend Verification

Open:

```text
/categories/animals/level/1
```

Set vocabulary language to English. Cards with rows in `static_tts_playback` show a small speaker button. Missing audio is quiet for normal users; development builds show a subtle `TTS` marker for QA.

## QA Report Format

The CLI report contains:

- `mode`
- `target_language`
- `category`
- resolved voice profile summary without provider voice ID
- totals: item count, existing ready assets, existing usages, skipped, would-generate, generated, failed
- per-item status, cache key, storage path, asset/usage IDs when available, and postprocess metadata

## Intentionally Not Changed

- `submit_generation`
- `request_word_retry`
- credits
- `generation_jobs`
- paid deck generation
- card generation
- video generation
- Suno
- KIE
- Speak
- Guided Today lessons
- `public.guided_tts_asset_usages`
- import-to-deck TTS reuse

## Future Import-to-Deck Reuse

Imported static category rows should later reference or copy the canonical static TTS asset. Import should not trigger new TTS generation. Imported rows should preserve `source_category_slug`, `source_level_number`, `source_concept_id`, and either `static_tts_asset_id` or equivalent metadata.

## Next Steps

For full English rollout:

- Run Level 1 pilot generation and QA listen-through.
- Decide whether Elisa remains the language-wide default or only Animals override.
- Add a language default assignment with `category_slug = null` once validated.
- Add more static categories only through explicit scoped inventory exports.

For other languages:

- Add one language at a time after a voice-selection pass.
- Keep language defaults separate from category overrides.
- Add language-specific normalization and QA rules where needed.

## Open Risks

- One-word clips can sound abrupt even after trimming and tiny fades; QA listen-through is required.
- `public.voices` spelling must remain verified before commit generation. Current project docs indicate `Elisa`.
- The full `npm run build` typecheck is currently blocked by unrelated `TrophyStudyModal.tsx` errors; Vite bundling succeeds.
