# Guided Trophy Word — A1P2 Sharp Revision V1

Date: 2026-05-15
Author: Claude (implementation pass)
Repo: d:\CODING\ResonanceTEST\orchestrator
Branch: main
Scope: A1P2 Sharp trophy words only.

Product owner reviewed the A1P2 V2 lyrics/captions drafts (commits `64f8b87`, `7daf3f8`, `7d876dd`) and rejected the current A1P2 Sharp trophy words as too weak / utility-token for a reward system. Words like `yes`, `this`, `any`, `two`, `here`, `note` feel like function tokens, not collectible Trophy Words — a learner could feel ridiculed if `yes` is presented as a trophy.

This pass revises the A1P2 Sharp trophy words in `frontend/src/data/guidedLessons.ts` so they are still A1-appropriate, lesson-relevant, distinct from A1P1, and actually worthy of Trophy Song treatment. Bright and Wistful are untouched. No edits to `guidedTrophySongs.ts`, no audio, no provider calls, no backend / Music page / Supabase / decks / providers / pipeline changes.

## Files Changed

- `frontend/src/data/guidedLessons.ts` — six A1P2 Sharp `trophyWord` calls updated (L2, L3, L4, L5, L7, L9) plus one `songSeed.mood` cleanup (L2). Bright and Wistful unchanged. A1P1 and A1P3–A1P5 untouched.
- `docs/Product/GUIDED_TROPHY_WORD_A1P2_SHARP_REVISION_V1_REPORT.md` — this report.

`frontend/scripts/test-guided-trophy-word-uniqueness.ts` was not modified; existing checks already cover the new state.

## Old A1P2 Sharp Trophy Word Matrix

Pre-revision A1P2 Sharp trophy words (post the earlier source revision V1, before this Sharp quality pass).

| L# | Lesson title | Sharp trophy (old) | Verdict |
|---|---|---|---|
| 1 | I don't understand | short | KEEP — A1, decisive compactness ask, not utility |
| 2 | Write it down | note | REPLACE — too generic, low-value as a reward token |
| 3 | Show me | here | REPLACE — pure utility deictic, no collectibility |
| 4 | Which one? | this | REPLACE — utility demonstrative, embarrassing as a reward |
| 5 | Do you have…? | any | REPLACE — empty quantifier, not a Sharp word |
| 6 | By card | now | KEEP — A1, decisive time-marker, real service register |
| 7 | A receipt, please | two | REPLACE — number-as-trophy reads as a joke |
| 8 | I have a reservation | direct | KEEP — A1P1 sharp does NOT contain `direct`, so no same-vibe duplicate; word is a genuine Sharp posture |
| 9 | Is this right? | yes | REPLACE — basic affirmation, the most embarrassing trophy candidate |
| 10 | One moment | wait | KEEP — A1 verb, action word, real service register |

Six replacements, four keeps.

## New A1P2 Sharp Trophy Word Matrix

| L# | Lesson title | Sharp trophy (new) | German meaning | Example |
|---|---|---|---|---|
| 1 | I don't understand | **short** (kept) | kurz | Short question. |
| 2 | Write it down | **spelling** | Schreibweise | The spelling, please. |
| 3 | Show me | **sign** | Schild | On the sign, please. |
| 4 | Which one? | **option** | Option | The first option. |
| 5 | Do you have…? | **stock** | Lager / Bestand | In stock? |
| 6 | By card | **now** (kept) | jetzt | Now, please. |
| 7 | A receipt, please | **printed** | gedruckt | Printed, please. |
| 8 | I have a reservation | **direct** (kept) | direkt | Direct and clear. |
| 9 | Is this right? | **correct** | richtig / korrekt | Correct, thank you. |
| 10 | One moment | **wait** (kept) | warten | Wait, please. |

All ten are A1 or very near A1, all directly serve their lesson scene, all carry enough lexical weight to function as a Trophy Word (a collectible reward) rather than a utility token.

## Words Replaced

| Cell | Old | New | Rationale |
|---|---|---|---|
| L2 sharp | note | **spelling** | "Spelling" is the actual decisive Sharp ask in this scene: not "write something somewhere" but "tell me the exact letters." Carries an entire service register ("Could you give me the spelling?") in one A1 word. |
| L3 sharp | here | **sign** | "Sign" replaces a pure deictic ("here") with a concrete service object ("On the sign", "Read the sign", "Which sign?"). The lesson scene is pointing at a map or menu — naming the artifact is sharper than the gesture. |
| L4 sharp | this | **option** | "Option" replaces a demonstrative pronoun with a real choice noun. Service-English uses "option" constantly ("the first option", "any other option"). A1+, immediately recognisable, carries decisive Sharp posture without being utility-empty. |
| L5 sharp | any | **stock** | "Stock" replaces an empty quantifier with the concrete service noun that actually carries the question ("In stock?" is the lesson's literal target phrase). The trophy word *is* the loaded word in the line. |
| L7 sharp | two | **printed** | "Printed" replaces a number (which reads as a joke as a trophy) with the meaningful Sharp distinction this scene needs: receipts are increasingly digital, "Printed, please" is a real decisive A1+ service ask. |
| L9 sharp | yes | **correct** | "Correct" replaces the most embarrassing trophy candidate with a service-English confirmation that learners actually need ("Yes, that's correct", "Correct, thank you"). A1, decisive, grown-up. |

Total replacements: **6 cells**.

## Words Kept

| Cell | Word | Reason |
|---|---|---|
| L1 sharp | short | Real Sharp posture (compact ask). Not on the product-owner rejection list. |
| L6 sharp | now | A1 time-marker, decisive payment beat. Not on the rejection list. |
| L8 sharp | direct | A1, central to the reservation arrival scene. A1P1 Sharp L8 is `decided`, NOT `direct` — so there is no A1P1↔A1P2 same-vibe duplicate. `direct` does appear as a pre-existing informational cross-path repeat at A1P3 L3 and A1P5 L3, which the uniqueness test reports without failing. Not on the rejection list. |
| L10 sharp | wait | A1 verb, real action word for L10 "One moment". Not on the rejection list. |

Total kept: **4 cells**.

## Songseed Cleanup

The only songSeed field that explicitly referenced the old trophy-word flavour was L2 sharp: `{ genre: 'staccato piano groove', mood: 'short note' }`. The mood `'short note'` is updated to `'clean spelling'`. Genre is unchanged.

All other A1P2 Sharp `songSeed` values were already vibe-anchored without naming the old trophy word (`'pointed location'`, `'binary choice'`, `'available or not'`, `'tight checkout'`, `'confirmed route'`) and stay as-is per the brief's "only if it sits next to the trophy word and needs cleanup" rule.

## Bright and Wistful Confirmation

A1P2 Bright trophy words: `happy`, `warm`, `right`, `fine`, `fresh`, `easy`, `neat`, `kind`, `sure`, `cheerful` — **unchanged**.

A1P2 Wistful trophy words: `maybe`, `kindly`, `somewhere`, `either`, `anywhere`, `carefully`, `near`, `calm`, `simple`, `patient` — **unchanged**.

Verified by reading the file at lines 1941, 1958, 2005, 2023, 2070, 2088, 2135, 2153, 2200, 2217, 2262, 2279, 2325, 2343, 2390, 2407, 2453, 2471, 2517, 2535 — same `trophy(...)` calls as before this pass.

## Duplicate Check Results

`npx tsx scripts/test-guided-trophy-word-uniqueness.ts` after the edit:

- **6 passed, 0 failed.**
- A1P1 ↔ A1P2 same-vibe duplicates: **none**.
- Within-A1P2 duplicates: **none** (10 distinct Sharp words, 10 distinct Bright, 10 distinct Wistful, no cross-vibe collisions within the path).
- Cross-path informational repeats involving the new Sharp words: **none**. `spelling`, `sign`, `option`, `stock`, `printed`, `correct` do not appear anywhere else in the active A1P1–A1P5 set.
- Pre-existing informational repeats (kept words): `direct` still appears at A1P2 L8 sharp + A1P3 L3 sharp + A1P5 L3 sharp (unchanged; informational, not a same-vibe-with-A1P1 collision).

## Confirmation Block

- `frontend/src/data/guidedLessons.ts` — A1P2 Sharp only updated (6 trophyWord calls + 1 songSeed mood). A1P1, A1P2 Bright, A1P2 Wistful, A1P3, A1P4, A1P5 trophyWord calls are **byte-identical** to pre-pass.
- `frontend/src/data/guidedTrophySongs.ts` — **unchanged**.
- `frontend/public/guided/trophy-songs/**` — **unchanged**.
- Audio manifests — **unchanged**.
- No audio generated this pass.
- No provider calls (KIE / Suno / ElevenLabs / OpenRouter untouched).
- No backend / Supabase / Music page / decks / words table / generation_jobs / credits / providers / normal generation pipeline touched.
- A1P3 / A1P4 / A1P5 Trophy Songs remain **BLOCKED**.

## A1P2 V2 Lyrics/Captions Are Now Stale for Sharp

Three A1P2 V2 lyrics+captions documents now contain stale Sharp content because they were written against the old (rejected) Sharp trophy words `short / note / here / this / any / now / two / direct / yes / wait`:

- [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md) (commit `64f8b87`) — Sharp rows stale; Bright and Wistful rows still valid.
- [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md) (commit `7d876dd`) — Sharp rows stale; Bright and Wistful rows still valid.
- [GUIDED_TROPHY_SONG_A1P2_V2_AUTHORING_REPORT.md](GUIDED_TROPHY_SONG_A1P2_V2_AUTHORING_REPORT.md) (commit `7d876dd`) — references stale Sharp trophy words in its summary tables; Bright and Wistful references still valid.

The earlier `7daf3f8` review-doc snapshot (recoverable via `git show 7daf3f8:docs/Product/GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md`) is also Sharp-stale.

**Resolution path:** regenerate the two Sharp lyrics + music captions only (Row 5 seg-1 sharp, Row 6 seg-2 sharp) in a follow-up pass — see the next-prompt block below. Bright and Wistful rows do not need to be re-authored.

## Checks Run

Working from `/d/CODING/ResonanceTEST/orchestrator/frontend`:

| Command | Result |
|---|---|
| `npx tsx scripts/test-guided-trophy-word-uniqueness.ts` | 6 passed, 0 failed |
| `npx tsx scripts/test-guided-vibes.ts` | 98 passed, 0 failed |
| `npx tsx scripts/test-guided-today-data.ts` | 7189 passed, 0 failed |
| `npx eslint src/data/guidedLessons.ts scripts/test-guided-trophy-word-uniqueness.ts` | no errors |
| `npm run build` | built in 1.17s, no errors |
| `git diff --check` | clean |
| `git diff --cached --check` | clean (at commit time) |

Trophy-song-specific tests (`test-guided-trophy-songs.ts`, `test-guided-trophy-cloze.ts`) deliberately not run yet — they reference `guidedTrophySongs.ts` rows that still ship the *old* A1P2 Sharp trophy-word arrays. Those tests will need to be re-run as part of the eventual A1P2 V2 runtime-wiring pass, after lyrics regeneration and product approval.

## Next Prompt — Regenerate A1P2 V2 Sharp Lyrics + Music Captions Only

Use this as the next handoff once these new Sharp trophy words are reviewed and accepted.

---

> **A1P2 V2 — SHARP LYRICS + MUSIC CAPTIONS REGENERATION (NO AUDIO, BRIGHT/WISTFUL UNTOUCHED)**
>
> Canonical repo: `D:\CODING\ResonanceTEST\orchestrator`. Work on main only.
>
> Inputs:
> - The newly accepted A1P2 Sharp trophy words from `frontend/src/data/guidedLessons.ts` after this revision: segment 1 sharp = `short / spelling / sign / option / stock`; segment 2 sharp = `now / printed / direct / correct / wait`.
> - Musical Design Framework V2 (§3) and Vibe-as-Performance-Attitude (§4) in [GUIDED_TROPHY_SONG_MUSICALITY_RESET_V2.md](GUIDED_TROPHY_SONG_MUSICALITY_RESET_V2.md).
> - Lyric Direction V2 (§7) in the same report.
> - Two existing Sharp constructions from the latest V2.1 review pack: Row 5 = S2 Crisp Funk-Bass Precision; Row 6 = S5 Drumline Precision (kept as the starting style choice; deviation is allowed but must be argued).
> - Existing Bright and Wistful rows from [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md) — still valid; do NOT re-author them.
>
> Mission:
> - Produce two new A1P2 V2 Sharp lyrics + captions (Row 5 seg-1 sharp; Row 6 seg-2 sharp) against the new Sharp trophy words.
> - Surface them in a new doc at `docs/Product/GUIDED_TROPHY_SONG_A1P2_V2_SHARP_LYRICS_REGEN_V1.md` (or update [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md) in place, marking the new Sharp rows and superseding the stale Sharp rows).
> - For each of the two rows: state the chosen style construction (default S2 / S5), state the eight-axis decomposition explicitly, give the full `musicCaption`, give the full `rawLyricsWithWrappers` with exactly one wrapped occurrence per trophy word, give the derived `providerLyrics` and `displayLyrics`, give the full `lyricsTranslationDe`, give a cloze-position rationale per trophy word, give review notes.
> - Apply the creative stance from §7: real small song, not a vocabulary worksheet. The new Sharp trophy words (`spelling`, `sign`, `option`, `stock`, `printed`, `correct`) are content-bearing nouns/adjectives and should sit inside complete sentences with real actions, not in adjective/word stacks.
>
> Do not:
> - generate audio
> - modify `frontend/src/data/guidedTrophySongs.ts`
> - modify `frontend/src/data/guidedLessons.ts`
> - re-author Bright or Wistful rows
> - touch backend, providers, KIE/Suno/ElevenLabs, Music page integration, Supabase, decks, words, generation_jobs, credits, or the normal generation pipeline
> - propose A1P3–A1P5 in this pass
>
> Checks (only if any runtime file is modified — for this pass none should be):
> - `npx tsx scripts/test-guided-trophy-songs.ts`
> - `npx tsx scripts/test-guided-trophy-cloze.ts`
> - `npx tsx scripts/test-guided-vibes.ts`
> - `npx tsx scripts/test-guided-today-data.ts`
> - `npx tsx scripts/test-guided-trophy-word-uniqueness.ts`
> - `git diff --check`
> - `git diff --cached --check`
>
> Final response should include:
> - path of the new (or updated) Sharp-lyrics doc
> - confirmation that no runtime files were modified
> - confirmation that no audio was generated
> - confirmation that A1P2 V2 audio remains blocked pending product review of the new Sharp rows
> - confirmation that Bright and Wistful rows were NOT re-authored
> - recommended next step (product-owner review checklist for the new Sharp rows, then audio regeneration if approved)

---

## Summary

- 6 A1P2 Sharp trophy words revised: `note → spelling`, `here → sign`, `this → option`, `any → stock`, `two → printed`, `yes → correct`.
- 4 A1P2 Sharp trophy words kept: `short`, `now`, `direct`, `wait` — not on the product-owner rejection list and each carries real Sharp posture in its lesson scene.
- A1P2 Bright and Wistful trophy words: untouched.
- A1P1, A1P3, A1P4, A1P5 trophy words: untouched.
- Within-A1P2 uniqueness: 30 of 30 distinct.
- A1P1 ↔ A1P2 same-vibe duplicates: 0.
- All six new Sharp words have no cross-path informational repeats in A1P3 / A1P4 / A1P5.
- One songSeed mood cleaned up (L2: `short note` → `clean spelling`).
- `guidedTrophySongs.ts` untouched; A1P2 V2 lyrics/captions Sharp rows are now stale and will be regenerated in the next pass.
- A1P2 / A1P3 / A1P4 / A1P5 Trophy Songs remain BLOCKED.
- Uniqueness test + vibes test + today-data test + ESLint + `npm run build` + both `git diff --check` invocations: clean.
