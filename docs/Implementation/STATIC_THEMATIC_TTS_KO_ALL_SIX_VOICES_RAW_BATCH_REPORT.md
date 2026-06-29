# Korean Static Thematic TTS Six-Voice Raw Batch

Date: 2026-06-30

## Scope

Generated the full Korean static thematic TTS set with raw ElevenLabs provider MP3 bytes only.

- Target language code: `ko`
- Resolved language profile: `Korean1`
- QA status: `ready`
- Post-processing mode: `raw`
- No trimming, silence removal, fade-in, fade-out, LUFS normalization, or peak normalization
- Candidate SQL was not applied, and `qa_status=candidate` was not used

## Voice Plan

| Voice | Voice profile key | Levels | Inventory rows | Provider calls | Ready usage rows | Playback rows | Storage MP3 objects |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Jini | `static_thematic_ko_jini_raw_v1` | 1, 6 | 370 | 365 | 370 | 370 | 365 |
| Yuna | `static_thematic_ko_yuna_raw_v1` | 2, 9 | 370 | 368 | 370 | 370 | 368 |
| Kanna | `static_thematic_ko_kanna_raw_v1` | 3, 8 | 370 | 366 | 370 | 370 | 366 |
| Selly | `static_thematic_ko_selly_raw_v1` | 4, 10 | 370 | 342 | 370 | 370 | 365 |
| Emily | `static_thematic_ko_emily_raw_v1` | 5 | 190 | 189 | 190 | 190 | 189 |
| Sola | `static_thematic_ko_sola_raw_v1` | 7 | 180 | 178 | 180 | 180 | 178 |

Totals:

- Inventory rows: 1,850
- ElevenLabs provider calls: 1,808
- Provider-generated MP3 files: 1,808
- Ready `static_tts_asset_usages` rows: 1,850
- `static_tts_playback` rows: 1,850
- Duplicate playback rows by `target_language_code/category_slug/level_number/concept_id`: 0
- Failed items: 0
- Duration range: 371-1,486 ms

Some Korean rows share identical spoken text and reused existing generated assets instead of creating duplicate MP3 objects. This is why storage object counts can be lower than ready usage/playback row counts.

## Storage Prefixes

- `guided-tts/static/v1/ko/static_thematic_ko_jini_raw_v1/`
- `guided-tts/static/v1/ko/static_thematic_ko_yuna_raw_v1/`
- `guided-tts/static/v1/ko/static_thematic_ko_kanna_raw_v1/`
- `guided-tts/static/v1/ko/static_thematic_ko_selly_raw_v1/`
- `guided-tts/static/v1/ko/static_thematic_ko_emily_raw_v1/`
- `guided-tts/static/v1/ko/static_thematic_ko_sola_raw_v1/`

## Artifacts

- Full inventory: `tmp/static-tts-ko-all.json`
- Split summary: `tmp/static-tts-ko-all-split-summary.json`
- Verification JSON: `tmp/static-tts-ko-six-voices-verification.json`
- Listening HTML: `tmp/static-tts-ko-all-six-voices-raw-listening.html`
- Volume audit: `tmp/static-tts-ko-six-voices-volume-audit.json`

## Notes

The paid batch was run with `--max-provider-calls 200`. One Selly retry process hung after run 1 and was stopped; rerunning the same capped command skipped already committed rows and completed the remaining Selly items without failures.

Generated MP3s and temporary QA artifacts remain untracked under `tmp/` and were not committed.
