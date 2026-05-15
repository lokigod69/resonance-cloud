# Guided Trophy Song A1P1 Review Report

Date: 2026-05-15
Scope: A1P1 Guided Trophy Song catalog and A/B candidate readiness review.

## Files Inspected

- `frontend/src/data/guidedTrophySongs.ts`
- `frontend/src/lib/trophySongsClient.ts`
- `frontend/src/components/today/trophy/TrophySongPanel.tsx`
- `frontend/src/components/today/trophy/TrophySongPlayer.tsx`
- `frontend/src/components/today/trophy/TrophyLyricClozeDrill.tsx`
- `frontend/public/guided/trophy-songs/a1p1/manifest.json`
- `frontend/public/guided/trophy-songs/a1p1/**/candidate-a.mp3`
- `frontend/public/guided/trophy-songs/a1p1/**/candidate-b.mp3`
- `frontend/scripts/test-guided-trophy-songs.ts`
- `frontend/scripts/test-guided-vibes.ts`
- `frontend/scripts/test-guided-today-data.ts`
- `docs/Product/GUIDED_TROPHY_LYRIC_FORMULA_V1_1.md`
- `docs/Product/GUIDED_TROPHY_SONG_A1P1_AB_PRODUCT_REVIEW_MATRIX.md`

## Files Changed

- `docs/Product/GUIDED_TROPHY_SONG_A1P1_AB_PRODUCT_REVIEW_MATRIX.md`
- `docs/Product/GUIDED_TROPHY_SONG_A1P1_REVIEW_REPORT.md`

No frontend runtime files were changed in this pass.

## Matrix

Matrix path:

`docs/Product/GUIDED_TROPHY_SONG_A1P1_AB_PRODUCT_REVIEW_MATRIX.md`

## Preferred Candidates

| Catalog ID | Preferred candidate |
|---|---|
| `english-a1-practical-1-segment-1-bright-trophy-song` | Keep A for now |
| `english-a1-practical-1-segment-2-bright-trophy-song` | Keep A for now |
| `english-a1-practical-1-segment-1-wistful-trophy-song` | Keep A for now |
| `english-a1-practical-1-segment-2-wistful-trophy-song` | Keep A for now |
| `english-a1-practical-1-segment-1-sharp-trophy-song` | Keep A for now |
| `english-a1-practical-1-segment-2-sharp-trophy-song` | Keep A for now |

Reason: Candidate A is already the active default across all rows, all Candidate A files exist, all Candidate B files exist, and no technical blocker was found. Candidate B remains available for learner switching and later human listening review.

## Verification Findings

- All six catalog rows exist.
- Every row has five trophy words.
- Every raw lyric has exactly five wrapped occurrences.
- Every wrapped word matches a row trophy word.
- `providerLyrics` has no wrappers.
- `displayLyrics` has no wrappers.
- `lyricsTranslationDe` exists.
- Cloze positions are derivable.
- Candidate A/B metadata exists for all six rows.
- All referenced Candidate A/B MP3 files exist under `frontend/public`.
- Manifest entries exist for all six rows.
- Candidate selection is catalog-scoped through `guided_trophy_song_candidate_<catalogId>`.
- Candidate switching changes only the MP3 source; lyrics, translations, trophy words, cloze positions, and study metadata stay canonical.
- Display lyrics and German translations are available through the Trophy page data contract.
- A1P1 lyrics were not rewritten.
- A1P2-A1P5 generation was not started.

## Blockers

No technical blocker was found for limited A1P1 test exposure.

## Non-Blocking Quality Notes

- Human listening review is still needed before declaring final preferred candidates.
- Candidate B for Wistful Segment 2 is 179.4s, longer than the rest of the set; review pacing before promoting it.
- Formula V1.1 should guide future songs toward stronger hooks and clearer memory anchors, but the current A1P1 lyrics are safe enough to test without rewrite.
- The current lyric recognition task remains a placeholder. It validates the wrapped-lyrics metadata path but is not the final recognition UX.

## A1P1 Test Exposure Readiness

A1P1 Trophy Song is ready for limited test exposure with Candidate A active by default.

Conditions:

- Treat Candidate B as available but unranked.
- Treat recognition as placeholder-level.
- Collect listening feedback on A/B candidates before finalizing preferred active candidates.

## Formula V1.1 Readiness

Formula V1.1 is ready to use for A1P2-A1P5 lyric generation planning.

Do not start A1P2-A1P5 generation until the product owner explicitly approves the next generation pass and confirms whether A1P1 A/B review feedback should alter the formula.

## Explicit Non-Changes

No Supabase schema or persistence was touched.
No backend generation pipeline code was touched.
No `submit_generation` code was touched.
No `request_word_retry` code was touched.
No Music page integration was touched.
No decks, words, generation jobs, credits, pricing, ElevenLabs, KIE, Suno provider flow, live TTS, Speak internals, Study internals, or lesson videos were touched.
No audio files were changed.
No songs were generated.
No A1P1 lyrics were rewritten.

## Checks Run

- `npx tsx scripts/test-guided-trophy-songs.ts` - passed, 99/99 assertions
- `npx tsx scripts/test-guided-vibes.ts` - passed, 98/98 assertions
- `npx tsx scripts/test-guided-today-data.ts` - passed, 4510/4510 assertions
- `npm run build` - passed; existing Vite warnings about Supabase dynamic import and large chunks remain
- targeted ESLint - not run because no frontend code changed in this pass
- `git diff --check` - passed
- `git diff --cached --check` - passed

## Recommended Next Implementation Prompt

Proceed with a human product listening review of all A1P1 Candidate A/B MP3s using the matrix, then approve one of these paths:

1. keep Candidate A active for all six rows and begin A1P2-A1P5 lyric generation with Formula V1.1;
2. switch selected A1P1 rows to Candidate B before exposure;
3. hold A1P2-A1P5 generation until a final lyric-recognition UX direction is chosen.
