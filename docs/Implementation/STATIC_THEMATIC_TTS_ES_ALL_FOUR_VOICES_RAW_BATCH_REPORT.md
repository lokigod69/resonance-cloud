# Spanish Static Thematic TTS Raw Batch Report

Date: 2026-06-29

## Preflight

- German local commit `4b1778d32d3851b8257919c16ccefde05dccd520` existed locally before Spanish work.
- That exact SHA was not on `origin/main` because the TTS chain needed to be rebased onto current `origin/main`.
- The rebased German-equivalent commit `4e1baaf8b50cfac964feb006f92e1c2214ae56e7` was pushed to `origin/main` before Spanish generation.

## Scope

- Target language code: `es`
- Total inventory count: `1850`
- QA status: `ready`
- Postprocess mode: `raw`
- Provider audio handling: raw ElevenLabs MP3 bytes only. No trimming, silence removal, fade-in, fade-out, LUFS normalization, peak normalization, amplification, or other post-processing was applied.
- Candidate SQL migration: not applied.

## Resolved Admin Values

Profile:

- Requested/resolved profile: `Spanish1`

Voices:

- `Lia`: Spanish `es`, notes `columbiana`, provider voice ID ending `zaGn`
- `Veronica`: Spanish `es`, notes `soft, calm, cute`, provider voice ID ending `wwq5`
- `El Farao`: Spanish `es`, notes `deep, calm, clear`, provider voice ID ending `MFQl`
- `David`: Spanish `es`, notes `young, fast, clear`, provider voice ID ending `NYqZ`

## Deterministic Voice Plan

- `Lia`: levels `1`, `5`, `8`
- `Veronica`: levels `3`, `6`, `10`
- `El Farao`: levels `2`, `7`
- `David`: levels `4`, `9`

Assigned inventory counts:

- `Lia`: `560`
- `Veronica`: `550`
- `El Farao`: `370`
- `David`: `370`

## Generation Results

| Voice | Voice profile key | Generated | Preexisting ready/reused | Failed | ElevenLabs calls |
| --- | --- | ---: | ---: | ---: | ---: |
| Lia | `static_thematic_es_lia_raw_v1` | 541 | 19 | 0 | 541 |
| Veronica | `static_thematic_es_veronica_raw_v1` | 541 | 9 | 0 | 541 |
| El Farao | `static_thematic_es_el_farao_raw_v1` | 365 | 5 | 0 | 365 |
| David | `static_thematic_es_david_raw_v1` | 361 | 9 | 0 | 361 |

Total ElevenLabs calls: `1808`

Failed words: none.

## Storage Prefixes

- `guided-tts/static/v1/es/static_thematic_es_lia_raw_v1/`
- `guided-tts/static/v1/es/static_thematic_es_veronica_raw_v1/`
- `guided-tts/static/v1/es/static_thematic_es_el_farao_raw_v1/`
- `guided-tts/static/v1/es/static_thematic_es_david_raw_v1/`

All playback URLs verified against the expected prefixes.

Storage object counts:

- `static_thematic_es_lia_raw_v1`: `541`
- `static_thematic_es_veronica_raw_v1`: `541`
- `static_thematic_es_el_farao_raw_v1`: `365`
- `static_thematic_es_david_raw_v1`: `361`

Object counts are lower than ready usage counts where duplicate Spanish spoken text reused an existing ready asset.

## Database Verification

`static_tts_asset_usages` ready rows:

- `static_thematic_es_lia_raw_v1`: `560`
- `static_thematic_es_veronica_raw_v1`: `550`
- `static_thematic_es_el_farao_raw_v1`: `370`
- `static_thematic_es_david_raw_v1`: `370`
- Total: `1850`

`static_tts_playback` rows:

- `static_thematic_es_lia_raw_v1`: `560`
- `static_thematic_es_veronica_raw_v1`: `550`
- `static_thematic_es_el_farao_raw_v1`: `370`
- `static_thematic_es_david_raw_v1`: `370`
- Total: `1850`

Duplicate playback query result: `0` duplicate `(category_slug, level_number, concept_id)` groups.

## Audio Audit

- Duration range: `464` to `3854` ms
- MP3 byte-size range: `8403` to `62737` bytes
- Audit path: `tmp/static-tts-es-four-voices-volume-audit.json`

The audit uses generator-reported MP3 durations and byte sizes. It does not rewrite or normalize audio.

## Artifacts

- Inventory: `tmp/static-tts-es-all.json`
- Split summary: `tmp/static-tts-es-all-split-summary.json`
- Batch summary: `tmp/static-tts-es-four-voices-raw-batch-summary.jsonl`
- Verification report: `tmp/static-tts-es-four-voices-verification.json`
- Listening HTML: `tmp/static-tts-es-all-four-voices-raw-listening.html`
- Volume audit: `tmp/static-tts-es-four-voices-volume-audit.json`

## Playback Wiring

Frontend static thematic playback now includes all four Spanish raw profile keys for `es`. Because each Spanish concept is generated under exactly one deterministic level-assigned voice key and duplicate playback groups verified as zero, library playback and import-to-deck reuse resolve one ready static URL per Spanish concept.

## Known Limitations

- The listening HTML is a temporary QA artifact under `tmp/` and is not committed.
- The volume audit is metadata-based; no local MP3 files were committed or rewritten for waveform analysis.
- Storage object counts represent unique generated/reused MP3 objects under each prefix; ready usage/playback counts represent the full concept coverage.

## Next Language Rollout Recommendation

For the next full-language static thematic rollout, keep the same sequence: remote safety check, isolated branch from `origin/main`, inventory export, deterministic split validation, zero-call dry-runs per voice, capped paid batches, Supabase usage/playback verification, duplicate playback verification, storage prefix listing, and temporary listening HTML generation before committing only code and documentation.
