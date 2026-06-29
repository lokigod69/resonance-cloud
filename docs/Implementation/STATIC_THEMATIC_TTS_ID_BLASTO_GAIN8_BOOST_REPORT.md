# Indonesian Blasto static audio — safe +8 dB boost

Follow-up to the Indonesian full batch
([STATIC_THEMATIC_TTS_ID_ALL_GAVRILA_BLASTO_RAW_BATCH_REPORT.md](STATIC_THEMATIC_TTS_ID_ALL_GAVRILA_BLASTO_RAW_BATCH_REPORT.md)).

## Why the boost was needed

The full-batch volume audit found **Blasto ~16 dB quieter than Gavrila** (mean −28.5 vs
−12.6 dB). With even levels on Blasto and odd levels on Gavrila, the library alternated
between loud and very quiet clips. The owner asked for Blasto to be louder but **not
distorted**.

## Why raw files were not overwritten

Production storage objects are never rewritten in place and raw audio is preserved as the
source of truth. The boost is a **new profile + new storage prefix** built from the raw
source; raw assets and storage objects are retained untouched, and only the raw *usage rows*
are rejected (so they leave the public view) after the boosted replacements exist.

## Profiles & storage

| | value |
|---|---|
| Source profile key | `static_thematic_id_blasto_raw_v1` |
| Source storage prefix | `guided-tts/static/v1/id/static_thematic_id_blasto_raw_v1/` |
| Boosted profile key | `static_thematic_id_blasto_gain8_rawsource_v1` |
| Boosted storage prefix | `guided-tts/static/v1/id/static_thematic_id_blasto_gain8_rawsource_v1/` |

## Gain strategy (conservative, headroom-capped)

Per clip: download raw → measure peak (`ffmpeg volumedetect`) → apply a **single volume
gain** then re-encode to `mp3_44100_128`. No LUFS normalization, no compression, no trim, no
fade, no silence removal.

```
requested_gain_db = +8.0
max_safe_gain_db  = (-1.0 dBFS) - measured_peak_db      # headroom to ~-1 dBFS
applied_gain_db   = max(0, min(requested_gain_db, max_safe_gain_db))
```

Clips whose headroom was below +8 dB were capped to their safe headroom (kept, flagged);
none had to be left fully unboosted.

## Results

| Metric | Value |
|---|---|
| Source Blasto usages (rejected after replacement) | **920** |
| Boosted usages (`qa_status=ready`) | **920** |
| Boosted assets (cache-deduped identical terms) | 886 |
| Boosted storage objects | 920 |
| Applied gain (min / avg / max) | **+0.5 / +7.85 / +8.0 dB** |
| Clips capped below +8 dB (high source peak) | 86 |
| Clips left unboosted | 0 |
| Failures | **0** |
| Boosted Blasto mean volume (sampled) | **−20.7 dB** (was −28.5 dB) |
| Boosted Blasto max volume (sampled) | −5.1 dB (was −13.1 dB) |

The +8 dB boost lifts Blasto from ~16 dB below Gavrila to **~8 dB below** — materially louder
without clipping. Closing the remaining gap would require LUFS/peak normalization, which is
out of scope by rule.

## Playback verification (after boost + raw rejection)

`static_tts_asset_usages` (id):

| voice_profile_key | qa_status | count |
|---|---|---|
| `static_thematic_id_gavrila_raw_v1` | ready | 930 |
| `static_thematic_id_blasto_gain8_rawsource_v1` | ready | 920 |
| `static_thematic_id_blasto_raw_v1` | rejected | 920 |

- `static_tts_playback` rows (id): **1850** (Gavrila 930 + boosted Blasto 920; raw Blasto 0).
- Duplicate playback query (`group by category_slug, level_number, concept_id having count(*) > 1`):
  **0 rows** (verified with ordered pagination — an unordered `.range()` scan falsely reports
  dupes after the inserts; the in-DB truth is zero).
- Animals Level 1 (odd) → Gavrila (10 rows, single voice). Even levels → boosted Blasto
  (e.g. Animals L2: 10 rows, all under the boosted prefix). Odd levels not Gavrila: 0; even
  levels not boosted-Blasto: 0.
- Import-to-deck reuse resolves the boosted URLs for Blasto levels: the frontend voice-key
  list for `id` now returns `[gavrila_raw, blasto_gain8_rawsource]`, and the import resolver
  picks the first present voice per concept/level (boosted on even levels).

## Frontend change

`frontend/src/lib/staticThematicAudio.ts` — `getStaticThematicVoiceProfileKeys('id')` now
returns `[STATIC_THEMATIC_ID_GAVRILA_RAW_PROFILE_KEY, STATIC_THEMATIC_ID_BLASTO_GAIN8_PROFILE_KEY]`
(was the raw Blasto key). Since raw Blasto usages are rejected, only the boosted rows appear in
the view, so both library playback and import reuse resolve the boosted clips on even levels.

## Artifacts

- Listening A/B (raw vs boosted, + Gavrila reference): `tmp/static-tts-id-blasto-gain8-listening.html`
- Volume audit: `tmp/static-tts-id-blasto-gain8-volume-audit.json`
- (tmp artifacts are not committed.)

## Known limitations

- Boosted Blasto is still ~8 dB below Gavrila; full loudness parity needs normalization
  (out of scope). A future LUFS-targeted pass could equalize all voices.
- 86 clips were capped below +8 dB due to already-high source peaks (kept, flagged; no
  clipping).
- 34 orphaned boosted storage objects: the boost uploads one file per concept before the
  cache-key dedup of identical Indonesian terms, so 34 deduped concepts have an uploaded file
  that no asset row references (their usage points to the shared identical-word asset). Audio
  is correct; the orphans are harmless and were not deleted (no in-place storage deletion).
