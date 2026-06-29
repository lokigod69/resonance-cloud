# Indonesian Static Thematic TTS - Animals Voice Pilot

Date: 2026-06-29

## Status

Completed.

Generated an Indonesian Animals Level 1 raw provider-audio comparison pilot for one female voice and one male voice. No Indonesian full-category or full-language generation was run.

## Resolved Language And Voices

- Static language code: `id`
- UI/data label: `Bahasa Indonesia`
- Admin language profile: `Indo1`
- Female voice: `Gavrila`
- Female provider/admin language: `Indonesian`
- Female provider/admin language code: `id`
- Female provider voice ID: redacted, last 4 `X4u0`
- Male voice: `Blasto`
- Male provider/admin language: `Indonesian`
- Male provider/admin language code: `id`
- Male provider voice ID: redacted, last 4 `upUf`
- Male note from admin DB: `balinese`
- Provider model: `eleven_flash_v2_5`
- Output format: `mp3_44100_128`
- Postprocess mode: `raw`
- QA status: `ready`

`Seth Lynn` was not present as an Indonesian voice in `public.voices` during this run. The available current Indonesian male voice resolved from admin DB was `Blasto`.

## Inventory

Export path:

```text
tmp/static-tts-id-animals-level-1.json
```

| Concept ID | English QA label | Indonesian spoken_text |
| --- | --- | --- |
| `animals.dog` | dog | anjing |
| `animals.cat` | cat | kucing |
| `animals.bird` | bird | burung |
| `animals.fish` | fish | ikan |
| `animals.horse` | horse | kuda |
| `animals.cow` | cow | sapi |
| `animals.pig` | pig | babi |
| `animals.sheep` | sheep | domba |
| `animals.goat` | goat | kambing |
| `animals.chicken` | chicken | ayam |

Validation:

- Inventory count: 10
- `target_language_code`: `id` for every row
- Empty `spoken_text`: 0
- Duplicate `concept_id`: 0
- English source fallback rows: 0

## Commands

Inventory export:

```powershell
npm --prefix frontend run tts:static:inventory -- --target-language id --category animals --level 1 --out ../tmp/static-tts-id-animals-level-1.json
```

Female dry-run:

```powershell
python -c "import truststore; truststore.inject_into_ssl(); from dotenv import load_dotenv; load_dotenv(r'D:\CODING\ResonanceTEST\orchestrator\.env'); from scripts.generate_static_thematic_tts import main; raise SystemExit(main())" --inventory tmp/static-tts-id-animals-level-1.json --target-language id --category animals --voice-profile-key static_thematic_id_animals_gavrila_raw_v1 --profile-name "Indo1" --voice-name "Gavrila" --postprocess-mode raw --qa-status ready --dry-run --report-out tmp/static-tts-id-animals-level-1-gavrila-raw-dry-run-report.json
```

Male dry-run:

```powershell
python -c "import truststore; truststore.inject_into_ssl(); from dotenv import load_dotenv; load_dotenv(r'D:\CODING\ResonanceTEST\orchestrator\.env'); from scripts.generate_static_thematic_tts import main; raise SystemExit(main())" --inventory tmp/static-tts-id-animals-level-1.json --target-language id --category animals --voice-profile-key static_thematic_id_animals_blasto_raw_v1 --profile-name "Indo1" --voice-name "Blasto" --postprocess-mode raw --qa-status ready --dry-run --report-out tmp/static-tts-id-animals-level-1-blasto-raw-dry-run-report.json
```

Female paid run:

```powershell
python -c "import truststore; truststore.inject_into_ssl(); from dotenv import load_dotenv; load_dotenv(r'D:\CODING\ResonanceTEST\orchestrator\.env'); from scripts.generate_static_thematic_tts import main; raise SystemExit(main())" --inventory tmp/static-tts-id-animals-level-1.json --target-language id --category animals --voice-profile-key static_thematic_id_animals_gavrila_raw_v1 --profile-name "Indo1" --voice-name "Gavrila" --postprocess-mode raw --qa-status ready --commit-db --allow-provider-calls --max-provider-calls 10 --report-out tmp/static-tts-id-animals-level-1-gavrila-raw-report.json
```

Male paid run:

```powershell
python -c "import truststore; truststore.inject_into_ssl(); from dotenv import load_dotenv; load_dotenv(r'D:\CODING\ResonanceTEST\orchestrator\.env'); from scripts.generate_static_thematic_tts import main; raise SystemExit(main())" --inventory tmp/static-tts-id-animals-level-1.json --target-language id --category animals --voice-profile-key static_thematic_id_animals_blasto_raw_v1 --profile-name "Indo1" --voice-name "Blasto" --postprocess-mode raw --qa-status ready --commit-db --allow-provider-calls --max-provider-calls 10 --report-out tmp/static-tts-id-animals-level-1-blasto-raw-report.json
```

## Results

Female profile:

- Voice profile key: `static_thematic_id_animals_gavrila_raw_v1`
- ElevenLabs calls: 10
- Generated files/assets: 10
- Ready usage rows: 10
- Public playback rows: 10
- Storage prefix: `guided-tts/static/v1/id/static_thematic_id_animals_gavrila_raw_v1/animals/level-1/`
- Duration range: 557 ms to 743 ms
- Report: `tmp/static-tts-id-animals-level-1-gavrila-raw-report.json`

Male profile:

- Voice profile key: `static_thematic_id_animals_blasto_raw_v1`
- ElevenLabs calls: 10
- Generated files/assets: 10
- Ready usage rows: 10
- Public playback rows: 10
- Storage prefix: `guided-tts/static/v1/id/static_thematic_id_animals_blasto_raw_v1/animals/level-1/`
- Duration range: 603 ms to 789 ms
- Report: `tmp/static-tts-id-animals-level-1-blasto-raw-report.json`

Overall:

- Total ElevenLabs calls: 20
- Total generated files/assets: 20
- Failed: 0
- Failed words: none
- Candidate SQL applied: no
- `qa_status=candidate` used: no
- Category assignments activated: no

DB/storage verification:

```text
tmp/static-tts-id-animals-level-1-db-verification.json
```

## Listening Comparison

Comparison HTML:

```text
tmp/static-tts-id-animals-level-1-voice-comparison.html
```

The comparison page includes concept ID, English QA label, Indonesian `spoken_text`, a Gavrila audio player, and a Blasto audio player for every Animals Level 1 item.

## Warnings

Several generated items are shorter than the static QA heuristic threshold and were reported with `duration_under_800ms_for_multisyllable`. Audio was intentionally left raw; no trimming, fades, LUFS normalization, peak normalization, or other post-processing was applied.

## Proposed Indonesian Category Voice Map

Do not activate these until owner listening approval.

Proposed Gavrila categories:

- `animals`
- `food_drinks`
- `fruits`
- `vegetables`
- `nuts_seeds`
- `home_objects`
- `body_health`
- `clothing_appearance`
- `nature_weather`
- `feelings_states`
- `education_learning`
- `arts_entertainment`

Proposed Blasto categories:

- `places_buildings`
- `transport_travel`
- `jobs_people`
- `sports_hobbies`
- `music_instruments`
- `technology_media`
- `money_shopping_services`

Rationale:

- Keep one voice per top-level category, not per word.
- Use Gavrila for warmer, concrete, household, food, nature, and learner-friendly categories.
- Use Blasto for more neutral, public-world, activity, work, transport, technology, and services categories.
- Preserve a possible full-language fallback profile later.
- Store the approved plan as category-level rows in `static_tts_voice_assignments` after owner approval.

## Next Step

After owner listening approval:

1. Choose the preferred voice for `animals`.
2. Approve or revise the category voice map.
3. Generate Indonesian category-by-category in capped, resumable batches.
4. Activate category-level assignments only after the approved category audio exists.

## Checks

Run before completion:

```text
git diff --check
git diff --cached --check
D:\CODING\ResonanceTEST\orchestrator\.venv\Scripts\python.exe -m compileall scripts\generate_static_thematic_tts.py
D:\CODING\ResonanceTEST\orchestrator\.venv\Scripts\python.exe -m pytest tests\test_static_thematic_tts.py -q
npm --prefix frontend run test:static-thematic-tts
npm exec eslint -- scripts/export-static-thematic-tts-inventory.ts scripts/test-static-thematic-tts.ts
npm exec vite build
```

## Known Limitations

- No Indonesian category assignments were activated.
- No full Indonesian generation was run.
- Browser UI playback was not manually tested in an authenticated app session; the pilot was verified through generated public playback rows and the comparison HTML.
