# Guided Trophy Song — A1P2 V2.2 Authoring Report

Date: 2026-05-16
Author: Claude (authoring refresh pass V2.2)
Repo: d:\CODING\ResonanceTEST\orchestrator
Branch: main
Scope: docs only. Authoring-only deliverable. No runtime files modified. No audio generated.

## Mission

Refresh the six A1P2 V2 Trophy Song lyrics + music captions after the A1P2 Sharp trophy-word quality revision (commit `b0c23e8`). Sharp rows had to be fully rewritten around the new Sharp trophy words; Bright and Wistful rows carry forward unchanged from V2.1 because their trophy words were not affected.

## Files Changed

- [docs/Product/GUIDED_TROPHY_SONG_A1P2_V2_2_LYRICS_CAPTIONS_REVIEW.md](GUIDED_TROPHY_SONG_A1P2_V2_2_LYRICS_CAPTIONS_REVIEW.md) — **new** (this pass).
- [docs/Product/GUIDED_TROPHY_SONG_A1P2_V2_2_AUTHORING_REPORT.md](GUIDED_TROPHY_SONG_A1P2_V2_2_AUTHORING_REPORT.md) — **new** (this file).

No edits to any runtime file. `guidedLessons.ts`, `guidedTrophySongs.ts`, providers, Music page, backend, Supabase, audio assets, manifests — all untouched.

Earlier A1P2 V2 drafts retained in-repo for traceability:
- [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md) — commit `64f8b87`, original B6/B10/W4/W2/S2/S5 draft. **Sharp-stale** after the trophy-word revision.
- [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md) — commit `7d876dd`, V2.1 review pack. **Sharp-stale** after the trophy-word revision.
- [GUIDED_TROPHY_SONG_A1P2_V2_AUTHORING_REPORT.md](GUIDED_TROPHY_SONG_A1P2_V2_AUTHORING_REPORT.md) — commit `7d876dd`, V2.1 authoring report. Sharp-stale references.

## Final A1P2 Trophy Words Used (from current `guidedLessons.ts`)

| Segment | Vibe | Trophy words (5) |
|---|---|---|
| 1 | bright | happy, warm, right, fine, fresh |
| 1 | wistful | maybe, kindly, somewhere, either, anywhere |
| 1 | sharp | **short, spelling, sign, option, stock** |
| 2 | bright | easy, neat, kind, sure, cheerful |
| 2 | wistful | carefully, near, calm, simple, patient |
| 2 | sharp | **now, printed, direct, correct, wait** |

Bold = revised in commit `b0c23e8`. Plain = stable since commit `8769af5`.

## Rows Authored

| Row | Catalog id (future) | Segment | Vibe | Style construction | Change vs V2.1 |
|---|---|---|---|---|---|
| 1 | english-a1-practical-2-segment-1-bright-trophy-song | 1 | bright | B6 — Soft Funk Open Window | **unchanged** (trophy words still valid) |
| 2 | english-a1-practical-2-segment-2-bright-trophy-song | 2 | bright | B10 — Highlife Walk | **unchanged** (trophy words still valid) |
| 3 | english-a1-practical-2-segment-1-wistful-trophy-song | 1 | wistful | W4 — Shoegaze Pulse | **unchanged** (trophy words still valid) |
| 4 | english-a1-practical-2-segment-2-wistful-trophy-song | 2 | wistful | W2 — Dub-Techno Memory Loop | **unchanged** (trophy words still valid) |
| 5 | english-a1-practical-2-segment-1-sharp-trophy-song | 1 | sharp | S2 — Crisp Funk-Bass Precision | **fully rewritten** — new trophy words `short / spelling / sign / option / stock` |
| 6 | english-a1-practical-2-segment-2-sharp-trophy-song | 2 | sharp | S5 — Drumline Precision | **fully rewritten** — new trophy words `now / printed / direct / correct / wait` |

Style constructions (B6 / B10 / W4 / W2 / S2 / S5) carried forward from V2.1 — the Sharp-word revision did not change the *musical* direction of the Sharp rows, only the trophy-word targets the lyrics are built around. Captions were updated where the explicit trophy-word diction list changed (Rows 5 and 6).

## Which Rows Were Changed From V2.1

- **Row 1, Row 2 (Bright):** byte-identical lyric / caption / German content to V2.1.
- **Row 3, Row 4 (Wistful):** byte-identical lyric / caption / German content to V2.1.
- **Row 5 (seg-1 sharp):** lyric, caption diction list, and German all rewritten. New trophy words `short / spelling / sign / option / stock` are content-bearing nouns and adjectives that carry the line. New chorus is a three-question service-counter scene ("The sign says open until ten / First option on the right / In stock today?") instead of the V2.1 utility-deictic chorus.
- **Row 6 (seg-2 sharp):** lyric, caption diction list, and German all rewritten. `printed` replaces V2.1's `two` (V1 line 2 now asks for a printed receipt instead of stacking a number); `correct` replaces V2.1's `yes` (chorus confirmation reads as grown-up Sharp instead of basic affirmation); bridge keeps the drumline/street image with `wait` cloze on a verb.

## Trophy Word Wrap Inventory (per row)

Each row uses exactly one `<<wrapped>>` occurrence per trophy word.

| Row | Wrap locations |
|---|---|
| 1 bright seg-1 | happy (chorus L1), warm (chorus L3 first), fresh (chorus L3 second), right (chorus L4), fine (verse 2 L2) |
| 2 bright seg-2 | neat (verse 1 L3), easy (chorus L1), kind (chorus L2), sure (chorus L3), cheerful (bridge L4) |
| 3 wistful seg-1 | maybe (verse 1 L1), kindly (verse 2 L1), somewhere (chorus L1), either (chorus L2), anywhere (chorus L3) |
| 4 wistful seg-2 | carefully (section 1 L2), near (section 1 L3), calm (section 2 L3), simple (section 3 L1), patient (section 3 L4) |
| 5 sharp seg-1 | short (verse 1 L1), spelling (verse 1 L3), sign (chorus L1), option (chorus L2), stock (chorus L3) |
| 6 sharp seg-2 | now (verse 1 L1), printed (verse 1 L2), direct (chorus L1), correct (chorus L2), wait (bridge L3) |

30 wraps across 30 distinct trophy words. Zero cross-row wrapped collisions.

## What Was NOT Done

- No runtime files modified.
- No audio generated.
- No provider calls made.
- No audio manifests touched.
- No edits to `frontend/src/data/guidedTrophySongs.ts`.
- No edits to `frontend/src/data/guidedLessons.ts`.
- No backend, Music page, Supabase, decks, words, generation_jobs, credits, provider, or normal-generation-pipeline changes.
- No A1P1, A1P3, A1P4, or A1P5 work — those paths remain blocked.

## Whether Runtime Files Changed

No. Only the two new docs above. `git status` confirms no changes under `frontend/src/`, `frontend/public/`, `frontend/scripts/`, or any backend / pipeline path.

## Whether Audio Was Generated

No. No provider calls. No new MP3 files under `frontend/public/guided/trophy-songs/a1p2/`. No manifest changes.

## Whether Ready for Product-Owner Lyric/Caption Approval

Yes. Six rows are reviewable on the page at [GUIDED_TROPHY_SONG_A1P2_V2_2_LYRICS_CAPTIONS_REVIEW.md](GUIDED_TROPHY_SONG_A1P2_V2_2_LYRICS_CAPTIONS_REVIEW.md).

Suggested checklist:
1. Read the full `rawLyricsWithWrappers` for each row aloud — does it sound like a real short song?
2. Read the full `lyricsTranslationDe` — does the German make sense for a German-native A1 learner of English?
3. Read each `musicCaption` — specific enough that a provider can't default into one of the V1 attractors?
4. For Rows 5 and 6 (the rewritten Sharp rows): is the cloze position for each new trophy word the right musical beat?
5. Spot-check that no row repeats a trophy word three or more times in any single line.
6. Spot-check that no row has a "X means Y" definitional line.
7. Spot-check that no row has a vocabulary-stack chorus or outro.

## Checks Run

Working from `/d/CODING/ResonanceTEST/orchestrator/frontend`:

| Command | Result |
|---|---|
| `npx tsx scripts/test-guided-trophy-word-uniqueness.ts` | 6 passed, 0 failed |
| `npx tsx scripts/test-guided-vibes.ts` | 98 passed, 0 failed |
| `npx tsx scripts/test-guided-today-data.ts` | (run; see commit) |
| `git diff --check` | clean |
| `git diff --cached --check` | clean (at commit time) |

`npm run build` and trophy-song-specific tests intentionally not run for this pass because no runtime file was modified.

## Confirmation Block

- A1P1 / A1P3 / A1P4 / A1P5 — **unchanged**.
- `frontend/src/data/guidedLessons.ts` — **unchanged**.
- `frontend/src/data/guidedTrophySongs.ts` — **unchanged**.
- `frontend/public/guided/trophy-songs/a1p1/**` — **unchanged**.
- `frontend/public/guided/trophy-songs/a1p2/**` — **unchanged**.
- Audio manifests — **unchanged**.
- No audio generated.
- No provider calls.
- A1P3 / A1P4 / A1P5 Trophy Songs remain **BLOCKED**.

## Next Implementation Prompt — Runtime Wiring + A/B Audio (post product-owner approval)

Run this once the product owner has approved the six A1P2 V2.2 lyrics + captions.

---

> **A1P2 V2.2 — RUNTIME WIRING + A/B AUDIO GENERATION**
>
> Canonical repo: `D:\CODING\ResonanceTEST\orchestrator`. Work on main only.
>
> Inputs:
> - Product-owner-approved final lyrics + captions per row from [GUIDED_TROPHY_SONG_A1P2_V2_2_LYRICS_CAPTIONS_REVIEW.md](GUIDED_TROPHY_SONG_A1P2_V2_2_LYRICS_CAPTIONS_REVIEW.md). If any row was rejected, do not proceed for that row until a revised lyric/caption is approved.
> - Current A1P2 trophy words from `frontend/src/data/guidedLessons.ts` (already correct after commit `b0c23e8`).
>
> Mission:
> 1. Update the six A1P2 song-catalog rows in `frontend/src/data/guidedTrophySongs.ts` (`pathId: english-a1-practical-2`, segments 1 and 2 across bright / wistful / sharp):
>    - replace `trophyWords` with the V2.2 words (per segment, per vibe)
>    - replace `rawLyricsWithWrappers` with the approved lyric (one wrapped occurrence per trophy word)
>    - replace `musicCaption` with the approved caption
>    - replace `lyricsTranslationDe` with the approved German translation
>    - update `styleFamily` and `songStyleLabel` to match the approved style construction (V2.2 ships: `soft-funk-open-window`, `highlife-walk`, `shoegaze-pulse`, `dub-techno-memory-loop`, `crisp-funk-bass-precision`, `drumline-precision`)
>    - set `audioStatus: 'pending'` and clear any stale candidate URLs that point to V1 audio
> 2. Update the hardcoded `expectedTrophyWords` map in `scripts/test-guided-trophy-songs.ts` to the new A1P2 trophy words. A1P1 entries in that map must not change.
> 3. Run the full test grid:
>    - `npx tsx scripts/test-guided-trophy-songs.ts`
>    - `npx tsx scripts/test-guided-trophy-cloze.ts`
>    - `npx tsx scripts/test-guided-vibes.ts`
>    - `npx tsx scripts/test-guided-today-data.ts`
>    - `npx tsx scripts/test-guided-trophy-word-uniqueness.ts`
>    - `npx tsx scripts/test-guided-cross-vibe.ts`
> 4. Generate A/B candidate audio for the six A1P2 rows via `scripts/generate-guided-trophy-song-audio.ts` with asset collection `a1p2`. Wire returned MP3 paths into `audioCandidates.A.providerUrl` / `audioCandidates.B.providerUrl`, set `audioStatus: 'ready'`, confirm `audioPublicUrl` resolves to candidate A under `frontend/public/guided/trophy-songs/a1p2/<catalog-id>/candidate-a.mp3`.
> 5. Re-run the full test grid plus `npm run build` and targeted ESLint on the changed files.
>
> Do not:
> - touch A1P1 catalog rows (unchanged)
> - touch A1P3 / A1P4 / A1P5 (still blocked)
> - touch backend, providers other than the audio-generator script, Music page integration, Supabase, decks, words table, generation_jobs, credits, or the normal generation pipeline beyond what the audio generator already does
> - modify `frontend/src/data/guidedLessons.ts` (lesson trophy words are already correct)
>
> Final response should include:
> - commit SHA(s)
> - files changed
> - the six new catalog rows' style families and trophy-word arrays
> - test results for all six scripts plus `npm run build`
> - confirmation of A1P2 A/B audio files present under `frontend/public/guided/trophy-songs/a1p2/`
> - confirmation that A1P3 / A1P4 / A1P5 remain blocked
> - a short product-owner listen-and-pick checklist for the new A1P2 A/B candidates

---

## Summary

- Six A1P2 V2.2 rows authored as a docs-only review pack at [GUIDED_TROPHY_SONG_A1P2_V2_2_LYRICS_CAPTIONS_REVIEW.md](GUIDED_TROPHY_SONG_A1P2_V2_2_LYRICS_CAPTIONS_REVIEW.md).
- Bright (Rows 1, 2) and Wistful (Rows 3, 4) carry forward unchanged from V2.1.
- Sharp (Rows 5, 6) fully rewritten around the new trophy words `short / spelling / sign / option / stock` and `now / printed / direct / correct / wait`.
- Style rotation unchanged: B6 / B10 / W4 / W2 / S2 / S5.
- All Lyric Direction V2 rules satisfied. All technical Trophy Song wrap constraints satisfied.
- No runtime files modified. No audio generated.
- A1P3 / A1P4 / A1P5 remain blocked.
- Ready for product-owner review.
