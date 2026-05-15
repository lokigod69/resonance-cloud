# Guided Trophy Song A1P2 Precheck

Date: 2026-05-15
Scope: precheck for applying the local/static Guided Trophy Song pattern to `english-a1-practical-2`.

## Existing A1P1 Catalog Structure

A1P1 trophy songs live in `frontend/src/data/guidedTrophySongs.ts`.

The current catalog has six A1P1 rows:

- segment 1 / Bright
- segment 2 / Bright
- segment 1 / Wistful
- segment 2 / Wistful
- segment 1 / Sharp
- segment 2 / Sharp

Each row contains:

- `id`
- `pathId`
- `segment`
- `vibe`
- `trophyWords`
- `styleFamily`
- `songStyleLabel`
- `musicCaption`
- `rawLyricsWithWrappers`
- derived `providerLyrics`
- derived `displayLyrics`
- `lyricsTranslationDe`
- derived `studyLines`
- derived `clozePositions`
- `audioCandidates`
- `activeCandidateDefault`
- `audioPublicUrl`
- `audioStatus`

The catalog helper derives `providerLyrics`, `displayLyrics`, `studyLines`, and `clozePositions` from `rawLyricsWithWrappers`, so wrappers remain app-side study metadata only.

## A1P2 Path / Segment / Vibe Structure

A1P2 path ID:

`english-a1-practical-2`

A1P2 has 10 lessons and the same active launch vibes as A1P1:

- Bright
- Wistful
- Sharp

A1P2 follows the same two-segment split:

- Segment 1: lessons 1-5
- Segment 2: lessons 6-10

## A1P2 Lesson And Trophy Word Source

A1P2 lessons and trophy words come from:

`frontend/src/data/guidedLessons.ts`

The row source is accessed through:

- `getGuidedPathLessons('english-a1-practical-2')`
- `resolveGuidedLessonVariant(lesson, vibe)`
- `variant.trophyWord.word`
- `variant.songSeed`

Discovered A1P2 trophy words:

| Segment | Vibe | Trophy words |
|---:|---|---|
| 1 | Bright | `lovely`, `glad`, `brilliant`, `ready`, `charming` |
| 2 | Bright | `easy`, `splendid`, `kind`, `sure`, `cheerful` |
| 1 | Wistful | `gently`, `slowly`, `perhaps`, `quiet`, `soft` |
| 2 | Wistful | `again`, `near`, `calm`, `simple`, `patient` |
| 1 | Sharp | `clear`, `quick`, `exactly`, `decided`, `certain` |
| 2 | Sharp | `straight`, `focused`, `direct`, `settled`, `done` |

## Existing A1P2 Trophy Song Rows / Assets

Before this pass, no A1P2 trophy-song catalog rows existed in `frontend/src/data/guidedTrophySongs.ts`.

Before this pass, no A1P2 trophy-song MP3 assets existed under:

`frontend/public/guided/trophy-songs/a1p2/`

## Expected A1P2 Catalog IDs

- `english-a1-practical-2-segment-1-bright-trophy-song`
- `english-a1-practical-2-segment-2-bright-trophy-song`
- `english-a1-practical-2-segment-1-wistful-trophy-song`
- `english-a1-practical-2-segment-2-wistful-trophy-song`
- `english-a1-practical-2-segment-1-sharp-trophy-song`
- `english-a1-practical-2-segment-2-sharp-trophy-song`

## Validation Script Status

Existing script:

`frontend/scripts/test-guided-trophy-songs.ts`

Before this pass, the script expected exactly six rows and therefore required extension for A1P2. It already validates wrapper safety, German translation presence, derived cloze positions, audio candidate metadata, MP3 existence, and localStorage candidate persistence.

The A1P2 extension should preserve A1P1 validation while expecting 12 total rows after A1P2 is added.

## Audio Generation Process Status

Existing isolated prototype generator:

`frontend/scripts/generate-guided-trophy-song-audio.ts`

Before this pass, the script targeted only A1P1 and wrote only the A1P1 manifest. It is an established local/static trophy-song audio helper, not part of the normal generation pipeline. It requires extension before A1P2 audio can be generated safely.

## No-Touch Confirmation

This pass must not modify A1P1 catalog rows except read-only comparison.
This pass must not modify A1P1 audio files.
This pass must not touch Supabase schema or persistence.
This pass must not touch Music page integration.
This pass must not touch decks, words, generation jobs, credits, pricing, `submit_generation`, or `request_word_retry`.
This pass must not touch the normal generation pipeline or paid-provider architecture.
This pass must not generate A1P3-A1P5.
