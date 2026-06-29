# Cebuano/Bisaya Static Thematic TTS - Yumi Raw Batch Report

Date: 2026-06-29

## Status

Blocked before paid generation.

The full Cebuano/Bisaya static thematic inventory exports successfully and the dry run completes, but the dry run reports 1,850 would-generate rows. The approved cap for this run is 1,200 ElevenLabs calls, so paid generation was not run.

## Resolved Voice

- Static language code: `ceb`
- Requested profile: `Bisaya`
- Resolved profile: `Bisaya1`
- Requested voice: `Yumi`
- Resolved voice: `Mayumi`
- Provider/admin language: `Cebuano`
- Provider/admin language code: `fil`
- Full batch voice profile key: `static_thematic_ceb_yumi_raw_v1`
- Postprocess mode: `raw`
- QA status: `ready`

## Commands Run

```powershell
npm --prefix frontend run tts:static:inventory -- --target-language ceb --all-categories --all-levels --out ../tmp/static-tts-ceb-all.json
```

```powershell
python -c "import truststore; truststore.inject_into_ssl(); from dotenv import load_dotenv; load_dotenv(r'D:\CODING\ResonanceTEST\orchestrator\.env'); from scripts.generate_static_thematic_tts import main; raise SystemExit(main())" --inventory tmp/static-tts-ceb-all.json --target-language ceb --voice-profile-key static_thematic_ceb_yumi_raw_v1 --profile-name "Bisaya" --voice-name "Yumi" --postprocess-mode raw --qa-status ready --dry-run --report-out tmp/static-tts-ceb-all-yumi-raw-dry-run-report.json
```

The dry-run stdout was redirected to:

```text
tmp/static-tts-ceb-all-yumi-raw-dry-run-stdout.txt
```

## Inventory

- Total inventory count: 1,850
- Categories: 19
- Duplicate target/category/concept keys: 0
- Empty or missing required fields: 0
- Fallback Cebuano rows: 0
- Same-as-English Cebuano rows: 627

The same-as-English rows are explicit static translation data, not fallback rows.

## Dry Run

- Mode: `dry-run`
- Total items: 1,850
- Existing ready assets: 0
- Existing usages: 0
- Skipped existing: 0
- Would generate: 1,850
- Generated: 0
- Failed: 0
- Provider calls: 0
- Failed words: none

Dry-run report:

```text
tmp/static-tts-ceb-all-yumi-raw-dry-run-report.json
```

## Paid Generation

Paid generation was not run.

Reason: `would_generate=1850` exceeds the explicit `--max-provider-calls 1200` cap and the plan says to stop if the dry run detects more than 1,200 would-generate calls.

Expected storage prefix when approved:

```text
guided-tts/static/v1/ceb/static_thematic_ceb_yumi_raw_v1/
```

Listening HTML was not created because paid generation did not run. Expected path after approved generation:

```text
tmp/static-tts-ceb-all-yumi-raw-listening.html
```

Duration range is not available because no new audio was generated in this batch.

## Candidate Flow

- `qa_status=candidate` is no longer accepted by the static generator.
- The unapplied migration `frontend/supabase/migrations/20260629100000_static_tts_candidate_qa_status.sql` was removed from the repo.
- No SQL migration was applied.
- Generation commands use `qa_status=ready`.

## Frontend Wiring

Library/category playback was wired for Cebuano/Bisaya static audio:

- Static level pages query `public.static_tts_playback` using `target_language_code=ceb`, `category_slug`, `level_number`, concept IDs, and `static_thematic_ceb_yumi_raw_v1`.
- The query is independent of helper/base language.
- Cards show a speaker button when audio exists.
- Detail modals expose a speaker action when audio exists.
- Playback uses browser `Audio` and never calls ElevenLabs from the frontend.
- Missing lookup/playback errors are quiet outside development builds.
- One static audio clip plays at a time through the existing shared hook.

Existing English Animals dual-button playback remains in place.

Visible word text can differ from `spoken_text`: the page renders `item.targetTerm` from static translations, while audio lookup rows expose canonical `spoken_text` from `static_tts_playback`.

## Import-To-Deck Reuse

Static category import reuse was wired without a new migration:

- The import path still calls the no-credit `submit_curriculum_import` RPC.
- Import payload metadata now preserves:
  - `source_category_slug`
  - `source_level_number`
  - `source_concept_id`
  - `source_target_language_code`
  - `static_tts_public_url` when available
  - `static_tts_voice_profile_key` when available
- After the RPC returns a deck id, the frontend best-effort updates imported `words.tts_audio_url` with the canonical static public URL.
- Existing schema field used: `words.tts_audio_url`.
- No generated deck TTS, generated deck flow, `submit_generation`, retry, credits, Suno, KIE, Speak, or Guided Today code was touched.

## Assignment

Language-level assignment was not activated because paid generation did not run.

The generator now supports a language-level assignment with:

```text
target_language_code = ceb
category_slug = null
voice_profile_key = static_thematic_ceb_yumi_raw_v1
active = true
priority = 100
audio_version = 1
```

## Known Limitations

- Full paid generation needs 1,850 calls when using the new full-language voice profile key, because the existing Animals Level 1 pilot used a different voice profile key.
- The requested cap is 1,200 calls, so this needs either an explicit raised cap or a split rollout.
- No storage object count, ready row count, playback row count, listening index, or duration range exists for the full batch yet because paid generation was not run.

## Next Rollout Plan

1. Approve one of:
   - raise the cap to at least 1,850 calls, or
   - split the batch into chunks of at most 1,200 calls.
2. Run the paid generation command with `--qa-status ready`, `--postprocess-mode raw`, and the same inventory.
3. Verify ready usage rows, playback rows, linked ready assets, and storage objects under the full-language prefix.
4. Activate the language-level assignment.
5. Generate the listening HTML index for owner QA.
