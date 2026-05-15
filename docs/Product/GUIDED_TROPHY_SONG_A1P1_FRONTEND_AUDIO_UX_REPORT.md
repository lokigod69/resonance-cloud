# Guided Trophy Song A1P1 Frontend Audio UX Report

Date: 2026-05-15
Scope: local/static Trophy page audio and lyrics UX for `english-a1-practical-1`

## Files changed

- `frontend/src/data/guidedTrophySongs.ts`
- `frontend/src/lib/trophySongsClient.ts`
- `frontend/src/components/today/trophy/TrophySongPanel.tsx`
- `frontend/src/components/today/trophy/TrophySongPlayer.tsx`
- `frontend/scripts/test-guided-trophy-songs.ts`
- `docs/Product/GUIDED_TROPHY_SONG_A1P1_FRONTEND_AUDIO_UX_REPORT.md`

## Catalog IDs

- `english-a1-practical-1-segment-1-bright-trophy-song`
- `english-a1-practical-1-segment-2-bright-trophy-song`
- `english-a1-practical-1-segment-1-wistful-trophy-song`
- `english-a1-practical-1-segment-2-wistful-trophy-song`
- `english-a1-practical-1-segment-1-sharp-trophy-song`
- `english-a1-practical-1-segment-2-sharp-trophy-song`

## Candidate A/B representation

The static catalog now exposes `audioCandidates` per row:

- `A.publicUrl` points to `/guided/trophy-songs/a1p1/<catalog-id>/candidate-a.mp3`
- `B.publicUrl` points to `/guided/trophy-songs/a1p1/<catalog-id>/candidate-b.mp3` when present
- `providerUrl` is retained for manifest/debug traceability
- `activeCandidateDefault` is `A`
- `audioPublicUrl` remains wired to Candidate A for backward compatibility

Candidate selection changes only the selected MP3 URL. It does not alter trophy words, lyrics, translations, cloze positions, or study metadata.

## Candidate persistence

`TrophySongPlayer` persists the selected candidate in localStorage with the catalog-scoped key:

`guided_trophy_song_candidate_<catalogId>`

Valid stored values are `A` and `B`. Missing, invalid, or unavailable selections fall back to Candidate A.

## Lyrics display

`TrophySongPanel` now shows:

- trophy word cards
- song metadata: style label, voice/vibe, segment, and audio status
- Candidate A/B audio controls
- English lyrics from `displayLyrics`
- German translation from `lyricsTranslationDe`
- the existing cloze/recognition placeholder below the review section

Provider lyrics remain hidden from the learner. Wrapper-marked raw lyrics remain app-side metadata only.

## Explicit non-changes

No new songs were generated.
No lyrics were rewritten.
No `guidedLessons.ts` changes were made.
No Supabase persistence was implemented.
No Music page integration was implemented.
No deck rows were created.
No word rows were created.
No normal generation pipeline changes were made.
No user credits were charged or changed.

## Checks run

- `Test-Path frontend/src/data/guidedTrophySongs.ts`
- `Test-Path frontend/public/guided/trophy-songs/a1p1/manifest.json`
- `Test-Path frontend/public/guided/trophy-songs/a1p1/<catalog-id>/candidate-a.mp3` for all six catalog IDs
- `Test-Path frontend/public/guided/trophy-songs/a1p1/<catalog-id>/candidate-b.mp3` for all six catalog IDs
- `Test-Path docs/Product/GUIDED_TROPHY_SONG_A1P1_AUDIO_GENERATION_REPORT.md`
- `npx tsx scripts/test-guided-trophy-songs.ts`
- `npx tsx scripts/test-guided-trophy-cloze.ts`
- `npx tsx scripts/test-guided-vibes.ts`
- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npm run check:i18n`
- `npm run build`
- `npx eslint src/data/guidedTrophySongs.ts src/lib/trophySongsClient.ts src/components/today/trophy/TrophySongPanel.tsx src/components/today/trophy/TrophySongPlayer.tsx src/components/today/trophy/TrophyLyricClozeDrill.tsx scripts/test-guided-trophy-songs.ts scripts/test-guided-trophy-cloze.ts scripts/generate-guided-trophy-song-audio.ts`
- Browser smoke: opened `/today/checkpoint?mode=trophy-cloze&path=english-a1-practical-1&segment=1&vibe=bright` on the local Vite server; the existing auth gate redirected to login, and no auth bypass was added.
- `git diff --check`
- `git diff --cached --check`

## Known UX limitations

- The final lyric-recognition redesign is still intentionally deferred.
- Candidate labels are simple `A` and `B`; there is no rating, waveform, duration, or review note yet.
- The local browser smoke cannot inspect the protected Trophy page without an authenticated local session.
- Candidate A remains the default active candidate until product review chooses otherwise.
