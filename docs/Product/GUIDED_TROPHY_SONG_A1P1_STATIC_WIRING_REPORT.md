# Guided Trophy Song A1P1 Static Wiring Report

Date: 2026-05-15
Scope: local/static prototype wiring for `english-a1-practical-1`

## Files changed

- `frontend/src/data/guidedTrophySongs.ts`
- `frontend/src/lib/trophySongsClient.ts`
- `frontend/src/components/today/trophy/TrophyLyricClozeDrill.tsx`
- `frontend/scripts/test-guided-trophy-songs.ts`
- `frontend/scripts/test-guided-trophy-cloze.ts`
- `docs/Product/GUIDED_TROPHY_SONG_A1P1_STATIC_WIRING_REPORT.md`

## Catalog ids

- `english-a1-practical-1-segment-1-bright-trophy-song`
- `english-a1-practical-1-segment-2-bright-trophy-song`
- `english-a1-practical-1-segment-1-wistful-trophy-song`
- `english-a1-practical-1-segment-2-wistful-trophy-song`
- `english-a1-practical-1-segment-1-sharp-trophy-song`
- `english-a1-practical-1-segment-2-sharp-trophy-song`

## Wiring summary

- Replaced the hard-coded Bright Segment 1 mock in `fetchTrophySongCanonical` with a static catalog lookup.
- Added all six A1P1 trophy song rows with `id`, `pathId`, `segment`, `vibe`, `trophyWords`, `styleFamily`, `songStyleLabel`, `musicCaption`, `rawLyricsWithWrappers`, `providerLyrics`, `displayLyrics`, `lyricsTranslationDe`, `studyLines`, derived `clozePositions`, `audioPublicUrl: null`, and `audioStatus: "missing"`.
- Kept `TrophySongNotAvailableError` behavior for unknown path/segment/vibe combinations.
- Kept the existing `lyricsDisplay` field expected by `TrophySongPanel` as an alias of catalog `displayLyrics`.
- Kept audio in the existing coming-soon/null state until MP3s are attached.
- Updated the cloze drill to read full song lyrics instead of only the first five lines, so sectioned songs can place wrapped study occurrences anywhere in the lyric.

## Provider lyric safety

`providerLyrics` is derived by stripping `<<word>>` wrappers from `rawLyricsWithWrappers`. The validation script checks that neither `providerLyrics` nor `displayLyrics` contains `<<` or `>>`. Suno/KIE should receive `providerLyrics` only; wrappers remain app-side recognition metadata.

## German translations

German translations were added for the full lyrics of all six songs in `lyricsTranslationDe`. They are section-aligned and intended to show a German learner the meaning of the English trophy song without changing the English lyrics.

## Explicit non-changes

No Supabase persistence was added.
No Music page integration was added.
No deck, word, or generation pipeline changes were made.
`frontend/src/data/guidedLessons.ts` was not modified.
No paid provider calls were made.

## Checks run

- `npx tsx scripts/test-guided-trophy-songs.ts` - passed, 44/44 assertions
- `npx tsx scripts/test-guided-vibes.ts` - passed, 98/98 assertions
- `npx tsx scripts/test-guided-today-path-overview.ts` - passed, 141/141 assertions; existing weak generic lesson item notes printed by the script
- `npm run check:i18n` - passed; existing French warn-only gaps remain out of scope
- `npm run build` - passed; existing Vite warnings about chunk size and Supabase dynamic import remained
- `npx eslint src/data/guidedTrophySongs.ts src/lib/trophySongsClient.ts src/components/today/trophy/TrophyLyricClozeDrill.tsx scripts/test-guided-trophy-songs.ts scripts/test-guided-trophy-cloze.ts` - passed
- `npx tsx scripts/test-guided-trophy-cloze.ts` - passed, 30/30 assertions
- `git diff --check` - passed
- `git diff --cached --check` - passed
