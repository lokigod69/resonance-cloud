# Guided Trophy Song A1P1 A/B Product Review Matrix

Date: 2026-05-15
Scope: product readiness review for the six local/static `english-a1-practical-1` Guided Trophy Songs.

## Review Position

This pass reviewed catalog wiring, lyric metadata, manifest coverage, local MP3 presence, candidate selection behavior, and frontend display contracts. It did not generate new audio, rewrite lyrics, or perform a human listening QA pass.

Because the current catalog already defaults to Candidate A and no technical blocker was found, the preferred candidate for all six rows is: **keep A for now**. Candidate B should remain available for learner-side switching and future product listening review.

## Cross-Catalog Verification

- Static catalog exists at `frontend/src/data/guidedTrophySongs.ts`.
- Manifest exists at `frontend/public/guided/trophy-songs/a1p1/manifest.json`.
- All six catalog rows have Candidate A and Candidate B public MP3 files.
- All six manifest entries exist and report `providerStatus: "success"`.
- All six rows use Candidate A as `audioPublicUrl` and `activeCandidateDefault`.
- Candidate switching changes only the MP3 source through `audioCandidates`.
- Candidate selection persists with `guided_trophy_song_candidate_<catalogId> = "A" | "B"`.
- Candidate switching does not change lyrics, German translations, trophy words, cloze positions, or study metadata.
- `providerLyrics` contains no `<<` or `>>` wrapper markers.
- `displayLyrics` contains no `<<` or `>>` wrapper markers.
- `rawLyricsWithWrappers` has exactly one wrapped occurrence per trophy word.
- `lyricsTranslationDe` exists for every row.
- The placeholder lyric-cloze recognition path remains wired and validated by the existing trophy cloze test.
- A1P1 lyrics were not rewritten in this pass.
- A1P2-A1P5 generation was not started in this pass.

## Matrix Summary

| Catalog ID | Segment | Vibe | Style | Candidate A | Candidate B | Preferred |
|---|---:|---|---|---|---|---|
| `english-a1-practical-1-segment-1-bright-trophy-song` | 1 | Bright | Acoustic warm | exists, 128.1s | exists, 124.9s | Keep A for now |
| `english-a1-practical-1-segment-2-bright-trophy-song` | 2 | Bright | Bright synth-pop | exists, 102.2s | exists, 100.3s | Keep A for now |
| `english-a1-practical-1-segment-1-wistful-trophy-song` | 1 | Wistful | Ambient folk | exists, 119.5s | exists, 119.8s | Keep A for now |
| `english-a1-practical-1-segment-2-wistful-trophy-song` | 2 | Wistful | Electronic downtempo | exists, 153.6s | exists, 179.4s | Keep A for now |
| `english-a1-practical-1-segment-1-sharp-trophy-song` | 1 | Sharp | Minimal synth pulse | exists, 98.7s | exists, 108.0s | Keep A for now |
| `english-a1-practical-1-segment-2-sharp-trophy-song` | 2 | Sharp | Crisp percussive pop | exists, 103.0s | exists, 91.2s | Keep A for now |

## Row Review

### `english-a1-practical-1-segment-1-bright-trophy-song`

| Field | Value |
|---|---|
| Path / segment / vibe | `english-a1-practical-1` / 1 / Bright |
| Trophy words | `delighted`, `marvelous`, `glad`, `eager`, `splendid` |
| Style family | `acoustic-warm` |
| Style label | Acoustic warm |
| Music caption summary | Warm Bright folk-pop around 100 bpm, clear friendly vocal, acoustic guitar and brushed kit, with diction focus on all five trophy words. |
| Display lyric summary | Cafe meeting song with a generous social tone, repeated glad/eager/splendid chorus, and a positive shared-moment outro. |
| Candidate A path | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-bright-trophy-song/candidate-a.mp3` |
| Candidate B path | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-bright-trophy-song/candidate-b.mp3` |
| Active default candidate | A |
| Both files exist | Yes |
| Manifest entry exists | Yes |
| Candidate A product notes | Technically present and active. Duration is 128.1s, which is reasonable for the lyric length. Keep as current learner default until listening review says otherwise. |
| Candidate B product notes | Technically present. Duration is 124.9s, close enough to A to be a useful alternate review candidate. |
| Preferred candidate | Keep A for now |
| Reason for preference | A is already wired as the active default and has no detected technical blocker. No human listening preference has been recorded yet. |
| Lyric issue | No blocker. Non-blocking Formula V1.1 note: future songs can push the hook harder, but this lyric is acceptable for A1P1 test exposure. |
| Audio issue | No technical issue found. Musical quality still needs human listening review. |
| Frontend display issue | None found in static contract. |
| Safe for A1P1 test exposure | Yes |

### `english-a1-practical-1-segment-2-bright-trophy-song`

| Field | Value |
|---|---|
| Path / segment / vibe | `english-a1-practical-1` / 2 / Bright |
| Trophy words | `ready`, `lovely`, `charming`, `wonderful`, `brilliant` |
| Style family | `bright-synth-pop` |
| Style label | Bright synth-pop |
| Music caption summary | Friendly Bright synth-pop around 116 bpm, light pop layering, clear diction, no EDM drop or nightclub posture. |
| Display lyric summary | Station and help-desk song with charming/wonderful/brilliant chorus and repeated ready/station imagery. |
| Candidate A path | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-bright-trophy-song/candidate-a.mp3` |
| Candidate B path | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-bright-trophy-song/candidate-b.mp3` |
| Active default candidate | A |
| Both files exist | Yes |
| Manifest entry exists | Yes |
| Candidate A product notes | Technically present and active. Duration is 102.2s, compact enough for a reward listen. |
| Candidate B product notes | Technically present. Duration is 100.3s, nearly equivalent length to A. |
| Preferred candidate | Keep A for now |
| Reason for preference | A is current default and no technical issue was detected. Keep B available for subjective listening comparison. |
| Lyric issue | No blocker. The chorus is already more hook-like than several rows and is safe for the current pass. |
| Audio issue | No technical issue found. Musical quality still needs human listening review. |
| Frontend display issue | None found in static contract. |
| Safe for A1P1 test exposure | Yes |

### `english-a1-practical-1-segment-1-wistful-trophy-song`

| Field | Value |
|---|---|
| Path / segment / vibe | `english-a1-practical-1` / 1 / Wistful |
| Trophy words | `gently`, `slowly`, `lost`, `quiet`, `perhaps` |
| Style family | `ambient-folk` |
| Style label | Ambient folk |
| Music caption summary | Spacious ambient folk around 76 bpm, reflective Wistful vocal, acoustic guitar and airy pad, no melodramatic ballad posture. |
| Display lyric summary | Reflective afternoon/town lyric with gently/slowly/lost/quiet/perhaps placed in soft, learner-readable lines. |
| Candidate A path | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-wistful-trophy-song/candidate-a.mp3` |
| Candidate B path | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-wistful-trophy-song/candidate-b.mp3` |
| Active default candidate | A |
| Both files exist | Yes |
| Manifest entry exists | Yes |
| Candidate A product notes | Technically present and active. Duration is 119.5s, aligned with the slower Wistful direction. |
| Candidate B product notes | Technically present. Duration is 119.8s, almost identical in length to A. |
| Preferred candidate | Keep A for now |
| Reason for preference | A is current default and no technical issue was detected. B remains a strong comparison candidate because duration parity suggests the same lyric shape was preserved. |
| Lyric issue | No blocker. Lyric is more mood-forward than hook-forward; acceptable for test exposure, but Formula V1.1 suggests stronger memory anchors for future sets. |
| Audio issue | No technical issue found. Musical quality still needs human listening review. |
| Frontend display issue | None found in static contract. |
| Safe for A1P1 test exposure | Yes |

### `english-a1-practical-1-segment-2-wistful-trophy-song`

| Field | Value |
|---|---|
| Path / segment / vibe | `english-a1-practical-1` / 2 / Wistful |
| Trophy words | `almost`, `soft`, `again`, `a little`, `lingering` |
| Style family | `electronic-downtempo` |
| Style label | Electronic downtempo |
| Music caption summary | Melancholic electronic downtempo around 88 bpm, reflective pulse, clear spacing for `a little`, no lo-fi cliche or string melodrama. |
| Display lyric summary | Platform/pharmacy song with repeated soft/again/lingering anchors and a doorway/silence chorus. |
| Candidate A path | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-wistful-trophy-song/candidate-a.mp3` |
| Candidate B path | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-wistful-trophy-song/candidate-b.mp3` |
| Active default candidate | A |
| Both files exist | Yes |
| Manifest entry exists | Yes |
| Candidate A product notes | Technically present and active. Duration is 153.6s, longer than most rows but still within a short-song reward range. |
| Candidate B product notes | Technically present. Duration is 179.4s, the longest candidate in A1P1 and worth listening review for pacing before making it active. |
| Preferred candidate | Keep A for now |
| Reason for preference | A is current default and shorter than B, which is preferable until the longer B candidate is reviewed for pacing. |
| Lyric issue | No blocker. This row already reflects Formula V1.1 better than many rows because `soft`, `again`, and `lingering` repeat unwrapped as anchors. |
| Audio issue | No technical issue found. Candidate B length is a non-blocking product review note. |
| Frontend display issue | None found in static contract. |
| Safe for A1P1 test exposure | Yes |

### `english-a1-practical-1-segment-1-sharp-trophy-song`

| Field | Value |
|---|---|
| Path / segment / vibe | `english-a1-practical-1` / 1 / Sharp |
| Trophy words | `clear`, `quick`, `straight`, `ready`, `exactly` |
| Style family | `minimal-synth-pulse` |
| Style label | Minimal synth pulse |
| Music caption summary | Tight minimal synth pulse around 104 bpm, crisp direct vocal, sparse bass and hat-driven percussion, no robotic or aggressive posture. |
| Display lyric summary | Direct cafe/direction lyric with clipped Sharp phrasing and a straight-ahead chorus. |
| Candidate A path | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-sharp-trophy-song/candidate-a.mp3` |
| Candidate B path | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-sharp-trophy-song/candidate-b.mp3` |
| Active default candidate | A |
| Both files exist | Yes |
| Manifest entry exists | Yes |
| Candidate A product notes | Technically present and active. Duration is 98.7s, a good fit for Sharp's compact posture. |
| Candidate B product notes | Technically present. Duration is 108.0s, slightly longer but still compact. |
| Preferred candidate | Keep A for now |
| Reason for preference | A is current default, concise, and has no technical issue. B remains available for listening comparison. |
| Lyric issue | No blocker. The clipped line shape supports Sharp well, though future Formula V1.1 songs can make the central hook more memorable. |
| Audio issue | No technical issue found. Musical quality still needs human listening review. |
| Frontend display issue | None found in static contract. |
| Safe for A1P1 test exposure | Yes |

### `english-a1-practical-1-segment-2-sharp-trophy-song`

| Field | Value |
|---|---|
| Path / segment / vibe | `english-a1-practical-1` / 2 / Sharp |
| Trophy words | `certain`, `focused`, `decided`, `settled`, `done` |
| Style family | `crisp-percussive-pop` |
| Style label | Crisp percussive pop |
| Music caption summary | Groove-led crisp percussive pop around 112 bpm, settled direct vocal, clean kit and muted plucks, no trap or boss-mode cliche. |
| Display lyric summary | Train/desk decision lyric with clipped decided/settled/done chorus and concise Sharp closure. |
| Candidate A path | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-sharp-trophy-song/candidate-a.mp3` |
| Candidate B path | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-sharp-trophy-song/candidate-b.mp3` |
| Active default candidate | A |
| Both files exist | Yes |
| Manifest entry exists | Yes |
| Candidate A product notes | Technically present and active. Duration is 103.0s, concise and aligned with the Sharp reward target. |
| Candidate B product notes | Technically present. Duration is 91.2s, the shortest candidate and worth listening review if a tighter active candidate is desired. |
| Preferred candidate | Keep A for now |
| Reason for preference | A is current default and no technical issue was detected. B may be useful if product prefers the shortest Sharp pass, but that requires listening review. |
| Lyric issue | No blocker. This row has one of the clearest chorus anchors: "Decided. Settled. Done." |
| Audio issue | No technical issue found. Musical quality still needs human listening review. |
| Frontend display issue | None found in static contract. |
| Safe for A1P1 test exposure | Yes |

## Recognition Placeholder

Recognition is not redesigned in this pass. The current placeholder uses wrapped lyric positions to create the cloze/recognition task from the actual song lyrics. This is enough for A1P1 test exposure because it validates the metadata path and does not fabricate separate example lines.

The final recognition UX remains deferred.

## Product Decision

A1P1 is safe for limited test exposure with Candidate A active on all six rows, provided stakeholders understand that:

- Candidate B remains unranked until human listening review.
- The current recognition task is still a placeholder.
- A1P2-A1P5 should use Formula V1.1 before lyric/audio generation starts.
