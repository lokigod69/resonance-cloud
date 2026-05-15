# Guided Trophy Song A1P2 Formula V1.1 Report

Date: 2026-05-15
Scope: A1P2-only local/static Guided Trophy Song authoring, audio generation, and catalog wiring.

## Files Changed

- `frontend/src/data/guidedTrophySongs.ts`
- `frontend/scripts/generate-guided-trophy-song-audio.ts`
- `frontend/scripts/test-guided-trophy-songs.ts`
- `frontend/scripts/test-guided-trophy-cloze.ts`
- `frontend/public/guided/trophy-songs/a1p2/manifest.json`
- `frontend/public/guided/trophy-songs/a1p2/**/candidate-a.mp3`
- `frontend/public/guided/trophy-songs/a1p2/**/candidate-b.mp3`
- `docs/Product/GUIDED_TROPHY_SONG_A1P2_PRECHECK.md`
- `docs/Product/GUIDED_TROPHY_SONG_A1P2_FORMULA_V1_1_REPORT.md`

## A1P2 Catalog IDs Created

- `english-a1-practical-2-segment-1-bright-trophy-song`
- `english-a1-practical-2-segment-2-bright-trophy-song`
- `english-a1-practical-2-segment-1-wistful-trophy-song`
- `english-a1-practical-2-segment-2-wistful-trophy-song`
- `english-a1-practical-2-segment-1-sharp-trophy-song`
- `english-a1-practical-2-segment-2-sharp-trophy-song`

## Row Summary

| Catalog ID | Trophy words | Style family / label | Formula V1.1 notes |
|---|---|---|---|
| `english-a1-practical-2-segment-1-bright-trophy-song` | `lovely`, `glad`, `brilliant`, `ready`, `charming` | `sunlit-acoustic-pop` / Sunlit acoustic pop | Bright hook centers on "I'm glad you wrote it down"; `glad` repeats unwrapped as the memory anchor while all five study words have one wrapped occurrence. |
| `english-a1-practical-2-segment-2-bright-trophy-song` | `easy`, `splendid`, `kind`, `sure`, `cheerful` | `bright-handclap-pop` / Bright handclap pop | Reward-style chorus uses a compact "splendid little finish" shape; `cheerful`, `sure`, and `easy` repeat unwrapped to strengthen recall. |
| `english-a1-practical-2-segment-1-wistful-trophy-song` | `gently`, `slowly`, `perhaps`, `quiet`, `soft` | `moonlit-indie-folk` / Moonlit indie folk | Wistful hook uses "Keep it soft, keep it close"; `soft` repeats unwrapped as the highlight word without creating extra cloze positions. |
| `english-a1-practical-2-segment-2-wistful-trophy-song` | `again`, `near`, `calm`, `simple`, `patient` | `soft-downtempo-folk` / Soft downtempo folk | Chorus anchors on "Stay calm, stay close"; `patient` and `again` repeat unwrapped for a gentle memory hook. |
| `english-a1-practical-2-segment-1-sharp-trophy-song` | `clear`, `quick`, `exactly`, `decided`, `certain` | `clean-synth-grid` / Clean synth grid | Sharp hook is compact and rhythmic: "Exactly there, no second guess"; short lines place trophy words on clear stress points. |
| `english-a1-practical-2-segment-2-sharp-trophy-song` | `straight`, `focused`, `direct`, `settled`, `done` | `crisp-bass-pop` / Crisp bass pop | Sharp hook centers on "Done means done"; `done` repeats unwrapped as the high-contrast memory anchor. |

## Audio Generation

Audio generation was completed using the existing isolated prototype helper:

`frontend/scripts/generate-guided-trophy-song-audio.ts`

The helper was retargeted to A1P2 only and writes under:

`frontend/public/guided/trophy-songs/a1p2/`

Exactly six KIE/Suno submits were created, one per A1P2 catalog row. `providerLyrics` was used for every submit. `rawLyricsWithWrappers` was not sent. Candidate A is active by default for all six rows. Candidate B is available for learner switching and later review.

| Catalog ID | KIE task ID | Candidate A | Candidate B | Active |
|---|---|---|---|---|
| `english-a1-practical-2-segment-1-bright-trophy-song` | `2681370212eefedf2fb679cebe2f66a7` | `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-1-bright-trophy-song/candidate-a.mp3` | `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-1-bright-trophy-song/candidate-b.mp3` | A |
| `english-a1-practical-2-segment-2-bright-trophy-song` | `9143a8ab70cebd5b218b4b4ab2c9b217` | `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-2-bright-trophy-song/candidate-a.mp3` | `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-2-bright-trophy-song/candidate-b.mp3` | A |
| `english-a1-practical-2-segment-1-wistful-trophy-song` | `fedcc4a4f8dbc547fdea56d79e089ff9` | `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-1-wistful-trophy-song/candidate-a.mp3` | `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-1-wistful-trophy-song/candidate-b.mp3` | A |
| `english-a1-practical-2-segment-2-wistful-trophy-song` | `af429ee28ce9145f70c13cd72de8022a` | `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-2-wistful-trophy-song/candidate-a.mp3` | `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-2-wistful-trophy-song/candidate-b.mp3` | A |
| `english-a1-practical-2-segment-1-sharp-trophy-song` | `a880204a97de5dc5c3260c256af8bc52` | `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-1-sharp-trophy-song/candidate-a.mp3` | `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-1-sharp-trophy-song/candidate-b.mp3` | A |
| `english-a1-practical-2-segment-2-sharp-trophy-song` | `a50efbc16f4714cf39497caede839119` | `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-2-sharp-trophy-song/candidate-a.mp3` | `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-2-sharp-trophy-song/candidate-b.mp3` | A |

Manifest status:

`frontend/public/guided/trophy-songs/a1p2/manifest.json` contains six `providerStatus: "success"` entries.

## Validation Results

- Every A1P2 row has exactly five trophy words.
- Every `rawLyricsWithWrappers` has exactly five wrapped occurrences.
- Every wrapped word matches one row trophy word.
- `providerLyrics` contains no `<<` or `>>`.
- `displayLyrics` contains no `<<` or `>>`.
- `lyricsTranslationDe` exists for every row.
- Cloze/study positions derive correctly.
- Candidate A and Candidate B files exist for every A1P2 row.
- A1P2 manifest entries exist for every A1P2 row.
- Candidate A is default for every A1P2 row.
- Candidate switching changes only MP3 source through `audioCandidates`.
- A1P1 remains six rows with Candidate A active.
- A1P3-A1P5 trophy songs were not generated.

## Checks Run

- `npx tsx scripts/test-guided-trophy-songs.ts` - passed, 216/216 assertions
- `npx tsx scripts/test-guided-trophy-cloze.ts` - passed, 36/36 assertions
- `npx tsx scripts/test-guided-vibes.ts` - passed, 98/98 assertions
- `npx tsx scripts/test-guided-today-data.ts` - passed, 4510/4510 assertions
- `npm run build` - passed; existing Vite warnings about Supabase dynamic import and large chunks remain
- `npx eslint src/data/guidedTrophySongs.ts scripts/generate-guided-trophy-song-audio.ts scripts/test-guided-trophy-songs.ts scripts/test-guided-trophy-cloze.ts` - passed
- `git diff --check` - passed
- `git diff --cached --check` - passed

## Checks Not Run

None. All requested existing checks were available and run.

## Explicit Non-Changes

A1P1 catalog rows were not intentionally changed.
A1P1 audio files were not changed.
A1P3-A1P5 trophy songs were not generated.
No Supabase schema or backend persistence was changed.
No Music page integration was changed.
No decks, words, generation jobs, credits, pricing, `submit_generation`, or `request_word_retry` were changed.
No normal generation pipeline or paid-provider architecture was changed.
No live TTS, lesson videos, or final lyric-recognition redesign was changed.

## Recommended Next Step

Create the A1P2 A/B product review matrix. If A1P2 passes product listening review, use this as the quality gate for A1P3-A1P5 rollout with Formula V1.1.
