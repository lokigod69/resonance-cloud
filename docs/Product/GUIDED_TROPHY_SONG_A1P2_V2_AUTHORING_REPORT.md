# Guided Trophy Song — A1P2 V2 Authoring Report (V2.1)

Date: 2026-05-15
Author: Claude (authoring pass V2.1)
Repo: d:\CODING\ResonanceTEST\orchestrator
Branch: main
Scope: docs only. Authoring-only deliverable. No runtime files modified. No audio generated.

## Mission

Author six A1P2 V2 Trophy Song lyrics + music captions as reviewable documents only, against the revised A1P2 trophy words and the Musical Design Framework V2. This pass uses the V2 §6 **proposed** style rotation (B6 / B10 / W4 / W2 / S2 / S5) with targeted revisions to two weak spots from an earlier draft of the same rotation.

## Files Changed

- [docs/Product/GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md) — rewritten in this pass (V2.1 review pack).
- [docs/Product/GUIDED_TROPHY_SONG_A1P2_V2_AUTHORING_REPORT.md](GUIDED_TROPHY_SONG_A1P2_V2_AUTHORING_REPORT.md) — rewritten in this pass.

No edits to any runtime file. `guidedLessons.ts`, `guidedTrophySongs.ts`, providers, Music page, backend, Supabase, audio assets, manifests — all untouched.

Two earlier A1P2 V2 drafts remain in-repo for cross-draft comparison:
- [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md) — commit `64f8b87`, uses the proposed B6/B10/W4/W2/S2/S5 rotation. This V2.1 pack revises Row 4 section 4 and Row 6 bridge from that draft and otherwise mirrors its structure.
- Earlier `LYRICS_CAPTIONS_REVIEW.md` from commit `7daf3f8` — used an alternative B1/B8/W6/W1/S3/S6 rotation. That alternative is superseded by V2.1 at the same path but its content can be recovered from `git show 7daf3f8:docs/Product/GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md`.

## Rows Authored

| Row | Catalog id (future) | Segment | Vibe | Style construction |
|---|---|---|---|---|
| 1 | english-a1-practical-2-segment-1-bright-trophy-song | 1 | bright | **B6 — Soft Funk Open Window** |
| 2 | english-a1-practical-2-segment-2-bright-trophy-song | 2 | bright | **B10 — Highlife Walk** |
| 3 | english-a1-practical-2-segment-1-wistful-trophy-song | 1 | wistful | **W4 — Shoegaze Pulse** |
| 4 | english-a1-practical-2-segment-2-wistful-trophy-song | 2 | wistful | **W2 — Dub-Techno Memory Loop** |
| 5 | english-a1-practical-2-segment-1-sharp-trophy-song | 1 | sharp | **S2 — Crisp Funk-Bass Precision** |
| 6 | english-a1-practical-2-segment-2-sharp-trophy-song | 2 | sharp | **S5 — Drumline Precision** |

Each row in the review doc carries: catalog metadata; eight-axis musical design; full `musicCaption`; full `rawLyricsWithWrappers`; derived `providerLyrics`; derived `displayLyrics`; `lyricsTranslationDe`; cloze-position rationale per trophy word; review notes.

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

Two A1P2 V2 drafts now exist for product comparison:

- **This pack (V2.1) — B6 / B10 / W4 / W2 / S2 / S5.** V2 §6 proposed rotation; trades extreme tempo spread for strong intra-vibe instrumentation contrast (Bright funk vs Bright highlife; Wistful shoegaze vs Wistful dub-techno; Sharp funk-bass vs Sharp drumline).
- **Parallel draft at `git show 7daf3f8` — B1 / B8 / W6 / W1 / S3 / S6.** Deliberate alternative; wider tempo spread (~88 → ~170 bpm) but stays closer to "roots and brass and piano and trip-hop and DnB" palettes.

The V2 §6 variety constraints are satisfied by this pack:

| Constraint | Row that satisfies it |
|---|---|
| At least one Bright non-pop/roots/surf/funk/road | Row 1 (B6 funk pocket) |
| At least one Bright not handclap-pop | Row 1 (chorus-only handclap accent, not handclap-pop default) and Row 2 (no handclaps at all) |
| At least one Wistful rhythmic/electronic | Row 3 (W4 shoegaze, buried rock pulse), Row 4 (W2 dub-techno, kick on 1+3) |
| At least one Wistful non-sleepy | Row 4 driving at ~118 bpm |
| At least one Sharp non-synth | Row 5 (S2 funk bass, no synth), Row 6 (S5 drumline, no synth) |
| At least one Sharp not minimal-electro | Rows 5 + 6 both qualify |

Intra-vibe differentiation:
- **Bright (B6 vs B10):** B6 funk pocket at ~108 bpm with Rhodes pad on chorus; B10 highlife walk at ~100 bpm with conga at centre and no kit. Different rhythmic centres entirely.
- **Wistful (W4 vs W2):** W4 shoegaze at ~104 bpm with rock pulse buried under guitar wash; W2 dub-techno at ~118 bpm with sparse dub pulse and no kit. Different production texture and harmonic posture.
- **Sharp (S2 vs S5):** S2 funk-bass at ~108 bpm carrying harmony in the bass; S5 drumline at ~112 bpm with no harmonic instrument under the verses, brass only on chorus. Different harmonic carriers.

Segment 1 lessons (don't understand → write down → show me → which one → do you have) lean lighter/warmer; segment 2 (pay → receipt → reservation → confirm → pause) leans more conclusive/closing. The style rotation honours that.

## Revisions From the Earlier Same-Rotation Draft

Two weak spots from commit `64f8b87` were rewritten:

| Row | Section | Before | After | Reason |
|---|---|---|---|---|
| 4 | Section 4 | "Near the door, near the desk / Carefully the small machine / Calm at the reservation / Simple at the queue" | "Slow check at the desk / The light comes back to green / A whole quiet hour between / And the booking holds the room" | Adjective-stack list-line replaced by a content-bearing image that still belongs to the dub-techno texture. |
| 5 | Bridge | "Short answer, short question / Note clean, address set / Here on the corner — there on the map / Any one will work tonight" | "The note is in my pocket / The address is clean / Here on the corner, there on the map / Any one will work tonight" | Compact-list opening replaced by full subject-predicate phrases. |
| 6 | Bridge | "Now is now and two is two / Direct is one clean line / Yes is one clean word back / Wait means one clean beat" | "The snare on the corner counts me off / Brass on the stair, brass at the door / I <<wait>> for the green to turn / And cross when the count says go" | "X is X" / "X means Y" definitional lines replaced by a real drumline/street image; `wait` cloze preserved on a verb (waiting for a traffic light) instead of on a definitional refrain. |

All other rows are reauthored from scratch against the V2 framework with light verbal tightening (e.g. "I'm" → "I am" / "you are" in lines where the contraction was being repeated across multiple lines and a fuller form scans better with the spoken-sung pocket).

## Trophy Word Wrap Inventory (per row)

Each row uses exactly one `<<wrapped>>` occurrence per trophy word. Unwrapped occurrences are unconstrained.

| Row | Wrap locations (line, position) |
|---|---|
| 1 bright seg-1 | happy (chorus L1), warm (chorus L3 first), fresh (chorus L3 second), right (chorus L4), fine (verse 2 L2) |
| 2 bright seg-2 | neat (verse 1 L3), easy (chorus L1), kind (chorus L2), sure (chorus L3), cheerful (bridge L4) |
| 3 wistful seg-1 | maybe (verse 1 L1), kindly (verse 2 L1), somewhere (chorus L1), either (chorus L2), anywhere (chorus L3) |
| 4 wistful seg-2 | carefully (section 1 L2), near (section 1 L3), calm (section 2 L3), simple (section 3 L1), patient (section 3 L4) |
| 5 sharp seg-1 | short (verse 1 L1), note (verse 1 L3), here (chorus L1), this (chorus L2), any (chorus L3) |
| 6 sharp seg-2 | now (verse 1 L1), two (verse 1 L2), direct (chorus L1), yes (chorus L2), wait (bridge L3) |

All six rows: 5 wraps each, total 30 wraps across 30 distinct trophy words. Zero cross-row wrapped collisions.

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

Yes. The six lyrics + captions are reviewable at [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md).

Suggested product-owner review checklist:

1. For each row, read the full `rawLyricsWithWrappers` aloud. Does it sound like a real short song, not a vocabulary worksheet?
2. For each row, read the full `lyricsTranslationDe`. Does the German make sense for a German-native A1 learner of English?
3. For each row, read the `musicCaption`. Is it specific enough that a music provider can't default into one of the V1 attractors (handclap-pop / sleepy folk / minimal synth)?
4. Compare each row against the parallel rotation at `git show 7daf3f8:docs/Product/GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md`. Per row, pick one of: (a) this V2.1 pack, (b) the parallel B1/B8/W6/W1/S3/S6 alternative, (c) a per-row merge, (d) reject and respec.
5. Confirm the six chosen style constructions are acceptable as a set — does the catalog feel varied immediately on first listen?
6. Confirm the wrap positions land on the strongest musical beats for each trophy word.
7. Spot-check that no row repeats a trophy word three or more times in any single line.
8. Spot-check that no row has a "X means Y" definitional line.
9. Spot-check that no row has a vocabulary-stack chorus or outro.

If product owner approves a set (mix and match per row is fine): the next pass runs the next implementation prompt below to wire approved rows into `guidedTrophySongs.ts` and generate A/B audio.

## Checks Run

Working from `/d/CODING/ResonanceTEST/orchestrator/frontend`:

| Command | Result |
|---|---|
| `npx tsx scripts/test-guided-vibes.ts` | 98 passed, 0 failed |
| `npx tsx scripts/test-guided-today-data.ts` | 5403 passed, 0 failed |
| `npx tsx scripts/test-guided-trophy-word-uniqueness.ts` | 6 passed, 0 failed |
| `git diff --check` | clean |
| `git diff --cached --check` | clean |

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

## Next Implementation Prompt (post product-owner approval)

Run this once the product owner has approved a final set of six A1P2 V2 lyrics + captions (either entirely from this V2.1 pack, entirely from the parallel B1/B8/W6/W1/S3/S6 draft at `git show 7daf3f8`, or a per-row merge).

---

> **A1P2 V2 — RUNTIME WIRING + A/B AUDIO GENERATION**
>
> Canonical repo: `D:\CODING\ResonanceTEST\orchestrator`. Work on main only.
>
> Inputs:
> - Product-owner-approved final lyrics + captions per row (six rows total). Approval set must be specified explicitly: for each row, point to the source doc (this V2.1 pack or the alternative at commit `7daf3f8` or the original at commit `64f8b87`) and quote the canonical `rawLyricsWithWrappers`, `musicCaption`, and `lyricsTranslationDe`.
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
>    - `npx tsx scripts/test-guided-trophy-songs.ts` — the test's hardcoded `expectedTrophyWords` map will need to be updated to the new words.
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
> - a short product-owner listen-and-pick checklist for the new A1P2 A/B candidates

---

## Summary

- Six A1P2 V2 rows authored as a docs-only review pack at [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md).
- Style rotation chosen: **B6 / B10 / W4 / W2 / S2 / S5** — the V2 §6 proposed rotation, with targeted revisions to two weak spots from the earlier same-rotation draft (Row 4 section 4, Row 6 bridge).
- An alternative B1 / B8 / W6 / W1 / S3 / S6 rotation is preserved at `git show 7daf3f8` for cross-draft comparison.
- All V2 §6 variety constraints satisfied; all technical Trophy Song wrap constraints satisfied.
- No runtime files modified. No audio generated.
- A1P3 / A1P4 / A1P5 remain blocked.
- Ready for product-owner review.
