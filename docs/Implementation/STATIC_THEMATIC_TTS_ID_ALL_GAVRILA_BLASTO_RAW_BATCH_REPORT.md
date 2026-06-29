# Indonesian Static Thematic TTS — full batch (Gavrila / Blasto, raw)

Full-inventory Indonesian (`id`) static thematic TTS generation with deterministic per-level
voice alternation. Raw provider MP3 bytes, `qa_status=ready`, no post-processing.

## Summary

| Metric | Value |
|---|---|
| Total Indonesian static inventory | **1850** (19 categories) |
| Voice plan | **Odd levels → Gavrila, even levels → Blasto** (deterministic, per level) |
| Gavrila assigned (odd levels 1,3,5,7,9) | 930 |
| Blasto assigned (even levels 2,4,6,8,10) | 920 |
| ElevenLabs calls (paid) | **1770** (Gavrila 884 + Blasto 886) |
| Generated assets | 1770 |
| Ready `static_tts_asset_usages` (new keys) | **1850** (Gavrila 930 + Blasto 920) |
| Skipped/linked to existing asset (duplicate text, no new call) | 80 (Gavrila 46 + Blasto 34) |
| Failed | **0** |
| `static_tts_playback` rows (id) after cleanup | **1850** |
| Duplicate playback query (cat/level/concept >1) | **0** |
| Storage objects | Gavrila 884 + Blasto 886 = 1770 |

The voice plan used was the **preferred odd/even level alternation**, not the fallback
category map. No DB schema change was required: `level_number` already lives on each usage
row, the voice is chosen per level at generation time, and `concept_id` is unique per
category, so each concept produces exactly one ready row under one voice.

## Voice plan

- Odd-numbered levels → **Gavrila** (`static_thematic_id_gavrila_raw_v1`, provider voice …X4u0)
- Even-numbered levels → **Blasto** (`static_thematic_id_blasto_raw_v1`, provider voice …upUf)
- Model `eleven_flash_v2_5`, format `mp3_44100_128`, `--postprocess-mode raw`.

Storage prefixes:

```
guided-tts/static/v1/id/static_thematic_id_gavrila_raw_v1/<category>/level-<n>/<concept_id>.mp3
guided-tts/static/v1/id/static_thematic_id_blasto_raw_v1/<category>/level-<n>/<concept_id>.mp3
```

## Generation

- Resumable, capped batches of 200 provider calls (`--max-provider-calls 200`), looped until
  zero remaining per voice. Gavrila: 6 invocations (5 generating + 1 confirming zero).
  Blasto: 6 invocations. Per-word failures recorded; none occurred.
- `skip-existing` resumed safely across batches; no pilot, Cebuano, or English files were
  overwritten. The full-batch keys (`static_thematic_id_gavrila_raw_v1` /
  `static_thematic_id_blasto_raw_v1`) are distinct from the pilot keys, so the cache key never
  collided with the Animals Level-1 pilot assets.
- Raw provider bytes used exactly as returned: no trim, no silence removal, no fade, no LUFS
  or peak normalization, no Blasto amplification.

## Inventory validation

Exported via `tts:static:inventory --target-language id --all-categories --all-levels`.
1850 items: 0 non-`id`, 0 missing `category_slug`/`level_number`/`concept_id`/`spoken_text`,
0 empty `spoken_text`, 0 fallback terms, 0 duplicate `(category_slug, concept_id)`. 193 items
have `spoken_text` equal to the English term — these are real Indonesian terms (cognates /
loanwords), confirmed non-fallback; vocabulary was neither translated nor edited in this task.

## Duration & volume audit (read-only — no audio modified)

| Voice | clips | duration ms (min/avg/max) | file size bytes (min/avg/max) | mean vol dB (avg) | max vol dB (avg) |
|---|---|---|---|---|---|
| Gavrila | 930 | 417 / 809.9 / 1718 | 7567 / 14105 / 28465 | −12.58 | −1.77 |
| Blasto | 920 | 417 / 866.8 / 1718 | 7567 / 14996 / 28465 | −28.54 | −13.12 |

**Warning:** Blasto is ~**16 dB quieter** than Gavrila (mean −28.54 vs −12.58 dB; peaks −13.1
vs −1.8 dB). This is well beyond "slightly quieter." Per the run's hard rules, no
amplification/normalization was applied. A later Blasto boost/normalization pass is
recommended before relying on Blasto for production loudness parity. Audit JSON:
`tmp/static-tts-id-gavrila-blasto-volume-audit.json` (sampled 100 clips/voice via
`ffmpeg volumedetect`; source files untouched).

## Duplicate playback verification

`static_tts_playback` is a plain join with no per-concept dedup (one row per ready/approved
usage). Because odd/even assigns exactly one voice per level and concept_ids are unique per
category, the full batch yields one ready row per concept. The only duplicate source was the
pre-existing Animals Level-1 pilot (both pilot voices ready). After deactivation (below), the
duplicate query `group by category_slug, level_number, concept_id having count(*) > 1` returns
**0 rows**.

## Old pilot deactivation (Part 7)

After full rows existed and verification passed, the old Indonesian pilot usages were marked
`qa_status='rejected'` (storage files **kept**, not deleted):

- `static_thematic_id_animals_gavrila_raw_v1`: 10 ready → rejected
- `static_thematic_id_animals_blasto_raw_v1`: 10 ready → rejected

After deactivation, Animals Level 1 playback resolves to a single voice
(`static_thematic_id_gavrila_raw_v1`, 10 rows, 0 concepts with >1 row, 0 pilot keys in the
view).

## Assignment behavior (Part 8)

No `static_tts_voice_assignments` row was activated for Indonesian. A single language-level
assignment cannot represent per-level alternation, and activating one category/language voice
would hide the other voice. **Indonesian uses per-usage ready rows**: the frontend resolves
voices via `getStaticThematicVoiceProfileKeys('id') = [gavrila, blasto]` and the playback view,
not via the assignments table. No schema change was made.

## Frontend library & import (Parts 8/11)

Minimal, additive enablement (the only code change in this batch):

- `staticThematicAudio.ts` — registered both id voice keys; `getStaticThematicVoiceProfileKeys`
  returns `[gavrila, blasto]` for `id`.
- `LevelDetailPage.tsx` — enabled the static-audio gate for `id`; added a voice-agnostic play
  button that calls `play(conceptId)` with no explicit key, so the single present voice per
  level auto-resolves.
- `curriculumDeckBridge.ts` — import-to-deck audio resolver now picks the first voice key that
  actually has a row for the concept/level (instead of always `[0]`), so even-level (Blasto)
  imports reuse the correct clip. Preserves existing single/dual-voice behavior for ceb/en.

Verified at data level (live browser blocked by auth; verified per the task's helper/data-level
fallback):

- Per-level resolution for sampled odd and even levels (animals L1/L2, food_drinks L5,
  transport_travel L8): each of the 10 concepts resolves to exactly one URL, correct voice,
  0 missing, 0 multi-voice.
- Speaker buttons resolve one audio URL per word; playback filters on vocabulary language `id`;
  one clip plays at a time (`stopStaticAudio` before each play); the browser plays the Supabase
  `public_url` and never calls ElevenLabs.
- Imported Indonesian static decks reuse static audio (`tts_audio_url` + `tts_status='ready'`
  set on import), so they do not fall back to generated/robotic TTS where static audio exists.

Checks: `npm run typecheck`, targeted `eslint`, `npm run test:static-thematic-tts`, and
`npm run test:vocabulary-library` all pass.

## Artifacts

- Inventory: `tmp/static-tts-id-all.json` (+ split `…-gavrila.json` / `…-blasto.json`)
- Dry-run reports: `tmp/static-tts-id-all-{gavrila,blasto}-raw-dry-run-report.json`
- Batch reports/logs: `tmp/static-tts-id-all-{gavrila,blasto}-raw-batch-00N-report.json`
- Listening index: `tmp/static-tts-id-all-gavrila-blasto-raw-listening.html`
- Volume audit: `tmp/static-tts-id-gavrila-blasto-volume-audit.json`

(tmp artifacts are not committed.)

## Known limitations

- **Blasto loudness**: ~16 dB quieter than Gavrila; a future boost/normalization pass is
  recommended. Not addressed here by rule.
- 80 of 1850 concepts share identical Indonesian terms within a voice and reuse one cached
  asset (1770 distinct storage objects); correct behavior (same word = same pronunciation).
- Generation ran in a dedicated worktree off `61f3c245` (`orchestrator-id-static-tts`) to avoid
  colliding with a concurrent German static-TTS batch in another worktree. No generator/exporter
  code changes were needed — the committed tooling already supports `id` + all categories.

## Next language rollout recommendation

The pipeline is language-generic. For the next language: confirm the exporter's
`SUPPORTED_STATIC_TTS_TARGET_LANGUAGES` and the generator's `SUPPORTED_TARGET_LANGUAGES`
include the code, ensure the voice(s) exist in `public.voices` with matching `language_code`,
add the language's voice keys to `getStaticThematicVoiceProfileKeys`, then run the same
export → split → dry-run → capped-batch → verify → (pilot cleanup) flow. Audit loudness per
voice and plan a normalization pass up front if voices differ by more than a few dB.
