# FABLE — Guided-Lesson TTS Batch Plan (v1, owner review)

Date: 2026-07-12. Status: **DONE — batch executed 2026-07-12 after the 193-finding
content fix batch landed.** Results: 3,744 clips generated (46,991 + 33 retry chars),
1 transient ElevenLabs timeout (Cebuano) retried clean, 0 failed assets remaining;
3,970 bright `guided_tts_playback` rows across all 10 languages (424–453 per language,
50 for Korean P1), 13/13 audio spot-checks (200 / audio-mpeg / sane sizes). Verification
tooling: `scripts/verify_guided_tts_batch.py` + `scripts/verify_guided_tts_counts.py`.
Resolution deltas against the plan below:

1. **No migration needed.** A prod probe (`scripts/probe_guided_tts_state.py`) showed the
   guided SQL was already applied: all four tables, the `guided_tts_playback` view, and
   the `guided-tts` bucket exist; English A1 flash-v2.5 assets (368) + 447 usages live.
2. **Model: `eleven_multilingual_v2`** (quality over speed, owner call). The provider now
   omits `language_code` for models without language enforcement — ElevenLabs 400s it
   outside Turbo/Flash v2.5.
3. **One generation per text** (owner: no per-phrase double voices). Diversity comes from
   rotating each language's hand-picked roster **per path** (10-lesson block keeps one
   voice, next path switches — gender-alternating where the roster allows). Seeded as 91
   `scope_path_id` bright profiles (`scripts/seed_guided_bright_rotation.py`), specificity
   12 beats the English vibe-level rows (8) and scope-less static rows (0).
   it/pt/pl voices existed in `public.voices` after all (Rosanna/Marco/Samanta,
   Raquel/Lair/Carla, Maria/Rysard/Marta/Wojech). Indonesian = Gavrila only (raw Blasto
   is ~16 dB quiet; guided pipeline has no gain step). Korean P1 = Jini.
4. **Bright-only confirmed**; wistful/sharp English clips stay as-is pending the vibe
   discontinuation.
5. Scope guardrails run programmatically in `scripts/run_guided_bright_batch.py`
   (dry-run + commit in one process: profile-pattern check, 8k/language and 60k/batch
   char caps) instead of hand-maintained per-language `EXPECTED_SCOPES` rows.
   Measured envelope: **47,055 chars** across all 10 languages (incl. Korean P1).
6. Sequencing: the 193-finding content fix batch lands first so no audio is generated
   for text about to change.

Original plan (superseded where the deltas above say so):

## What already exists (surprisingly much)

- **Frontend playback is DONE.** `src/lib/guidedAudio.ts` resolves clips from a
  `guided_tts_playback` view keyed `(path_id, lesson_id, vibe, surface, surface_key)`,
  plays `public_url`, falls back to browser speech on any miss. Already wired into
  TodaySession/MatchPairsStep. It lights up the moment the view returns rows.
- **Generation pipeline is DONE (Python, manual CLI).**
  `orchestrator/src/services/guided_tts/` — inventory (pure, no-network, cache-key +
  storage-path convention), `generate.py` (**dry-run by default**, `--commit` to spend),
  direct ElevenLabs provider with retry, audit ledger (`guided_tts_generation_runs`),
  tests. Lessons are read via `frontend/scripts/guided-tts-lessons-dump.ts`.
- **Asset store partially live.** The applied static-thematic migration FK-references
  `guided_tts_assets`, so the shared asset table + `guided-tts` bucket appear to exist
  in prod already. The **guided-specific** pieces (`guided_voice_profiles`,
  `guided_tts_asset_usages`, the `guided_tts_playback` view, admin RPC) live only in
  `frontend/supabase/rescued-drafts/20260517010000_guided_tts_v1.sql` (marked
  do-not-apply-without-owner).
- **Multi-voice precedent.** Static thematic TTS ships 1–6 voices per language
  (ko 6, de/es/fr 4, id 2, en 2, ceb 1 — `staticThematicAudio.ts:47-96`); the admin
  `voices` page manages the raw ElevenLabs voice-ID registry. Per-voice alternation =
  the "sometimes a woman, sometimes a man" behavior the owner wants.

## Gaps to close before a batch (code-side, no spend)

1. **Surface-enum drift**: Python `VALID_SURFACES = (corePhrase, chunks, trophyWord,
   speak)` vs SQL check `(corePhrase, chunk, trophyWord, speakTarget)`. Align Python to
   the SQL convention (SQL is canonical — the frontend queries those strings).
2. **`EXPECTED_SCOPES` allow-list** in `generate.py:104-171` only covers English A1
   scopes — extend per language/path, keeping the hard char-count expectations that make
   `--commit` refuse surprise spend.
3. **Verify in Supabase** which of the draft's objects actually exist before applying
   (the FK evidence says `guided_tts_assets` yes; usages/view unverified).
4. Voice-profile seeding: no admin UI for `guided_voice_profiles` — seed rows via SQL
   from owner-picked voice IDs (reuse the static precedent voices where they exist:
   ko/de/es/fr/id/ceb/en). **Missing voices to pick: it, pt, pl** (and later new guided
   languages). Admin UI is a nice-to-have, not a blocker.

## Proposed v1 batch scope

Bright vibe only (matches the owner's "only the bright path" direction — the newest
languages only author bright anyway), surfaces `corePhrase + chunk + trophyWord`, all
guided languages (9 + Korean P1 pilot when it lands). Skip `speakTarget` (near-duplicate
of corePhrase).

**Character math** (from the English precedent in `EXPECTED_SCOPES`: full A1 bright
core+chunks ≈ 4.2k chars + trophy ≈ 0.5k → **~5k chars per language per voice**):

| Variant | Chars | Note |
|---|---|---|
| 9 languages × 1 voice | ~45k | minimal |
| 9 languages × 2 voices (gender mix) | ~90k | recommended |
| + Korean P1 pilot (×2 voices) | +~1.2k | trivial |

ElevenLabs Flash v2.5 at typical subscription rates puts ~90k chars comfortably inside
a single Creator-tier month (~$22); exact dollars depend on the owner's plan — the repo
tracks characters only. Every run produces a dry-run inventory with exact char counts
BEFORE any `--commit`.

## Runbook (per language, repeatable)

1. Owner applies the guided SQL (after drift fix + existence check) — one migration.
2. Seed `guided_voice_profiles` for the language (voice IDs from admin `voices` /
   static precedent; 1–2 voices, `priority` for alternation).
3. `python -m src.services.guided_tts.generate --dry-run` → char/asset report.
4. Owner eyeballs the count → `--commit` (needs scope added to `EXPECTED_SCOPES`).
5. Spot-check playback on lingwave.ai (browser fallback remains for any miss).

## Owner decisions needed

1. Approve applying the guided TTS migration (with the enum-drift fix).
2. Approve the v1 scope + budget shape above (1 vs 2 voices per language).
3. Pick voice IDs for it/pt/pl (no static precedent).
4. Confirm bright-only (wistful/sharp English clips can come later or never, given the
   vibe-discontinuation direction).
