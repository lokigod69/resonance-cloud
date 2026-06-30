# Portuguese Static Thematic TTS Three-Voice Raw Batch

Date: 2026-07-01

## Scope

Generated the full Portuguese static thematic TTS set with raw ElevenLabs provider MP3 bytes only.

- Target language code: `pt`
- Resolved language profile: none found in admin, so no `--profile-name` was used
- QA status: `ready`
- Post-processing mode: `raw`
- No trimming, silence removal, fade-in, fade-out, LUFS normalization, peak normalization, amplification, or other post-processing
- Candidate SQL was not applied, and `qa_status=candidate` was not used

## Resolved Admin Voices

| Voice | Admin language | Admin language code | Notes | Provider voice ID suffix |
| --- | --- | --- | --- | --- |
| Raquel | Portuguese | `pt` | warm, friendly | `hCYD` |
| Carla | Portuguese | `pt` | cool, hot | `77mW` |
| Lair | Portuguese | `pt` | clear, warm | `gjik` |

## Voice Plan

| Voice | Voice profile key | Levels | Inventory rows | Provider calls | Ready usage rows | Playback rows | Storage MP3 objects |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Raquel | `static_thematic_pt_raquel_raw_v1` | 1, 4, 7, 10 | 740 | 714 | 740 | 740 | 714 |
| Carla | `static_thematic_pt_carla_raw_v1` | 3, 5, 8 | 560 | 542 | 560 | 560 | 542 |
| Lair | `static_thematic_pt_lair_raw_v1` | 2, 6, 9 | 550 | 540 | 550 | 550 | 540 |

Totals:

- Inventory rows: `1850`
- ElevenLabs provider calls: `1796`
- Provider-generated MP3 files: `1796`
- Preexisting ready/reused rows: `54`
- Ready `static_tts_asset_usages` rows: `1850`
- `static_tts_playback` rows: `1850`
- Duplicate playback rows by `target_language_code/category_slug/level_number/concept_id`: `0`
- Failed items: `0`
- Duration range: `371` to `1857` ms
- MP3 byte-size range: `7149` to `30973` bytes

Some Portuguese rows share identical spoken text and reused existing ready assets instead of creating duplicate MP3 objects. This is why storage object counts are lower than ready usage/playback row counts.

## Storage Prefixes

- `guided-tts/static/v1/pt/static_thematic_pt_raquel_raw_v1/`
- `guided-tts/static/v1/pt/static_thematic_pt_carla_raw_v1/`
- `guided-tts/static/v1/pt/static_thematic_pt_lair_raw_v1/`

All playback URLs verified against the expected prefixes.

## Artifacts

- Full inventory: `tmp/static-tts-pt-all.json`
- Split summary: `tmp/static-tts-pt-all-split-summary.json`
- Batch summary: `tmp/static-tts-pt-three-voices-raw-batch-summary.jsonl`
- Verification JSON: `tmp/static-tts-pt-three-voices-verification.json`
- Listening HTML: `tmp/static-tts-pt-all-three-voices-raw-listening.html`
- Volume audit: `tmp/static-tts-pt-three-voices-volume-audit.json`

Batch reports:

- `tmp/static-tts-pt-all-raquel-raw-batch-001-report.json`
- `tmp/static-tts-pt-all-raquel-raw-batch-002-report.json`
- `tmp/static-tts-pt-all-raquel-raw-batch-003-report.json`
- `tmp/static-tts-pt-all-raquel-raw-batch-004-report.json`
- `tmp/static-tts-pt-all-carla-raw-batch-001-report.json`
- `tmp/static-tts-pt-all-carla-raw-batch-002-report.json`
- `tmp/static-tts-pt-all-carla-raw-batch-003-report.json`
- `tmp/static-tts-pt-all-lair-raw-batch-001-report.json`
- `tmp/static-tts-pt-all-lair-raw-batch-002-report.json`
- `tmp/static-tts-pt-all-lair-raw-batch-003-report.json`

## Playback Wiring

Frontend static thematic playback now includes all three Portuguese raw profile keys for `pt`. The helper-level tests cover Portuguese profile selection and inventory export. Because each Portuguese concept is generated under exactly one deterministic level-assigned voice key and duplicate playback groups verified as zero, library playback and import-to-deck reuse resolve one ready static URL per Portuguese concept.

## Known Limitations

- The listening HTML is a temporary QA artifact under `tmp/` and is not committed.
- The volume audit is metadata-based; no local MP3 files were committed or rewritten for waveform analysis.
- Storage object counts represent unique generated/reused MP3 objects under each prefix; ready usage/playback counts represent the full concept coverage.
