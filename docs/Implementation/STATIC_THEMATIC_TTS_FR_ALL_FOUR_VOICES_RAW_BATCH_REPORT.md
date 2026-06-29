# French Static Thematic TTS Raw Batch Report

Date: 2026-06-29

## Preflight

- German original local commit `4b1778d32d3851b8257919c16ccefde05dccd520` exists locally.
- German rebased commit `4e1baaf8b50cfac964feb006f92e1c2214ae56e7` is on `origin/main`.
- Spanish commit `d8de95464f978792f08b1db6371a16107c55622c` was previously pushed to `origin/main`.
- No Spanish generation process was active before French generation started.

## Scope

- Target language code: `fr`
- Total inventory count: `1850`
- QA status: `ready`
- Postprocess mode: `raw`
- Provider audio handling: raw ElevenLabs MP3 bytes only. No trimming, silence removal, fade-in, fade-out, LUFS normalization, peak normalization, amplification, or other post-processing was applied.
- Candidate SQL migration: not applied.

## Resolved Admin Values

Profile:

- Requested/resolved profile: `French_Test`

Voices:

- `Lilly`: French `fr`, provider voice ID ending `bHl1`
- `Stephyra`: French `fr`, notes `nice, cute`, provider voice ID ending `DEQO`
- `Guilamme`: French `fr`, notes `bright, friendly, normal`, provider voice ID ending `ECOD`
- `Adam`: French `fr`, notes `normal`, provider voice ID ending `pDwE`

The DB stores `Guilamme`, so generation used that exact voice name while keeping the normalized profile key `static_thematic_fr_guillaume_raw_v1`.

## Deterministic Voice Plan

- `Lilly`: levels `1`, `5`, `8`
- `Stephyra`: levels `3`, `6`, `10`
- `Guilamme`: levels `2`, `7`
- `Adam`: levels `4`, `9`

Assigned inventory counts:

- `Lilly`: `560`
- `Stephyra`: `550`
- `Guilamme`: `370`
- `Adam`: `370`

## Generation Results

| Voice | Voice profile key | Generated | Preexisting ready/reused | Failed | ElevenLabs calls |
| --- | --- | ---: | ---: | ---: | ---: |
| Lilly | `static_thematic_fr_lilly_raw_v1` | 550 | 10 | 0 | 550 |
| Stephyra | `static_thematic_fr_stephyra_raw_v1` | 543 | 7 | 0 | 543 |
| Guilamme | `static_thematic_fr_guillaume_raw_v1` | 368 | 2 | 0 | 368 |
| Adam | `static_thematic_fr_adam_raw_v1` | 361 | 9 | 0 | 361 |

Total ElevenLabs calls: `1822`

Failed words: none.

## Storage Prefixes

- `guided-tts/static/v1/fr/static_thematic_fr_lilly_raw_v1/`
- `guided-tts/static/v1/fr/static_thematic_fr_stephyra_raw_v1/`
- `guided-tts/static/v1/fr/static_thematic_fr_guillaume_raw_v1/`
- `guided-tts/static/v1/fr/static_thematic_fr_adam_raw_v1/`

All playback URLs verified against the expected prefixes.

Storage object counts:

- `static_thematic_fr_lilly_raw_v1`: `550`
- `static_thematic_fr_stephyra_raw_v1`: `543`
- `static_thematic_fr_guillaume_raw_v1`: `368`
- `static_thematic_fr_adam_raw_v1`: `361`

Object counts are lower than ready usage counts where duplicate French spoken text reused an existing ready asset.

## Database Verification

`static_tts_asset_usages` ready rows:

- `static_thematic_fr_lilly_raw_v1`: `560`
- `static_thematic_fr_stephyra_raw_v1`: `550`
- `static_thematic_fr_guillaume_raw_v1`: `370`
- `static_thematic_fr_adam_raw_v1`: `370`
- Total: `1850`

`static_tts_playback` rows:

- `static_thematic_fr_lilly_raw_v1`: `560`
- `static_thematic_fr_stephyra_raw_v1`: `550`
- `static_thematic_fr_guillaume_raw_v1`: `370`
- `static_thematic_fr_adam_raw_v1`: `370`
- Total: `1850`

Duplicate playback query result: `0` duplicate `(category_slug, level_number, concept_id)` groups.

## Audio Audit

- Duration range: `371` to `2229` ms
- MP3 byte-size range: `7149` to `36824` bytes
- Audit path: `tmp/static-tts-fr-four-voices-volume-audit.json`

The audit uses generator-reported MP3 durations and byte sizes. It does not rewrite or normalize audio.

## Artifacts

- Inventory: `tmp/static-tts-fr-all.json`
- Split summary: `tmp/static-tts-fr-all-split-summary.json`
- Batch summary: `tmp/static-tts-fr-four-voices-raw-batch-summary.jsonl`
- Verification report: `tmp/static-tts-fr-four-voices-verification.json`
- Listening HTML: `tmp/static-tts-fr-all-four-voices-raw-listening.html`
- Volume audit: `tmp/static-tts-fr-four-voices-volume-audit.json`

## Playback Wiring

Frontend static thematic playback now includes all four French raw profile keys for `fr`. Because each French concept is generated under exactly one deterministic level-assigned voice key and duplicate playback groups verified as zero, library playback and import-to-deck reuse resolve one ready static URL per French concept.

## Known Limitations

- The listening HTML is a temporary QA artifact under `tmp/` and is not committed.
- The volume audit is metadata-based; no local MP3 files were committed or rewritten for waveform analysis.
- Storage object counts represent unique generated/reused MP3 objects under each prefix; ready usage/playback counts represent the full concept coverage.

## Next Language Rollout Recommendation

For the next full-language static thematic rollout, keep the same sequence: remote safety check, isolated branch from `origin/main`, inventory export, deterministic split validation, zero-call dry-runs per voice, capped paid batches, Supabase usage/playback verification, duplicate playback verification, storage prefix listing, and temporary listening HTML generation before committing only code and documentation.
