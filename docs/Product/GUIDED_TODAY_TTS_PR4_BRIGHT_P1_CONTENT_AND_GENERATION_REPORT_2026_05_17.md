# Guided Today TTS PR #4 Bright P1 content and generation report

Date: 2026-05-17

## Files changed

- `frontend/src/data/guidedLessons.ts`
- `frontend/scripts/test-guided-today-data.ts`
- `frontend/package.json`
- `frontend/scripts/guided-tts-lessons-dump.ts`
- `frontend/scripts/guided-tts-inventory.ts`
- `frontend/scripts/test-guided-tts-inventory.ts`
- `src/services/guided_tts/__init__.py`
- `src/services/guided_tts/db.py`
- `src/services/guided_tts/generate.py`
- `src/services/guided_tts/inventory.py`
- `src/services/guided_tts/provider.py`
- `src/services/guided_tts/provider_elevenlabs.py`
- `tests/test_guided_tts_generate.py`
- `tests/test_guided_tts_inventory.py`
- `tests/test_guided_tts_provider_elevenlabs.py`
- `docs/Product/GUIDED_TODAY_TTS_PR4_BRIGHT_P1_CONTENT_AND_GENERATION_REPORT_2026_05_17.md`

## Bright Path 1 phrases

1. First contact: `Hi there, do you speak English?`
2. Polite follow-up: `Sorry, could you say that again?`
3. Where is...?: `Hi, could you help me? Where is the station?`
4. I'd like...: `I'd like a coffee, please.`
5. How much?: `How much is this?`
6. The train: `Hi, what time is the train?`
7. I need...: `Hi, could you help me, please?`
8. I like...: `I love it here.`
9. Tomorrow at seven: `Tomorrow at seven? Great!`
10. Thank you, goodbye: `Wonderful, thanks so much. Goodbye.`

## Fields changed

- Lesson 2: `corePhrase`, `baseText`, `meaning`, `chunks`, `lessonItems`, `build`, `typeRecall`, `speakTarget`, `sceneCaption`, `placeholderMedia.caption`, `visualNotes`.
- Lesson 4: `corePhrase`, `baseText`, `meaning`, `chunks`, `lessonItems`, `build`, `typeRecall.before`, `speakTarget`.
- Lesson 5: `corePhrase`, `baseText`, `meaning`, `chunks`, `lessonItems`, `build`, `typeRecall`, `speakTarget`, `sceneCaption`, `placeholderMedia.caption`, `visualNotes`.
- Lesson 6: `corePhrase`, `baseText`, `chunks`, `lessonItems`, `build`, `typeRecall`, `speakTarget`.
- Lesson 9: `corePhrase`, `baseText`, `chunks`, `lessonItems`, `build`, `typeRecall`, `speakTarget`, `trophyWord`, `visualNotes`.
- Lesson 10: `corePhrase`, `baseText`, `chunks`, `build`, `typeRecall`, `speakTarget`, `trophyWord`.

Lessons 1, 3, 7, and 8 Bright phrases were kept.

## Generator scope

Added explicit commit scope `a1p1-bright-path-1`:

- path: `english-a1-practical-1`
- vibe: `bright`
- lessons: 1-10
- surfaces requested: `corePhrase,chunks,trophyWord`
- emitted surfaces: `corePhrase`, `chunk`, `trophyWord`

Also fixed same-run duplicate cache handling so repeated Bright text links to the asset generated earlier in the same commit instead of calling the provider again.

## Dry-run counts

Dry-run run id: `db488d97-bab4-4e5c-ad0d-72d4220e1b22`

- rows: 46
- ready: 5
- missing: 41
- missing_voice_profile: 0
- unique_normalized_texts: 42
- unique_cache_keys: 42
- estimated_provider_calls: 37
- estimated_provider_characters: 531
- total_character_count_all_voices: 571

Per surface: `corePhrase=10`, `chunk=26`, `trophyWord=10`.

Per lesson rows: L1 5 ready; L2 4 missing; L3 5 missing; L4 5 missing; L5 4 missing; L6 4 missing; L7 5 missing; L8 4 missing; L9 5 missing; L10 5 missing.

Scope confirmation: Bright-only, Path 1-only, no Wistful/Sharp rows, no other path rows.

## Commit generation

Commit run id: `439e7733-9051-4f92-b18b-49b5e6c8ebdd`

- generated_assets: 37
- failed_assets: 0
- deduped_usages: 4
- provider calls: 37
- provider characters: 531
- cache hits from Lesson 1: 5 ready rows

Post-generation dry-run run id: `0361f5c0-7238-4565-982f-6b9aaf46d552`

- rows: 46
- ready: 46
- missing: 0
- missing_voice_profile: 0
- estimated_provider_calls: 0
- estimated_provider_characters: 0

## Playback verification

`public.guided_tts_playback` now returns 46 ready Bright Path 1 rows:

- `corePhrase`: 10
- `chunk`: 26
- `trophyWord`: 10

A1P1 lesson 1 canary playback remains present for all three active vibes: `bright=5`, `wistful=5`, `sharp=5`.

Path-level playback counts after PR4: `bright=46`, `wistful=5`, `sharp=5`, confirming no Wistful/Sharp expansion.

Authenticated browser listening was not manually exercised in this environment, but the playback view has ready public URLs for every Bright Path 1 PR3-wired surface.

## Audio audit note

Storage HEAD checks succeeded for all 46 Bright playback URLs. MP3 object sizes ranged from 8,403 bytes to 39,750 bytes, average 14,981 bytes; no file was under 1,000 bytes. `duration_ms` is not currently populated in `guided_tts_assets`, so duration variance cannot be audited from DB metadata yet.

Recommendation: add a future loudness/duration metadata pass before broad multi-vibe generation. No loudness normalization was added in PR4.

## Safety confirmations

- Wistful and Sharp content were not edited.
- Spanish and Italian content were not edited.
- No music, Suno, or trophy-song files were changed.
- No SQL/schema files were changed.
- No provider voice profiles were changed.
- No `--allow-unscoped-commit` was used.
- ElevenLabs was called only after content tests, build, and Bright-only dry-run scope passed.

## Checks

- `npx tsx scripts/test-guided-today-data.ts` - passed, 8982 passed / 0 failed.
- `npx tsx scripts/test-guided-vibes.ts` - passed, 99 passed / 0 failed.
- `npx tsx scripts/test-guided-today-path-overview.ts` - passed, 193 passed / 0 failed after rebasing onto the French P7 main update.
- `npx tsx scripts/test-guided-tts-inventory.ts` - passed with existing missing voice-profile warning for the full unscoped inventory.
- `npx tsx scripts/test-guided-audio-playback.ts` - passed, 29 passed / 0 failed.
- `npm run test:guided-today` - passed.
- `npm run build` - passed with existing Vite chunk/dynamic-import warnings.
- `npx eslint src/data/guidedLessons.ts scripts/test-guided-today-data.ts scripts/guided-tts-lessons-dump.ts scripts/guided-tts-inventory.ts scripts/test-guided-tts-inventory.ts` - passed.
- `.venv\Scripts\python.exe -m pytest tests/test_guided_tts_generate.py tests/test_guided_tts_inventory.py tests/test_guided_tts_provider_elevenlabs.py -q` - passed, 49 passed.
- `git diff --check` - passed.

## Next step

Use an authenticated `/today?path=english-a1-practical-1&vibe=bright` session to listen through lessons 1-10, especially Match Pairs chunks, then decide whether to generate Wistful/Sharp Path 1 or add loudness metadata first.
