# Guided Trophy Song Session Handoff - 2026-05-15

## Current State

The first Guided Trophy Song workflow is wired locally for `english-a1-practical-1`.

The static catalog exists at `frontend/src/data/guidedTrophySongs.ts` with six A1P1 trophy-song rows:

- `english-a1-practical-1-segment-1-bright-trophy-song`
- `english-a1-practical-1-segment-2-bright-trophy-song`
- `english-a1-practical-1-segment-1-wistful-trophy-song`
- `english-a1-practical-1-segment-2-wistful-trophy-song`
- `english-a1-practical-1-segment-1-sharp-trophy-song`
- `english-a1-practical-1-segment-2-sharp-trophy-song`

Each row includes the canonical local/static fields for trophy words, style family, style label, music caption, wrapped lyrics, provider lyrics, display lyrics, German translation, study lines, derived cloze positions, candidate audio metadata, and audio status.

## Audio Assets

A/B MP3 candidates exist for all six A1P1 catalog rows under:

`frontend/public/guided/trophy-songs/a1p1/<catalog-id>/`

Each catalog row has:

- `candidate-a.mp3`
- `candidate-b.mp3`
- a manifest entry in `frontend/public/guided/trophy-songs/a1p1/manifest.json`

Candidate A is currently the active default. Candidate B is retained for product review and learner-side switching.

## Frontend Trophy UX

The Trophy page frontend now supports the local/static song flow:

- trophy word cards are visible
- song metadata is visible: style label, vibe/voice, segment, audio status
- generated audio can be played
- Candidate A/B can be selected when both are present
- selected candidate persists by catalog ID
- English lyrics display from `displayLyrics`
- German translations display from `lyricsTranslationDe`
- the existing cloze/recognition placeholder remains available below the lyrics review

Candidate persistence uses localStorage:

`guided_trophy_song_candidate_<catalogId> = "A" | "B"`

Candidate selection changes only the MP3 source. It does not change trophy words, lyrics, translations, cloze positions, or study metadata.

## Explicit Non-Changes

No Supabase persistence was implemented.
No Music page integration was implemented.
No deck rows were created.
No word rows were created.
No normal generation pipeline changes were made.
No `guidedLessons.ts` changes were made.
No user credit changes were made.
No new songs were generated in the frontend UX pass.
No A1P1 lyrics were rewritten during the frontend UX pass.

## Deferred Work

The final lyric-recognition redesign is still deferred.

Current recognition behavior remains a placeholder-level cloze mechanic over the actual song lyrics. It proves that wrapped study positions can drive a learner task, but it is not the final intended recognition experience.

The next version should decide whether recognition is:

- multiple-choice from the five trophy words
- listen-and-select while audio is playing
- lyric-line reconstruction
- timed karaoke-style recognition
- a hybrid of printed lyrics, audio replay, and word choice

## Next Recommended Work

1. Review all A1P1 Candidate A/B outputs in a product matrix.
2. Select the preferred active candidate per trophy set, or document why Candidate A remains acceptable.
3. Apply Lyric Formula V1.1 before generating A1P2-A1P5 songs.
4. Generate A1P2-A1P5 lyrics and audio only after formula review.
5. Design the future lyric-recognition UX separately from this static audio wiring.
6. Design future Supabase/Music architecture only after local/static behavior and content quality are approved.

## Next Implementation Prompts

1. Product review matrix for A1P1 A/B candidates.
2. A1P2-A1P5 lyric generation using Formula V1.1.
3. Future lyric-recognition UX redesign.
4. Future Supabase/Music architecture.
