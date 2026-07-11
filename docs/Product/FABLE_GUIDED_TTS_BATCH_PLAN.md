# FABLE — Guided-Lesson TTS Batch Plan (v1, owner review)

Date: 2026-07-12. Status: **PLAN — nothing applied, nothing spent.** Owner keeps: the
Supabase migration, the ElevenLabs spend approval, and the voice picks. Evidence from a
full tooling inventory this session (agent report, file:line-verified).

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
