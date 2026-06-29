# German Static Thematic TTS Raw Batch Report

Date: 2026-06-29

## Scope

- Target language code: `de`
- Total inventory count: `1850`
- QA status: `ready`
- Postprocess mode: `raw`
- Provider audio handling: raw ElevenLabs MP3 bytes only. No trimming, silence removal, fade-in, fade-out, LUFS normalization, peak normalization, amplification, or other post-processing was applied.
- Candidate SQL migration: not applied.

## Resolved Admin Values

Profile:

- Requested/resolved profile: `German_AB1`

Voices:

- `Laura`: German `de`, provider voice ID ending `Bqxb`
- `William`: German `de`, provider voice ID ending `HdEu`
- `Helmut`: German `de`, provider voice ID ending `C5A1`
- `Enniah`: German `de`, provider voice ID ending `1oEY`

## Deterministic Voice Plan

- `Laura`: levels `1`, `3`, `6`, `8`
- `William`: levels `2`, `7`, `10`
- `Helmut`: levels `4`, `9`
- `Enniah`: level `5`

Assigned inventory counts:

- `Laura`: `740`
- `William`: `550`
- `Helmut`: `370`
- `Enniah`: `190`

## Generation Results

| Voice | Voice profile key | Generated | Skipped existing/final ready | Failed | ElevenLabs calls |
| --- | --- | ---: | ---: | ---: | ---: |
| Laura | `static_thematic_de_laura_raw_v1` | 721 | 740 | 0 | 721 |
| William | `static_thematic_de_william_raw_v1` | 545 | 550 | 0 | 545 |
| Helmut | `static_thematic_de_helmut_raw_v1` | 366 | 370 | 0 | 366 |
| Enniah | `static_thematic_de_enniah_raw_v1` | 186 | 190 | 0 | 186 |

Total ElevenLabs calls: `1818`

Failed words: none.

## Storage Prefixes

- `guided-tts/static/v1/de/static_thematic_de_laura_raw_v1/`
- `guided-tts/static/v1/de/static_thematic_de_william_raw_v1/`
- `guided-tts/static/v1/de/static_thematic_de_helmut_raw_v1/`
- `guided-tts/static/v1/de/static_thematic_de_enniah_raw_v1/`

All playback URLs verified against the expected prefixes.

## Database Verification

`static_tts_asset_usages` ready rows:

- `static_thematic_de_laura_raw_v1`: `740`
- `static_thematic_de_william_raw_v1`: `550`
- `static_thematic_de_helmut_raw_v1`: `370`
- `static_thematic_de_enniah_raw_v1`: `190`
- Total: `1850`

`static_tts_playback` rows:

- `static_thematic_de_laura_raw_v1`: `740`
- `static_thematic_de_william_raw_v1`: `550`
- `static_thematic_de_helmut_raw_v1`: `370`
- `static_thematic_de_enniah_raw_v1`: `190`
- Total: `1850`

Duplicate playback query result: `0` duplicate `(category_slug, level_number, concept_id)` groups.

## Audio Audit

- Duration range: `417` to `3715` ms
- MP3 byte-size range: `7567` to `60648` bytes
- Audit path: `tmp/static-tts-de-four-voices-volume-audit.json`

The audit uses generator-reported MP3 durations and byte sizes. It does not rewrite or normalize audio.

## Artifacts

- Inventory: `tmp/static-tts-de-all.json`
- Split summary: `tmp/static-tts-de-all-split-summary.json`
- Batch summary: `tmp/static-tts-de-four-voices-raw-batch-summary.jsonl`
- Verification report: `tmp/static-tts-de-four-voices-verification.json`
- Listening HTML: `tmp/static-tts-de-all-four-voices-raw-listening.html`
- Volume audit: `tmp/static-tts-de-four-voices-volume-audit.json`

## Playback Wiring

Frontend static thematic playback now includes all four German raw profile keys for `de`. Because each German concept is generated under exactly one deterministic level-assigned voice key and duplicate playback groups verified as zero, library playback and import-to-deck reuse resolve one ready static URL per German concept.

## Known Limitations

- The listening HTML is a temporary QA artifact under `tmp/` and is not committed.
- The volume audit is metadata-based; no local MP3 files were committed or rewritten for waveform analysis.

## Next Language Rollout Recommendation

For the next full-language static thematic rollout, keep the same sequence: inventory export, deterministic split validation, zero-call dry-runs per voice, capped paid batches, Supabase usage/playback verification, duplicate playback verification, and temporary listening HTML generation before committing only code and documentation.
