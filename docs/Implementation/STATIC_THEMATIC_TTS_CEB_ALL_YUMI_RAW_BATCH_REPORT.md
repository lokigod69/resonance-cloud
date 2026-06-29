# Cebuano/Bisaya Static Thematic TTS - Yumi Raw Batch Report

Date: 2026-06-29

## Status

Completed.

The full Cebuano/Bisaya static thematic inventory was generated in resumable capped batches using raw ElevenLabs provider bytes. The final public playback view exposes one Cebuano row per generated static thematic item for the full-language voice profile key.

## Resolved Voice

- Static language code: `ceb`
- Requested profile: `Bisaya`
- Resolved profile: `Bisaya1`
- Requested voice: `Yumi`
- Resolved voice: `Mayumi`
- Provider/admin language: `Cebuano`
- Provider/admin language code: `fil`
- Full-language voice profile key: `static_thematic_ceb_yumi_raw_v1`
- Provider model: `eleven_flash_v2_5`
- Output format: `mp3_44100_128`
- Postprocess mode: `raw`
- QA status for new full-language usages: `ready`

## Inventory

- Total inventory count: 1,850
- Categories: 19
- Category/level groups: 185
- Duplicate `category_slug + concept_id` rows: 0
- Missing required fields: 0
- Empty `spoken_text` rows: 0
- Non-`ceb` rows: 0

English-looking terms were not edited in this run. They are current static Cebuano/Bisaya terms in the inventory where present.

## Commands

Inventory export:

```powershell
npm --prefix frontend run tts:static:inventory -- --target-language ceb --all-categories --all-levels --out ../tmp/static-tts-ceb-all.json
```

Dry run:

```powershell
python -c "import truststore; truststore.inject_into_ssl(); from dotenv import load_dotenv; load_dotenv(r'D:\CODING\ResonanceTEST\orchestrator\.env'); from scripts.generate_static_thematic_tts import main; raise SystemExit(main())" --inventory tmp/static-tts-ceb-all.json --target-language ceb --voice-profile-key static_thematic_ceb_yumi_raw_v1 --profile-name "Bisaya" --voice-name "Yumi" --postprocess-mode raw --qa-status ready --dry-run --report-out tmp/static-tts-ceb-all-yumi-raw-dry-run-report.json
```

Batch generation template:

```powershell
python -c "import truststore; truststore.inject_into_ssl(); from dotenv import load_dotenv; load_dotenv(r'D:\CODING\ResonanceTEST\orchestrator\.env'); from scripts.generate_static_thematic_tts import main; raise SystemExit(main())" --inventory tmp/static-tts-ceb-all.json --target-language ceb --voice-profile-key static_thematic_ceb_yumi_raw_v1 --profile-name "Bisaya" --voice-name "Yumi" --postprocess-mode raw --qa-status ready --commit-db --allow-provider-calls --max-provider-calls 200 --report-out tmp/static-tts-ceb-all-yumi-raw-batch-001-report.json
```

Batches 002 through 010 were run by the tmp-only helper:

```text
tmp/run_ceb_tts_batches.ps1
```

Activation and listening-index pass:

```powershell
python -c "import truststore; truststore.inject_into_ssl(); from dotenv import load_dotenv; load_dotenv(r'D:\CODING\ResonanceTEST\orchestrator\.env'); from scripts.generate_static_thematic_tts import main; raise SystemExit(main())" --inventory tmp/static-tts-ceb-all.json --target-language ceb --voice-profile-key static_thematic_ceb_yumi_raw_v1 --profile-name "Bisaya" --voice-name "Yumi" --postprocess-mode raw --qa-status ready --commit-db --allow-provider-calls --max-provider-calls 0 --activate-assignment --report-out tmp/static-tts-ceb-all-yumi-raw-final-report.json --listening-html-out tmp/static-tts-ceb-all-yumi-raw-listening.html
```

## Dry Run

- Total items: 1,850
- Existing ready assets: 0
- Existing usages: 0
- Would generate: 1,850
- Generated: 0
- Failed: 0
- Provider calls: 0

Report:

```text
tmp/static-tts-ceb-all-yumi-raw-dry-run-report.json
```

## Batch Results

| Batch | Provider calls | Generated assets | Skipped/linked in pass | Deferred | Failed |
| --- | ---: | ---: | ---: | ---: | ---: |
| 001 | 200 | 200 | 5 | 1,645 | 0 |
| 002 | 200 | 200 | 207 | 1,443 | 0 |
| 003 | 200 | 200 | 415 | 1,235 | 0 |
| 004 | 200 | 200 | 635 | 1,015 | 0 |
| 005 | 200 | 200 | 843 | 807 | 0 |
| 006 | 200 | 200 | 1,061 | 589 | 0 |
| 007 | 200 | 200 | 1,263 | 387 | 0 |
| 008 | 200 | 200 | 1,468 | 182 | 0 |
| 009 | 177 | 177 | 1,673 | 0 | 0 |
| 010 | 0 | 0 | 1,850 | 0 | 0 |

Totals:

- Paid batches: 9
- Total batch passes: 10
- Total ElevenLabs calls: 1,777
- Generated ready asset rows/files under the full-language key: 1,777
- Ready static usage rows under the full-language key: 1,850
- Final verification skipped existing: 1,850
- Failed: 0
- Failed words: none

The generated asset count is lower than the inventory count because duplicate normalized spoken text reuses a single ready asset across multiple concept usages.

## Storage And DB Verification

- Storage prefix: `guided-tts/static/v1/ceb/static_thematic_ceb_yumi_raw_v1/`
- Storage objects at prefix: 1,777
- `guided_tts_assets` ready rows for full-language key: 1,777
- `static_tts_asset_usages` ready rows for full-language key: 1,850
- `static_tts_playback` rows for full-language key: 1,850
- All Cebuano `static_tts_playback` rows after deactivating the old pilot public usages: 1,850
- Old Animals Level 1 pilot playback rows after deactivation: 0
- Duration range: 464 ms to 2,182 ms
- Duration rows measured: 1,777

Verification artifact:

```text
tmp/static-tts-ceb-all-yumi-raw-db-verification.json
```

## Assignment

The language-level assignment was activated:

- `target_language_code`: `ceb`
- `category_slug`: `null`
- `voice_profile_key`: `static_thematic_ceb_yumi_raw_v1`
- `active`: `true`
- `priority`: `100`
- `audio_version`: `1`

The old pilot files were not deleted. Its 10 old `static_tts_asset_usages` rows for `static_thematic_ceb_animals_yumi_raw_v1` were moved from `ready` to `rejected` so `public.static_tts_playback` exposes only one Cebuano row per category/concept.

Old-pilot deactivation artifact:

```text
tmp/static-tts-ceb-old-pilot-deactivation.json
```

## Listening Index

Owner QA index:

```text
tmp/static-tts-ceb-all-yumi-raw-listening.html
```

The index groups rows by category, level, concept ID, visible term, spoken text, and audio player.

## Frontend Playback

Library/category playback remains wired for Cebuano/Bisaya static audio:

- Static level pages query `public.static_tts_playback` for `target_language_code=ceb`, category, level, concept IDs, and `static_thematic_ceb_yumi_raw_v1`.
- Playback uses the vocabulary language, not the helper language.
- Cards and detail modals expose a speaker action when audio exists.
- Browser playback uses existing public URLs and does not call ElevenLabs.
- The shared hook keeps one static audio clip active at a time.

## Import-To-Deck Reuse

Static category import reuse remains wired:

- The import path keeps using the no-credit `submit_curriculum_import` RPC.
- Static audio public URLs are attached to imported words when available.
- Source metadata preserves category, level, concept ID, target language, static public URL, and static voice profile key.
- Imported static deck words can reuse the static audio URL instead of falling back to generated deck TTS when static audio is present.

## Checks

Run before completion:

```text
git diff --check
git diff --cached --check
D:\CODING\ResonanceTEST\orchestrator\.venv\Scripts\python.exe -m compileall scripts\generate_static_thematic_tts.py
D:\CODING\ResonanceTEST\orchestrator\.venv\Scripts\python.exe -m pytest tests\test_static_thematic_tts.py -q
npm --prefix frontend run test:static-thematic-tts
npm --prefix frontend run test:vocabulary-library
npm exec eslint -- scripts/export-static-thematic-tts-inventory.ts scripts/test-static-thematic-tts.ts scripts/test-static-library-import.ts src/components/common/CardDetailModal.tsx src/hooks/useStaticThematicAudio.ts src/lib/curriculumDeckBridge.ts src/lib/staticThematicAudio.ts src/pages/categories/LevelDetailPage.tsx
npm exec vite build
```

`npm run build` was not used.

## Candidate Flow

- No candidate SQL migration was applied.
- `qa_status=candidate` was not used.
- New full-language generation used `qa_status=ready`.

## Known Limitations

- Browser UI verification was not run with an authenticated app session in this batch. The library/import behavior was verified through the implemented helper tests and direct `static_tts_playback` data checks.
- Duration range is counted on unique generated assets, not all 1,850 usage rows, because duplicate spoken text can share one asset.
