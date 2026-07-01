# Polish Static Thematic TTS Four-Voice Raw Batch

Date: 2026-07-01

## Scope

Generated the full Polish static thematic TTS set with raw ElevenLabs provider MP3 bytes only.

- Target language code: `pl`
- Resolved language profile: none found in admin, so no `--profile-name` was used
- QA status: `ready`
- Post-processing mode: `raw`
- No trimming, silence removal, fade-in, fade-out, LUFS normalization, peak normalization, amplification, or other post-processing
- Candidate SQL was not applied, and `qa_status=candidate` was not used

## Resolved Admin Voices

| Voice | Admin language | Admin language code | Notes | Provider voice ID suffix |
| --- | --- | --- | --- | --- |
| Maria | Polish | `pl` | warm, clear | `8XUV` |
| Marta | Polish | `pl` | cute | `uSy6` |
| Rysard | Polish | `pl` | normal | `lAhC` |
| Wojech | Polish | `pl` | low, calm | `VRYh` |

The DB stores `Rysard` and `Wojech`, so generation used those exact voice names while keeping the requested normalized profile keys.

## Voice Plan

| Voice | Voice profile key | Levels | Inventory rows | Generated MP3 objects | Ready usage rows | Playback rows | Reused/skipped rows |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Maria | `static_thematic_pl_maria_raw_v1` | 1, 5, 8 | 560 | 544 | 560 | 560 | 16 |
| Marta | `static_thematic_pl_marta_raw_v1` | 3, 6, 10 | 550 | 545 | 550 | 550 | 5 |
| Rysard | `static_thematic_pl_rysard_raw_v1` | 2, 7 | 370 | 364 | 370 | 370 | 6 |
| Wojech | `static_thematic_pl_wojech_raw_v1` | 4, 9 | 370 | 364 | 370 | 370 | 6 |

Totals:

- Inventory rows: `1850`
- Inferred ElevenLabs provider calls from stored MP3 objects: `1817`
- Provider-generated MP3 objects: `1817`
- Ready `static_tts_asset_usages` rows: `1850`
- `static_tts_playback` rows: `1850`
- Duplicate playback rows by `target_language_code/category_slug/level_number/concept_id`: `0`
- Failed items: `0`
- Duration range: `464` to `2554` ms
- MP3 byte-size range: `8403` to `41839` bytes

Some Polish rows share identical spoken text and reused existing ready assets instead of creating duplicate MP3 objects. This is why storage object counts are lower than ready usage/playback row counts.

## Batch Notes

All completed report-backed runs had `failed: 0`.

The first Wojech process committed `185` ready usage rows but hung before writing its report. It was stopped after it stayed idle for about three hours with an empty error log. The same split was resumed with skip-existing behavior; the resume report skipped the committed rows and generated the remaining rows. Final DB, playback, and storage verification is based on Supabase state rather than only report totals.

Reported provider calls from completed reports: `1633`.
Unreported generated MP3 objects inferred from storage for the interrupted Wojech run: `184`.
Inferred total provider calls/storage MP3 objects: `1817`.

## Storage Prefixes

- `guided-tts/static/v1/pl/static_thematic_pl_maria_raw_v1/`
- `guided-tts/static/v1/pl/static_thematic_pl_marta_raw_v1/`
- `guided-tts/static/v1/pl/static_thematic_pl_rysard_raw_v1/`
- `guided-tts/static/v1/pl/static_thematic_pl_wojech_raw_v1/`

All playback URLs verified against the expected prefixes.

## Database Verification

`static_tts_asset_usages` ready rows:

- `static_thematic_pl_maria_raw_v1`: `560`
- `static_thematic_pl_marta_raw_v1`: `550`
- `static_thematic_pl_rysard_raw_v1`: `370`
- `static_thematic_pl_wojech_raw_v1`: `370`
- Total: `1850`

`static_tts_playback` rows:

- `static_thematic_pl_maria_raw_v1`: `560`
- `static_thematic_pl_marta_raw_v1`: `550`
- `static_thematic_pl_rysard_raw_v1`: `370`
- `static_thematic_pl_wojech_raw_v1`: `370`
- Total: `1850`

Duplicate playback query result: `0` duplicate `(target_language_code, category_slug, level_number, concept_id)` groups.

## Audio Audit

- Overall duration range: `464` to `2554` ms
- Maria duration range: `464` to `2229` ms
- Marta duration range: `510` to `2507` ms
- Rysard duration range: `510` to `2554` ms
- Wojech duration range: `510` to `1904` ms
- Audit path: `tmp/static-tts-pl-four-voices-volume-audit.json`

The audit uses DB/storage metadata. It does not rewrite, normalize, or otherwise modify audio.

## Artifacts

- Full inventory: `tmp/static-tts-pl-all.json`
- Split summary: `tmp/static-tts-pl-all-split-summary.json`
- Verification JSON: `tmp/static-tts-pl-four-voices-verification.json`
- Listening HTML: `tmp/static-tts-pl-all-four-voices-raw-listening.html`
- Volume audit: `tmp/static-tts-pl-four-voices-volume-audit.json`

Batch reports:

- `tmp/static-tts-pl-all-maria-raw-batch-001-report.json`
- `tmp/static-tts-pl-all-maria-raw-batch-002-report.json`
- `tmp/static-tts-pl-all-maria-raw-batch-003-report.json`
- `tmp/static-tts-pl-all-marta-raw-batch-001-report.json`
- `tmp/static-tts-pl-all-marta-raw-batch-002-report.json`
- `tmp/static-tts-pl-all-marta-raw-batch-003-report.json`
- `tmp/static-tts-pl-all-rysard-raw-batch-001-report.json`
- `tmp/static-tts-pl-all-rysard-raw-batch-002-report.json`
- `tmp/static-tts-pl-all-wojech-raw-batch-001-resume-report.json`

## Playback Wiring

Frontend static thematic playback now includes all four Polish raw profile keys for `pl`. Helper-level tests cover Polish inventory export and Polish profile-key playback query construction. Because each Polish concept is generated under exactly one deterministic level-assigned voice key and duplicate playback groups verified as zero, library playback and import-to-deck reuse resolve one ready static URL per Polish concept.

Browser-auth manual playback was not run in this batch; verification was done at helper/data level and through Supabase playback rows. Browser playback should not call ElevenLabs because the frontend query resolves `static_tts_playback` URLs for the four Polish static profile keys.

## Known Limitations

- The listening HTML is a temporary QA artifact under `tmp/` and is not committed.
- The volume audit is metadata-based; no local MP3 files were committed or rewritten for waveform analysis.
- One Wojech process was interrupted before report writing, so total provider calls are inferred from final storage object counts.
- Storage object counts represent unique generated/reused MP3 objects under each prefix; ready usage/playback counts represent the full concept coverage.

## Next Language Rollout Recommendation

For the next full-language static thematic rollout, keep the same sequence: remote safety check, isolated branch from `origin/main`, inventory export, deterministic split validation, zero-call dry-runs per voice, capped paid batches, Supabase usage/playback verification, duplicate playback verification, storage prefix listing, and temporary listening HTML generation before committing only code and documentation.
