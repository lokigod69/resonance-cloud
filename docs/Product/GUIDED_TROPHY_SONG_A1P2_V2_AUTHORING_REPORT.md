# Guided Trophy Song — A1P2 V2 Authoring Report

Date: 2026-05-15
Author: Claude (authoring pass)
Repo: d:\CODING\ResonanceTEST\orchestrator
Branch: main
Scope: docs only. Authoring-only deliverable. No runtime files modified. No audio generated.

## Mission

Author six A1P2 V2 Trophy Song lyrics + music captions as reviewable documents only, against the revised A1P2 trophy words and the Musical Design Framework V2.

## Files Changed

- [docs/Product/GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md) — **new** (this pass).
- [docs/Product/GUIDED_TROPHY_SONG_A1P2_V2_AUTHORING_REPORT.md](GUIDED_TROPHY_SONG_A1P2_V2_AUTHORING_REPORT.md) — **new** (this file).

No edits to any runtime file. `guidedLessons.ts`, `guidedTrophySongs.ts`, providers, Music page, backend, Supabase, audio assets, manifests — all untouched.

## Rows Authored

Six rows, one per (segment, vibe). Each row in the review doc carries: catalog metadata; eight-axis musical design; full `musicCaption`; full `rawLyricsWithWrappers`; derived `providerLyrics`; derived `displayLyrics`; `lyricsTranslationDe`; cloze-position rationale per trophy word; review notes.

| Row | Catalog id (future) | Segment | Vibe | Style construction |
|---|---|---|---|---|
| 1 | english-a1-practical-2-segment-1-bright-trophy-song | 1 | bright | **B1 — California Sofa-Rock Sunrise** |
| 2 | english-a1-practical-2-segment-2-bright-trophy-song | 2 | bright | **B8 — Brass-and-Guitar Daylight** |
| 3 | english-a1-practical-2-segment-1-wistful-trophy-song | 1 | wistful | **W6 — Trip-Hop Hallway** |
| 4 | english-a1-practical-2-segment-2-wistful-trophy-song | 2 | wistful | **W1 — Wistful Drum-and-Bass** |
| 5 | english-a1-practical-2-segment-1-sharp-trophy-song | 1 | sharp | **S3 — Staccato Piano Groove** |
| 6 | english-a1-practical-2-segment-2-sharp-trophy-song | 2 | sharp | **S6 — Brass-Hits and Tight Kit** |

## Revised Trophy Words Used (from `guidedLessons.ts`)

| Segment | Vibe | Trophy words (5) |
|---|---|---|
| 1 | bright | happy, warm, right, fine, fresh |
| 1 | wistful | maybe, kindly, somewhere, either, anywhere |
| 1 | sharp | short, note, here, this, any |
| 2 | bright | easy, neat, kind, sure, cheerful |
| 2 | wistful | carefully, near, calm, simple, patient |
| 2 | sharp | now, two, direct, yes, wait |

Source: [frontend/src/data/guidedLessons.ts](../../frontend/src/data/guidedLessons.ts) after the trophy-word source revision documented in [GUIDED_TROPHY_WORD_A1P2_SOURCE_REVISION_V1_REPORT.md](GUIDED_TROPHY_WORD_A1P2_SOURCE_REVISION_V1_REPORT.md). A1P2 has zero same-vibe collisions with A1P1.

## Why This Style Rotation

The Musicality Reset V2 §6 proposes one rotation (B6 / B10 / W4 / W2 / S2 / S5). The earlier V2 draft at [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md) (commit `64f8b87`) used that proposed rotation exactly.

This pass picks a different rotation (B1 / B8 / W6 / W1 / S3 / S6) for three reasons:

1. The brief for this pass explicitly says *"do not blindly copy the rotation table"*. A meaningful authoring deviation gives the product owner an alternative to compare against, rather than two drafts inside the same six style cells.
2. The variety constraints in V2 §6 must still be satisfied. They are:

   | Constraint | Row that satisfies it |
   |---|---|
   | At least one Bright non-pop/roots/surf/funk/road | Row 1 (B1 roots-rock) |
   | At least one Bright not handclap-pop | Row 1 (no handclaps) and Row 2 (brass-led, no handclaps) |
   | At least one Wistful rhythmic/electronic | Row 3 (W6 trip-hop) and Row 4 (W1 dnb) |
   | At least one Wistful non-sleepy | Row 4 at ~170 bpm half-time DnB |
   | At least one Sharp non-synth | Row 5 (S3 piano + kit) and Row 6 (S6 brass + kit) |
   | At least one Sharp not minimal-electro | Row 5 and Row 6 |

3. The chosen six are deliberately differentiated on multiple axes within each vibe pair:
   - **Bright pair (B1 vs B8)**: B1 is roots-rock at ~96 bpm with a Wurlitzer; B8 is brass-led at ~98 bpm with no organ. Different instrumentation centers and different rhythmic personalities (rock pulse vs brass-stab pulse).
   - **Wistful pair (W6 vs W1)**: W6 is ~88 bpm dusty trip-hop with half-time vocal close to the beat; W1 is ~170 bpm DnB with half-time vocal *across* the beat. Different tempo registers entirely.
   - **Sharp pair (S3 vs S6)**: S3 is piano + kit with no brass; S6 is brass + kit with no piano outside one chorus accent. Different harmonic carriers.

Lessons rooms 1–5 (segment 1) and rooms 6–10 (segment 2) are emotionally different journeys: segment 1 is repair (don't understand → write down → show me → which one → do you have) and segment 2 is conclusion (pay → receipt → reservation → confirm → pause). The style rotation honors that — segment 1 leans lighter/warmer, segment 2 leans more conclusive/closing.

## Trophy Word Wrap Inventory (per row)

Each row uses exactly one `<<wrapped>>` occurrence per trophy word. Unwrapped occurrences are unconstrained.

| Row | Wrap locations |
|---|---|
| 1 bright seg-1 | happy (chorus L1), warm (chorus L2), right (chorus L3), fresh (verse 2 close), fine (bridge L1) |
| 2 bright seg-2 | neat (verse 1 L3), kind (chorus L1), easy (chorus L2), sure (chorus L3), cheerful (bridge L1) |
| 3 wistful seg-1 | kindly (verse 1 L3), maybe (chorus L1), somewhere (chorus L1), either (chorus L2), anywhere (chorus L3) |
| 4 wistful seg-2 | carefully (verse 1 L3), near (chorus L1), patient (chorus L3), simple (verse 2 L3), calm (bridge L1) |
| 5 sharp seg-1 | short (verse 1 L1), note (verse 1 L3), here (chorus L1), this (chorus L2), any (chorus L3) |
| 6 sharp seg-2 | now (verse 1 L1), two (verse 1 L3), direct (pre-chorus L1), yes (chorus L1), wait (chorus L2) |

All six rows: 5 wraps each, total 30 wraps across 30 distinct trophy words.

## What Was NOT Done

- No runtime files modified.
- No audio generated.
- No provider calls made.
- No audio manifests touched.
- No edits to `frontend/src/data/guidedTrophySongs.ts`.
- No edits to `frontend/src/data/guidedLessons.ts`.
- No backend, Music page, Supabase, decks, words, generation_jobs, credits, provider, or normal-generation-pipeline changes.
- No A1P3, A1P4, or A1P5 work — those paths remain blocked.

## Ready for Product Review

Yes. The six lyrics + captions are reviewable on the page at [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md).

Suggested product-owner review checklist:
1. For each row, read the full `rawLyricsWithWrappers` aloud. Does it sound like a real short song, not a vocabulary worksheet?
2. For each row, read the full `lyricsTranslationDe`. Does the German make sense for a German-native A1 learner of English?
3. For each row, read the `musicCaption`. Is it specific enough that a music provider can't default into one of the V1 attractors (handclap-pop / sleepy folk / minimal synth)?
4. Compare each row against the equivalent row in the earlier draft at [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md). Per row, pick one of: (a) this draft, (b) earlier draft, (c) merge of both, (d) reject and respec.
5. Confirm the six chosen style constructions are acceptable as a set — does the catalog feel varied immediately on first listen?
6. Confirm the wrap positions land on the strongest musical beats for each trophy word.
7. Spot-check that no row repeats a trophy word three or more times in any single line.
8. Spot-check that no row has a "X means Y" definitional line.
9. Spot-check that no row has a vocabulary-stack chorus or outro.

If product owner approves a set (mix and match per row is fine): the next pass runs the §"next implementation prompt" below to wire approved rows into `guidedTrophySongs.ts` and generate A/B audio.

## Checks Run

Working from `/d/CODING/ResonanceTEST/orchestrator/frontend`:

| Command | Result |
|---|---|
| `npx tsx scripts/test-guided-vibes.ts` | 98 passed, 0 failed |
| `npx tsx scripts/test-guided-today-data.ts` | 4510 passed, 0 failed |
| `npx tsx scripts/test-guided-trophy-word-uniqueness.ts` | 6 passed, 0 failed |
| `git diff --check` | clean |
| `git diff --cached --check` | clean |

`npm run build` and trophy-song-specific tests are intentionally not run for this pass because no runtime file was modified.

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

## Next Implementation Prompt (post product-owner approval)

Run this once the product owner has approved a final set of six A1P2 V2 lyrics + captions (either entirely from this doc, entirely from the earlier draft, or a per-row merge).

---

> **A1P2 V2 — RUNTIME WIRING + A/B AUDIO GENERATION**
>
> Canonical repo: `D:\CODING\ResonanceTEST\orchestrator`. Work on main only.
>
> Inputs:
> - Product-owner-approved final lyrics + captions per row (six rows total). Approval set should be specified explicitly: for each row, point to the source doc (this review doc or the earlier `LYRICS_AND_CAPTIONS.md`) and quote the canonical `rawLyricsWithWrappers`, `musicCaption`, and `lyricsTranslationDe`.
> - Revised A1P2 trophy words from `frontend/src/data/guidedLessons.ts`.
>
> Mission:
> 1. Update the six A1P2 song-catalog rows in `frontend/src/data/guidedTrophySongs.ts` (`pathId: english-a1-practical-2`, segments 1 and 2 across bright / wistful / sharp):
>    - replace `trophyWords` with the revised words (per segment, per vibe)
>    - replace `rawLyricsWithWrappers` with the approved lyric (one wrapped occurrence per trophy word)
>    - replace `musicCaption` with the approved caption
>    - replace `lyricsTranslationDe` with the approved German translation
>    - update `styleFamily` and `songStyleLabel` to match the approved style construction
>    - set `audioStatus: 'pending'` and clear any stale candidate URLs that point to old audio
> 2. Run the existing test grid:
>    - `npx tsx scripts/test-guided-trophy-songs.ts` — this test's hardcoded `expectedTrophyWords` map will need to be updated to the new words.
>    - `npx tsx scripts/test-guided-trophy-cloze.ts`
>    - `npx tsx scripts/test-guided-vibes.ts`
>    - `npx tsx scripts/test-guided-today-data.ts`
>    - `npx tsx scripts/test-guided-trophy-word-uniqueness.ts`
>    - `npx tsx scripts/test-guided-cross-vibe.ts`
> 3. Generate A/B candidate audio for the six A1P2 rows via `scripts/generate-guided-trophy-song-audio.ts` with asset collection `a1p2`. Wire the returned MP3 paths into `audioCandidates.A.providerUrl` / `audioCandidates.B.providerUrl`, set `audioStatus: 'ready'`, and confirm `audioPublicUrl` resolves to candidate A under `frontend/public/guided/trophy-songs/a1p2/<catalog-id>/candidate-a.mp3`.
> 4. Re-run the full test grid plus `npm run build` and targeted ESLint on the changed files.
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
> - A short product-owner listen-and-pick checklist for the new A1P2 A/B candidates

---

## Summary

- Six A1P2 V2 rows authored as a docs-only reviewable draft at [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md).
- Style rotation chosen: **B1 / B8 / W6 / W1 / S3 / S6** — a deliberate alternative to the §6 proposal (B6 / B10 / W4 / W2 / S2 / S5) used in the earlier draft at [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md).
- All six V2 §6 variety constraints satisfied; all technical Trophy Song wrap constraints satisfied.
- No runtime files modified. No audio generated.
- Two A1P2 V2 drafts now exist; product owner picks per row.
- A1P3 / A1P4 / A1P5 remain blocked.
- Ready for product-owner review.
