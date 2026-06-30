# Italian Static Thematic TTS Three-Voice Raw Batch

Date: 2026-06-30

## Scope

Generated the full Italian static thematic TTS inventory with raw ElevenLabs provider MP3 bytes.

- Target language code: `it`
- Resolved language profile: `Italian_2`
- QA status: `ready`
- Post-processing mode: `raw`
- No trimming, silence removal, fade-in, fade-out, LUFS normalization, peak normalization, amplification, or other audio post-processing
- Candidate SQL was not applied, and `qa_status=candidate` was not used

## Resolved Admin Voices

| Voice | DB language | DB language code | Notes | Provider ID last 4 | Voice profile key |
| --- | --- | --- | --- | --- | --- |
| Marco | Italian | `it` | deep, calm, clear | `bRN8` | `static_thematic_it_marco_raw_v1` |
| Rosanna | Italian | `it` | soothing, calm, good | `P4iP` | `static_thematic_it_rosanna_raw_v1` |
| Samanta | Italian | `it` | smokey | `2X7F` | `static_thematic_it_samanta_raw_v1` |

## Voice Plan

Deterministic level assignment:

- Marco: levels 2, 4, 7, 10
- Rosanna: levels 1, 5, 8
- Samanta: levels 3, 6, 9

| Voice | Assigned rows | Provider calls / generated MP3s | Reused or skipped existing | Failed rows | Ready usage rows | Playback rows | Storage MP3 objects |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Marco | 740 | 727 | 13 | 0 | 740 | 740 | 727 |
| Rosanna | 560 | 547 | 13 | 0 | 560 | 560 | 547 |
| Samanta | 550 | 543 | 7 | 0 | 550 | 550 | 543 |

Totals:

- Inventory rows: 1,850
- ElevenLabs provider calls: 1,817
- Provider-generated MP3 files: 1,817
- Reused or skipped existing rows: 33
- Ready `static_tts_asset_usages` rows: 1,850
- `static_tts_playback` rows: 1,850
- Duplicate playback rows by `target_language_code/category_slug/level_number/concept_id`: 0
- Failed rows: 0
- Duration range: 417-4,597 ms

Some rows share identical Italian spoken text and reused existing generated assets instead of creating duplicate MP3 objects. This is why storage object counts are lower than ready usage/playback row counts.

## Storage Prefixes

- `guided-tts/static/v1/it/static_thematic_it_marco_raw_v1/`
- `guided-tts/static/v1/it/static_thematic_it_rosanna_raw_v1/`
- `guided-tts/static/v1/it/static_thematic_it_samanta_raw_v1/`

## Verification

- Full inventory exported to `tmp/static-tts-it-all.json`.
- Split validation written to `tmp/static-tts-it-all-split-summary.json`.
- Dry-run reports:
  - `tmp/static-tts-it-all-marco-raw-dry-run-report.json`
  - `tmp/static-tts-it-all-rosanna-raw-dry-run-report.json`
  - `tmp/static-tts-it-all-samanta-raw-dry-run-report.json`
- Paid batch summary: `tmp/static-tts-it-three-voices-raw-batch-summary.jsonl`
- Final verification JSON: `tmp/static-tts-it-three-voices-verification.json`
- Listening HTML: `tmp/static-tts-it-all-three-voices-raw-listening.html`
- Volume audit: `tmp/static-tts-it-three-voices-volume-audit.json`

`static_tts_playback` exposes all 1,850 Italian rows. The duplicate playback check returned zero rows.

## Playback And Import Reuse

Italian library playback is wired to query all three Italian full-batch profile keys:

- `static_thematic_it_marco_raw_v1`
- `static_thematic_it_rosanna_raw_v1`
- `static_thematic_it_samanta_raw_v1`

The frontend static thematic helpers continue to query `static_tts_playback`; the browser does not call ElevenLabs. Helper-level tests verify static library playback lookup and imported static library reuse paths through `npm --prefix frontend run test:static-thematic-tts` and `npm --prefix frontend run test:vocabulary-library`.

## Volume Audit

No audio was modified. The audit records duration and raw file-size ranges only:

- Marco: 417-4,597 ms, 7,567-74,440 bytes
- Rosanna: 510-1,439 ms, 9,239-24,285 bytes
- Samanta: 464-2,136 ms, 8,403-35,152 bytes

Marco has the widest range because some assigned Italian static terms are longer. Any normalization decision should be made later from listening review, not from this raw batch.

## Known Limitations

- Browser-authenticated playback was not manually exercised in this batch; verification was performed at data/helper level plus public playback view row checks.
- Temporary inventory, report, listening, and audit artifacts remain under `tmp/` and are not committed.
- This branch is isolated and pushed for review; it is not merged to `main`.

## Next Rollout Recommendation

Keep the same sequence for the next language: isolated branch from `origin/main`, voice/admin resolution, all-category inventory export, deterministic split validation, zero-call dry-runs, capped paid batches, Supabase usage/playback verification, duplicate playback verification, storage prefix listing, listening HTML generation, and commit only code/docs.
