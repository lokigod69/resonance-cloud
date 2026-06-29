# Static Thematic TTS Cebuano Animals Yumi Raw Pilot Report

## Purpose

Prepare a raw ElevenLabs static thematic TTS pilot for Cebuano/Bisaya Animals Level 1. The goal is to preserve provider-returned MP3 bytes so owner listening can distinguish voice/provider quality from the post-processing that made the English batch sound clipped.

## Raw Mode

Use `--postprocess-mode raw`.

Raw mode does not trim, remove silence, fade in, fade out, LUFS normalize, or peak normalize. It uploads the provider-returned MP3 bytes directly after writing them to a temporary file for metadata probing. If ffprobe cannot read metadata, the audio is kept and the item reports `ffprobe_failed`.

## Resolved Values

- Static category target language code: `ceb`
- Static category language label: Bisaya / Cebuano
- Admin profile requested: `Bisaya`
- Admin profile resolved: `Bisaya1`
- Voice requested: `Yumi`
- Voice resolved: `Mayumi`
- Voice admin language: `Cebuano`
- Voice admin/provider language code: `fil`
- ElevenLabs provider voice ID: resolved from `public.voices`; final responses should reveal only last 4 chars: `Hnv5`

The app static category code remains `ceb` for inventory, DB rows, and storage paths. Provider calls should use the resolved voice admin language code `fil` when present.

## Inventory

Command run:

```powershell
npm --prefix frontend run tts:static:inventory -- --target-language ceb --category animals --level 1 --out ../tmp/static-tts-ceb-animals-level-1.json
```

Exported 10 rows:

| concept_id | English QA label | Cebuano/Bisaya spoken_text |
|---|---:|---|
| animals.dog | dog | iro |
| animals.cat | cat | iring |
| animals.bird | bird | langgam |
| animals.fish | fish | isda |
| animals.horse | horse | kabayo |
| animals.cow | cow | baka |
| animals.pig | pig | baboy |
| animals.sheep | sheep | karnero |
| animals.goat | goat | kanding |
| animals.chicken | chicken | manok |

No Level 1 English animal words appeared in `spoken_text`.

## Dry Run

Command run:

```powershell
python -c "import truststore; truststore.inject_into_ssl(); from dotenv import load_dotenv; load_dotenv(r'D:\CODING\ResonanceTEST\orchestrator\.env'); from scripts.generate_static_thematic_tts import main; raise SystemExit(main())" --inventory tmp/static-tts-ceb-animals-level-1.json --target-language ceb --category animals --voice-profile-key static_thematic_ceb_animals_yumi_raw_v1 --profile-name "Bisaya" --voice-name "Yumi" --postprocess-mode raw --qa-status candidate --dry-run --report-out tmp/static-tts-ceb-animals-level-1-yumi-raw-dry-run-report.json
```

Dry-run result:

- Items: 10
- Would generate: 10
- Provider calls: 0
- Existing ready assets: 0
- Existing usages: 0
- Failed: 0
- Activation assignment changed: no
- Public frontend playback affected: no

Dry-run report path:

```text
tmp/static-tts-ceb-animals-level-1-yumi-raw-dry-run-report.json
```

Storage prefix that would be used:

```text
guided-tts/static/v1/ceb/static_thematic_ceb_animals_yumi_raw_v1/animals/level-1/
```

## Live DB Blocker

Paid generation was not run. A reversible service-role preflight insert against `public.static_tts_asset_usages` confirmed the live Supabase constraint still rejects `qa_status = 'candidate'`:

```text
static_tts_asset_usages_qa_status_check rejects candidate
```

The branch adds migration:

```text
frontend/supabase/migrations/20260629100000_static_tts_candidate_qa_status.sql
```

That migration expands the check constraint to include `candidate`. It does not change `public.static_tts_playback`; the playback view still exposes only `ready` and `approved`, so candidate rows remain hidden from public frontend playback.

## Paid Generation Status

- ElevenLabs calls made: 0
- Paid calls made: 0
- Generated MP3 files: 0
- DB candidate rows inserted: 0
- Listening HTML created: not yet, because there are no generated public URLs
- Duration range: not available
- Failed words: none; generation was intentionally not started
- DB rows marked rejected: none
- Active playback assignment changed: no

After applying the candidate migration to Supabase, rerun the paid pilot:

```powershell
python -c "import truststore; truststore.inject_into_ssl(); from dotenv import load_dotenv; load_dotenv(r'D:\CODING\ResonanceTEST\orchestrator\.env'); from scripts.generate_static_thematic_tts import main; raise SystemExit(main())" --inventory tmp/static-tts-ceb-animals-level-1.json --target-language ceb --category animals --voice-profile-key static_thematic_ceb_animals_yumi_raw_v1 --profile-name "Bisaya" --voice-name "Yumi" --postprocess-mode raw --qa-status candidate --commit-db --allow-provider-calls --max-provider-calls 10 --report-out tmp/static-tts-ceb-animals-level-1-yumi-raw-report.json --listening-html-out tmp/static-tts-ceb-animals-level-1-yumi-raw-listening.html
```

## Post-Generation Verification

Run after the paid command succeeds:

```sql
select concept_id, spoken_text, qa_status, voice_profile_key
from public.static_tts_asset_usages
where target_language_code = 'ceb'
  and category_slug = 'animals'
  and level_number = 1
  and voice_profile_key = 'static_thematic_ceb_animals_yumi_raw_v1'
order by concept_id;
```

Expected:

- 10 rows
- `qa_status = 'candidate'`
- 10 linked ready rows in `public.guided_tts_assets`
- 10 MP3 objects under `guided-tts/static/v1/ceb/static_thematic_ceb_animals_yumi_raw_v1/animals/level-1/`

## Next Step

Apply `20260629100000_static_tts_candidate_qa_status.sql` to Supabase, then rerun the paid pilot command above. Do not activate frontend playback until owner listening approval.
