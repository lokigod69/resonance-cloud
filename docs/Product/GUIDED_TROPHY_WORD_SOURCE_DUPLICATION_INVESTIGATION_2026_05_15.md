# Guided Trophy Word — Source of Truth and A1P1 ↔ A1P2 Duplication Investigation

Date: 2026-05-15
Author: Claude (read-only investigation, no runtime edits)
Repo: d:\CODING\ResonanceTEST\orchestrator
Branch: main
HEAD at investigation start: `cc7b7f05d3179f912adee4da24884e63c2f99f46`

## Mission

Product-owner review of A1P2 trophy songs flagged that many trophy words appear to repeat A1P1 trophy words. Determine the source of truth for Guided Today trophy words, identify where the duplication actually originates (lesson data vs. trophy-song catalog), and report exact duplicate counts. No runtime content was modified.

## 1. Source-of-Truth Finding

There are **two independent trophy-word catalogs** in the repo. They are coupled only by hand:

### 1a. Per-lesson trophy words (the real lesson-level source)
- File: [frontend/src/data/guidedLessons.ts](../../frontend/src/data/guidedLessons.ts)
- Shape: every lesson variant carries a `trophyWord: GuidedLessonTrophyWord` object on each of its three vibe variants. Type declared at [guidedLessons.ts:111](../../frontend/src/data/guidedLessons.ts#L111) and [guidedLessons.ts:159](../../frontend/src/data/guidedLessons.ts#L159).
- P1 stores each vibe-variant as a hand-written constant (`brightLesson00N`, `wistfulLesson00N`, `sharpLesson00N`) with the trophy word as an object literal — examples at [guidedLessons.ts:278-283](../../frontend/src/data/guidedLessons.ts#L278), [guidedLessons.ts:332-337](../../frontend/src/data/guidedLessons.ts#L332), etc.
- P2–P5 use input arrays (`a1Practical2Inputs`, `a1Practical3Inputs`, `a1Practical4Inputs`, `a1Practical5Inputs`) where each variant calls the `trophy(...)` helper — examples at [guidedLessons.ts:1902](../../frontend/src/data/guidedLessons.ts#L1902), [guidedLessons.ts:1919](../../frontend/src/data/guidedLessons.ts#L1919), [guidedLessons.ts:1937](../../frontend/src/data/guidedLessons.ts#L1937).
- Helpers `resolveGuidedLessonVariant` ([guidedLessons.ts:5473](../../frontend/src/data/guidedLessons.ts#L5473)) and `getGuidedPathLessons` ([guidedLessons.ts:5399](../../frontend/src/data/guidedLessons.ts#L5399)) only resolve the lesson-level data. They are used by the runtime UI (`TrophyWordCard`, `GuidedCheckpoint`, `TodaySession`), **not** by the song catalog.

### 1b. The trophy-song catalog (separate, hand-authored)
- File: [frontend/src/data/guidedTrophySongs.ts](../../frontend/src/data/guidedTrophySongs.ts)
- Shape: 12 rows in a top-level `GUIDED_TROPHY_SONGS` array (6 for A1P1, 6 for A1P2). Each row carries its own `trophyWords: string[]` of length 5, plus hand-written `rawLyricsWithWrappers`, `lyricsTranslationDe`, `musicCaption`, audio candidates, etc. Defined at [guidedTrophySongs.ts:57](../../frontend/src/data/guidedTrophySongs.ts#L57).
- **No code derives this catalog from `guidedLessons.ts`.** No import of `GUIDED_LESSONS` or `getGuidedPathLessons`, no `trophyWord.word` read from the lesson catalog. `guidedTrophySongs.ts` imports only `ActiveGuidedVibeId` from `./guidedVibes` and `GuidedSegmentReviewNumber` from `@/lib/guidedCheckpoint` (type-only imports for the shape).
- The trophy-song audio generator at [frontend/scripts/generate-guided-trophy-song-audio.ts](../../frontend/scripts/generate-guided-trophy-song-audio.ts) reads from `GUIDED_TROPHY_SONGS`, not from the lesson data — see [generate-guided-trophy-song-audio.ts:10](../../frontend/scripts/generate-guided-trophy-song-audio.ts#L10).
- The runtime consumer in `TrophySongPanel` likewise reads `GUIDED_TROPHY_SONGS` for the cloze drill (`trophyWords` + `clozePositions`).

**So:** the song catalog is a parallel, manually maintained file. It is not generated. It is also not derived from the lesson trophy-word data — the author appears to have copied each lesson's `trophyWord.word` into the song row by hand (and the words match exactly per segment, see §4).

### 1c. Which one is "the" source of truth?
Functionally there are two sources:
- The **lesson-level** trophy word is the source for the lesson's TrophyWordCard, checkpoint cloze, and review surfaces — runtime UI.
- The **song-level** `trophyWords` array is the source for the trophy-song cloze drill and lyrics — runtime audio playback.

They have been kept in sync only because the song author manually mirrored the lesson words. There is no test that enforces this equality, and there is no test that enforces uniqueness across paths.

## 2. A1P1 Trophy Word Matrix

Source file for every row below: [frontend/src/data/guidedLessons.ts](../../frontend/src/data/guidedLessons.ts).

| Path | L# | Lesson corePhrase (bright) | Vibe | Trophy word | songSeed.genre | songSeed.mood | Source line |
|---|---|---|---|---|---|---|---|
| A1P1 | 1 | Hi there, do you speak English? | bright | delighted | sunny indie pop | warm first contact | [L278](../../frontend/src/data/guidedLessons.ts#L278) |
| A1P1 | 1 | (wistful: Sorry to ask…) | wistful | gently | ambient piano | tentative and soft | [L817](../../frontend/src/data/guidedLessons.ts#L817) |
| A1P1 | 1 | (sharp: Quick question — …) | sharp | clear | minimal synth pulse | direct and clean | [L1356](../../frontend/src/data/guidedLessons.ts#L1356) |
| A1P1 | 2 | Sorry, could you say that again? Thanks so much. | bright | marvelous | upbeat acoustic | patient and sunny | [L332](../../frontend/src/data/guidedLessons.ts#L332) |
| A1P1 | 2 | (wistful: Perhaps a little more slowly?) | wistful | slowly | soft indie folk | patient and fragile | [L871](../../frontend/src/data/guidedLessons.ts#L871) |
| A1P1 | 2 | (sharp: Once more, slower. Please.) | sharp | quick | minimal synth pulse | clipped and controlled | [L1410](../../frontend/src/data/guidedLessons.ts#L1410) |
| A1P1 | 3 | Hi, could you help me? Where is the station? | bright | glad | sunny indie pop | open and moving | [L386](../../frontend/src/data/guidedLessons.ts#L386) |
| A1P1 | 3 | (wistful: Sorry, I'm a little lost…) | wistful | lost | slow strings | searching and quiet | [L925](../../frontend/src/data/guidedLessons.ts#L925) |
| A1P1 | 3 | (sharp: Where's the station? Straight ahead…) | sharp | straight | alt rock | urban and direct | [L1464](../../frontend/src/data/guidedLessons.ts#L1464) |
| A1P1 | 4 | I'd love a coffee, please. | bright | eager | upbeat acoustic | fresh and eager | [L440](../../frontend/src/data/guidedLessons.ts#L440) |
| A1P1 | 4 | (wistful: Could I have a tea, please? Something simple.) | wistful | quiet | ambient piano | small and inward | [L979](../../frontend/src/data/guidedLessons.ts#L979) |
| A1P1 | 4 | (sharp: One coffee, please. Black.) | sharp | ready | smoky late-night jazz | decided and neat | [L1518](../../frontend/src/data/guidedLessons.ts#L1518) |
| A1P1 | 5 | How much is this? Lovely, thanks! | bright | splendid | sunny indie pop | quick and pleased | [L494](../../frontend/src/data/guidedLessons.ts#L494) |
| A1P1 | 5 | (wistful: Just a small question — how much for this?) | wistful | perhaps | soft indie folk | careful and low | [L1033](../../frontend/src/data/guidedLessons.ts#L1033) |
| A1P1 | 5 | (sharp: How much?) | sharp | exactly | minimal synth pulse | spare and precise | [L1571](../../frontend/src/data/guidedLessons.ts#L1571) |
| A1P1 | 6 | Hi! What time is the train, please? | bright | ready | upbeat acoustic | ready and moving | [L548](../../frontend/src/data/guidedLessons.ts#L548) |
| A1P1 | 6 | (wistful: If I may — what time is the train?) | wistful | almost | slow strings | nearly there | [L1087](../../frontend/src/data/guidedLessons.ts#L1087) |
| A1P1 | 6 | (sharp: What time, and which platform?) | sharp | certain | minimal synth pulse | timed and clipped | [L1624](../../frontend/src/data/guidedLessons.ts#L1624) |
| A1P1 | 7 | Hi, could you help me, please? | bright | lovely | sunny indie pop | warm and supported | [L602](../../frontend/src/data/guidedLessons.ts#L602) |
| A1P1 | 7 | (wistful: I'm afraid I need a little help.) | wistful | soft | ambient piano | small and vulnerable | [L1141](../../frontend/src/data/guidedLessons.ts#L1141) |
| A1P1 | 7 | (sharp: I need help. Quick question.) | sharp | focused | alt rock | focused and urgent | [L1677](../../frontend/src/data/guidedLessons.ts#L1677) |
| A1P1 | 8 | I love it here. | bright | charming | soft folk-pop | delighted and social | [L655](../../frontend/src/data/guidedLessons.ts#L655) |
| A1P1 | 8 | (wistful: It's quiet here. I like it.) | wistful | again | soft indie folk | familiar and hushed | [L1194](../../frontend/src/data/guidedLessons.ts#L1194) |
| A1P1 | 8 | (sharp: Good place. I like it.) | sharp | decided | smoky late-night jazz | dry and assured | [L1730](../../frontend/src/data/guidedLessons.ts#L1730) |
| A1P1 | 9 | Tomorrow at seven? Wonderful! | bright | wonderful | sunny indie pop | forward and delighted | [L709](../../frontend/src/data/guidedLessons.ts#L709) |
| A1P1 | 9 | (wistful: Tomorrow at seven… yes, that's okay.) | wistful | a little | ambient piano | hesitant and accepting | [L1248](../../frontend/src/data/guidedLessons.ts#L1248) |
| A1P1 | 9 | (sharp: Seven, tomorrow. Ready.) | sharp | settled | minimal synth pulse | settled and decisive | [L1784](../../frontend/src/data/guidedLessons.ts#L1784) |
| A1P1 | 10 | How wonderful! Thanks so much. Goodbye! | bright | brilliant | soft folk-pop | warm closure | [L763](../../frontend/src/data/guidedLessons.ts#L763) |
| A1P1 | 10 | (wistful: Thank you. That helped. Goodbye.) | wistful | lingering | slow strings | soft closure | [L1302](../../frontend/src/data/guidedLessons.ts#L1302) |
| A1P1 | 10 | (sharp: Clear. Thanks. Bye.) | sharp | done | minimal synth pulse | resolved and clipped | [L1838](../../frontend/src/data/guidedLessons.ts#L1838) |

Distinct A1P1 trophy words: 29 — only internal repeat is **ready** (bright L6 + sharp L4). See §5 for full duplicate analysis.

## 3. A1P2 Trophy Word Matrix

A1P2 lesson titles are explicit on the input objects (`title:` field at the top of each entry — e.g. [L1882](../../frontend/src/data/guidedLessons.ts#L1882)).

| Path | L# | Lesson title | Vibe | Trophy word | songSeed.genre | songSeed.mood | Source line |
|---|---|---|---|---|---|---|---|
| A1P2 | 1 | I don't understand | bright | lovely | light acoustic pop | open and helped | [L1902](../../frontend/src/data/guidedLessons.ts#L1902) |
| A1P2 | 1 | I don't understand | wistful | gently | soft indie folk | gentle repair | [L1919](../../frontend/src/data/guidedLessons.ts#L1919) |
| A1P2 | 1 | I don't understand | sharp | clear | minimal synth pulse | clear repair | [L1937](../../frontend/src/data/guidedLessons.ts#L1937) |
| A1P2 | 2 | Write it down | bright | glad | sunny indie pop | helpful and light | [L1966](../../frontend/src/data/guidedLessons.ts#L1966) |
| A1P2 | 2 | Write it down | wistful | slowly | soft indie folk | quiet written help | [L1984](../../frontend/src/data/guidedLessons.ts#L1984) |
| A1P2 | 2 | Write it down | sharp | quick | minimal synth pulse | quick note | [L2002](../../frontend/src/data/guidedLessons.ts#L2002) |
| A1P2 | 3 | Show me | bright | brilliant | light acoustic pop | visible answer | [L2031](../../frontend/src/data/guidedLessons.ts#L2031) |
| A1P2 | 3 | Show me | wistful | perhaps | soft indie folk | soft pointing | [L2049](../../frontend/src/data/guidedLessons.ts#L2049) |
| A1P2 | 3 | Show me | sharp | exactly | minimal synth pulse | exact location | [L2067](../../frontend/src/data/guidedLessons.ts#L2067) |
| A1P2 | 4 | Which one? | bright | ready | sunny indie pop | friendly choice | [L2096](../../frontend/src/data/guidedLessons.ts#L2096) |
| A1P2 | 4 | Which one? | wistful | quiet | soft indie folk | quiet choice | [L2114](../../frontend/src/data/guidedLessons.ts#L2114) |
| A1P2 | 4 | Which one? | sharp | decided | minimal synth pulse | binary choice | [L2132](../../frontend/src/data/guidedLessons.ts#L2132) |
| A1P2 | 5 | Do you have…? | bright | charming | light acoustic pop | warm availability | [L2161](../../frontend/src/data/guidedLessons.ts#L2161) |
| A1P2 | 5 | Do you have…? | wistful | soft | soft indie folk | soft availability | [L2178](../../frontend/src/data/guidedLessons.ts#L2178) |
| A1P2 | 5 | Do you have…? | sharp | certain | minimal synth pulse | available or not | [L2194](../../frontend/src/data/guidedLessons.ts#L2194) |
| A1P2 | 6 | By card | bright | easy | sunny indie pop | easy payment | [L2223](../../frontend/src/data/guidedLessons.ts#L2223) |
| A1P2 | 6 | By card | wistful | again | soft indie folk | careful payment | [L2240](../../frontend/src/data/guidedLessons.ts#L2240) |
| A1P2 | 6 | By card | sharp | straight | minimal synth pulse | straight payment | [L2257](../../frontend/src/data/guidedLessons.ts#L2257) |
| A1P2 | 7 | A receipt, please | bright | splendid | light acoustic pop | small extra | [L2286](../../frontend/src/data/guidedLessons.ts#L2286) |
| A1P2 | 7 | A receipt, please | wistful | near | soft indie folk | small afterthought | [L2304](../../frontend/src/data/guidedLessons.ts#L2304) |
| A1P2 | 7 | A receipt, please | sharp | focused | minimal synth pulse | focused checkout | [L2322](../../frontend/src/data/guidedLessons.ts#L2322) |
| A1P2 | 8 | I have a reservation | bright | kind | sunny indie pop | friendly arrival | [L2351](../../frontend/src/data/guidedLessons.ts#L2351) |
| A1P2 | 8 | I have a reservation | wistful | calm | soft indie folk | quiet arrival | [L2368](../../frontend/src/data/guidedLessons.ts#L2368) |
| A1P2 | 8 | I have a reservation | sharp | direct | minimal synth pulse | direct arrival | [L2385](../../frontend/src/data/guidedLessons.ts#L2385) |
| A1P2 | 9 | Is this right? | bright | sure | light acoustic pop | sure before moving | [L2414](../../frontend/src/data/guidedLessons.ts#L2414) |
| A1P2 | 9 | Is this right? | wistful | simple | soft indie folk | careful check | [L2432](../../frontend/src/data/guidedLessons.ts#L2432) |
| A1P2 | 9 | Is this right? | sharp | settled | minimal synth pulse | settled route | [L2450](../../frontend/src/data/guidedLessons.ts#L2450) |
| A1P2 | 10 | One moment | bright | cheerful | sunny indie pop | brief pause | [L2478](../../frontend/src/data/guidedLessons.ts#L2478) |
| A1P2 | 10 | One moment | wistful | patient | soft indie folk | patient pause | [L2496](../../frontend/src/data/guidedLessons.ts#L2496) |
| A1P2 | 10 | One moment | sharp | done | minimal synth pulse | brief hold | [L2513](../../frontend/src/data/guidedLessons.ts#L2513) |

All 30 A1P2 trophy words are internally distinct (no within-A1P2 collisions across vibe or across lesson).

## 4. Segment Grouping Matrix

The trophy-song catalog row for `(path, segment, vibe)` carries a `trophyWords: string[]` of length 5. Compared row-by-row against the lesson data, **the segment-1 array is exactly L1–L5 of that vibe**, and **the segment-2 array is exactly L6–L10 of that vibe**. The order matches lesson order.

### A1P1
| Catalog row id | Catalog `trophyWords` | Lesson-data words (vibe, L1–5 or L6–10) | Match |
|---|---|---|---|
| `english-a1-practical-1-segment-1-bright-trophy-song` | delighted, marvelous, glad, eager, splendid | bright L1–5: delighted, marvelous, glad, eager, splendid | exact |
| `english-a1-practical-1-segment-2-bright-trophy-song` | ready, lovely, charming, wonderful, brilliant | bright L6–10: ready, lovely, charming, wonderful, brilliant | exact |
| `english-a1-practical-1-segment-1-wistful-trophy-song` | gently, slowly, lost, quiet, perhaps | wistful L1–5: gently, slowly, lost, quiet, perhaps | exact |
| `english-a1-practical-1-segment-2-wistful-trophy-song` | almost, soft, again, a little, lingering | wistful L6–10: almost, soft, again, a little, lingering | exact |
| `english-a1-practical-1-segment-1-sharp-trophy-song` | clear, quick, straight, ready, exactly | sharp L1–5: clear, quick, straight, ready, exactly | exact |
| `english-a1-practical-1-segment-2-sharp-trophy-song` | certain, focused, decided, settled, done | sharp L6–10: certain, focused, decided, settled, done | exact |

### A1P2
| Catalog row id | Catalog `trophyWords` | Lesson-data words (vibe, L1–5 or L6–10) | Match |
|---|---|---|---|
| `english-a1-practical-2-segment-1-bright-trophy-song` | lovely, glad, brilliant, ready, charming | bright L1–5: lovely, glad, brilliant, ready, charming | exact |
| `english-a1-practical-2-segment-2-bright-trophy-song` | easy, splendid, kind, sure, cheerful | bright L6–10: easy, splendid, kind, sure, cheerful | exact |
| `english-a1-practical-2-segment-1-wistful-trophy-song` | gently, slowly, perhaps, quiet, soft | wistful L1–5: gently, slowly, perhaps, quiet, soft | exact |
| `english-a1-practical-2-segment-2-wistful-trophy-song` | again, near, calm, simple, patient | wistful L6–10: again, near, calm, simple, patient | exact |
| `english-a1-practical-2-segment-1-sharp-trophy-song` | clear, quick, exactly, decided, certain | sharp L1–5: clear, quick, exactly, decided, certain | exact |
| `english-a1-practical-2-segment-2-sharp-trophy-song` | straight, focused, direct, settled, done | sharp L6–10: straight, focused, direct, settled, done | exact |

**Confirmation:** the song catalog's `trophyWords` arrays are not new vocabulary — they are 1:1 with the lesson trophyWords for L1–5 (segment 1) and L6–10 (segment 2) per vibe.

## 5. Duplication Analysis

### 5a. Duplicates inside A1P1
Comparing all 30 A1P1 trophy words:
- **"ready"** appears twice within A1P1 — bright L6 ([L549](../../frontend/src/data/guidedLessons.ts#L549)) and sharp L4 ([L1519](../../frontend/src/data/guidedLessons.ts#L1519)).
- That is the only internal collision. 29 distinct values out of 30 cells.

### 5b. Duplicates inside A1P2
- **0** internal collisions. All 30 A1P2 trophy words are distinct.

### 5c. Duplicates from A1P1 → A1P2 (the product-owner finding)

Below, "P1 origin" lists any A1P1 (lesson, vibe) cell that uses the same word.

#### Bright vibe (P2 → P1)
| A1P2 cell | Word | P1 origin |
|---|---|---|
| L1 bright | lovely | P1 bright L7 |
| L2 bright | glad | P1 bright L3 |
| L3 bright | brilliant | P1 bright L10 |
| L4 bright | ready | P1 bright L6, P1 sharp L4 |
| L5 bright | charming | P1 bright L8 |
| L6 bright | easy | — (new) |
| L7 bright | splendid | P1 bright L5 |
| L8 bright | kind | — (new) |
| L9 bright | sure | — (new) |
| L10 bright | cheerful | — (new) |

Bright duplicates A1P1 → A1P2: **6 of 10** (lovely, glad, brilliant, ready, charming, splendid).

#### Wistful vibe (P2 → P1)
| A1P2 cell | Word | P1 origin |
|---|---|---|
| L1 wistful | gently | P1 wistful L1 |
| L2 wistful | slowly | P1 wistful L2 |
| L3 wistful | perhaps | P1 wistful L5 |
| L4 wistful | quiet | P1 wistful L4 |
| L5 wistful | soft | P1 wistful L7 |
| L6 wistful | again | P1 wistful L8 |
| L7 wistful | near | — (new) |
| L8 wistful | calm | — (new) |
| L9 wistful | simple | — (new) |
| L10 wistful | patient | — (new) |

Wistful duplicates A1P1 → A1P2: **6 of 10** (gently, slowly, perhaps, quiet, soft, again).

#### Sharp vibe (P2 → P1)
| A1P2 cell | Word | P1 origin |
|---|---|---|
| L1 sharp | clear | P1 sharp L1 |
| L2 sharp | quick | P1 sharp L2 |
| L3 sharp | exactly | P1 sharp L5 |
| L4 sharp | decided | P1 sharp L8 |
| L5 sharp | certain | P1 sharp L6 |
| L6 sharp | straight | P1 sharp L3 |
| L7 sharp | focused | P1 sharp L7 |
| L8 sharp | direct | — (new) |
| L9 sharp | settled | P1 sharp L9 |
| L10 sharp | done | P1 sharp L10 |

Sharp duplicates A1P1 → A1P2: **9 of 10** (clear, quick, exactly, decided, certain, straight, focused, settled, done). Only `direct` is a new word.

#### Overall
- **21 of 30 A1P2 trophy words (70%) duplicate a word already used in A1P1.**
- Concentrated heavily in Sharp (90% repeat), then evenly in Bright and Wistful (60% repeat each).

### 5d. Duplicated songSeed values

`songSeed.genre` repeats heavily by design — it is essentially a vibe-genre tag:
- Wistful P2 lessons all use `soft indie folk` (10/10 lessons).
- Sharp P2 lessons all use `minimal synth pulse` (10/10 lessons).
- Bright P2 alternates `light acoustic pop` / `sunny indie pop` per lesson.
- P1 uses a slightly wider palette per vibe but with the same recurring tags.

`songSeed.mood` is per-lesson and is **not** duplicated A1P1 → A1P2 in spot-checks (every P2 mood line is a unique short string). No mood collisions found in the spot check; if a stricter audit is wanted, an explicit script is the right tool.

The audible-style of the actual trophy songs is controlled by `styleFamily` + `musicCaption` on the song-catalog row, not by `songSeed`. Those are all distinct strings per song row (P1 uses six different `styleFamily` values across six rows; P2 uses six more, e.g. `sunlit-acoustic-pop`, `bright-handclap-pop`, `moonlit-indie-folk`, `soft-downtempo-folk`, `clean-synth-grid`, `crisp-bass-pop`). So the music itself is differentiated even though the vocabulary it teaches is repeated.

### 5e. A1P3 / A1P4 / A1P5 — present? duplicated?

All three paths exist in lesson data and ship the 30 trophy words each (P3 input array at lines 2572–3208, P4 at 3253–4022, P5 at 4067–4867). They are not yet exposed in the trophy-song catalog — `test-guided-trophy-songs.ts` explicitly asserts A1P3–A1P5 are absent from `GUIDED_TROPHY_SONGS`.

Spot-checked P3–P5 lesson trophy words against P1+P2:
- P3 cells that duplicate P1 and/or P2: `straight` (L3 sharp), `slowly` (L2 wistful), `direct` (L4 sharp), `simple` (L5 wistful), `perhaps` (L7 wistful), `quiet` (L8 wistful), `lost` (L10 wistful). ~7 of 30.
- P4 cells that duplicate earlier paths: `clear` (L3 sharp), `quick` (L3 sharp's pair appears elsewhere), and a few others. Concentration is much lower than P2.
- P5 cells that duplicate earlier paths: `eager` (L9 bright) and a small handful of others. Concentration is lowest in P5.

P3–P5 have far more fresh vocabulary than P2. The acute duplication issue is concentrated in **A1P2 specifically**, especially in the Sharp vibe.

## 6. Root-Cause Hypothesis

**Selected cause: the source lesson data in `guidedLessons.ts` itself duplicates the words.** The trophy-song catalog faithfully mirrored what the lesson author wrote for A1P2.

Ruled out:
- *Trophy-song script read the wrong path.* No — the catalog is hand-authored, not script-derived. Each A1P2 song row's `pathId` correctly says `english-a1-practical-2`, and the trophy words match the A1P2 lesson trophy words exactly (§4), not A1P1's.
- *Resolver fallback is wrong.* No — `resolveGuidedLessonVariant` ([guidedLessons.ts:5473](../../frontend/src/data/guidedLessons.ts#L5473)) only falls back to a default vibe when a requested vibe is missing. It is not used by the song catalog at all and it does not cross paths.
- *`guidedTrophySongs.ts` copied A1P1 content manually.* No — the lyric bodies for A1P2 segment rows are different from A1P1 rows (e.g. A1P2 segment-1 bright lyrics use a "wrote it on the page / Lovely, thank you" frame; A1P1 segment-1 bright lyrics use the "corner cafe / Delighted to meet you" frame). The author wrote A1P2-specific lyrics around A1P2 trophy words — those words just happened to be ~70% the same vocabulary as A1P1.

What actually happened: when the A1P2 lesson variants were written, the author drew heavily from the same small A1 service-encounter palette ("clear, quick, settled, done", "gently, slowly, quiet, soft", "lovely, glad, brilliant") that already filled A1P1's lessons. The trophy-song generation step then bundled the L1–5 / L6–10 trophy words into segment songs, surfacing the duplication.

## 7. Test Coverage Gap

### Why the existing tests pass
- [test-guided-trophy-songs.ts](../../frontend/scripts/test-guided-trophy-songs.ts) — has a hard-coded `expectedTrophyWords` map ([test-guided-trophy-songs.ts:56](../../frontend/scripts/test-guided-trophy-songs.ts#L56)) that just re-states the file's own values, then asserts the file matches that map. This is tautological. It also asserts each song row has exactly 5 trophy words and that every `<<wrapped>>` lyric token is in `trophyWords`. None of these checks compare across rows or across paths.
- [test-guided-cross-vibe.ts](../../frontend/scripts/test-guided-cross-vibe.ts) — does check trophy distinctness but **only within a single lesson, across the three vibes** (bright vs wistful vs sharp for the same lessonNumber, same pathId). Cross-path collisions never trigger the trophy collision check. Confirmed at [test-guided-cross-vibe.ts:230-252](../../frontend/scripts/test-guided-cross-vibe.ts#L230).
- [test-guided-today-data.ts](../../frontend/scripts/test-guided-today-data.ts) — validates shape (every lesson has 3 vibes, each variant has a trophyWord, the trophy word example/meaning strings are non-empty, etc.) but does not compare trophy words across lessons or paths.
- [test-guided-vibes.ts](../../frontend/scripts/test-guided-vibes.ts) — only validates vibe registry shape (palette, emblem, etc.), nothing about lesson trophy words.

No script in the repo enforces uniqueness of trophy words across paths.

### Proposed future test (not implemented in this audit)
A small diagnostic script `scripts/test-guided-trophy-word-uniqueness.ts` could:
1. Walk every `(pathId, lessonNumber, vibe)` in `GUIDED_LESSONS` for A1P1–A1P5.
2. Group by trophy word, then for each repeated word emit `{ word, occurrences: [(pathId, lessonNumber, vibe), …] }`.
3. Fail (or warn) when a word appears in more than one path. Within-vibe cross-path repeats should fail. Cross-vibe shared "core A1 vocabulary" repeats should warn and route to a small allowlist the product owner explicitly maintains (similar pattern to the existing `ALLOWLIST` at [test-guided-cross-vibe.ts:42](../../frontend/scripts/test-guided-cross-vibe.ts#L42)).
4. Output the count and the offending pairs for the report.

This test is not added in this read-only audit. It would be one short file (~70 LOC) when product approves the rule.

## 8. Recommendation

**A1P2 trophy-song regeneration should remain blocked.** Re-running the audio generator now would just rebuild the same songs around the same duplicated vocabulary.

**Required next step is content-owner work in `guidedLessons.ts`, not in `guidedTrophySongs.ts`:**

1. Product/content owner reviews the A1P2 trophy words across all 30 (lesson, vibe) cells. Decide which P2 cells must use fresh vocabulary and which can legitimately reuse "core A1 service-encounter" words (e.g. `clear`, `done`, `please`-adjacent vocabulary is plausibly core A1; `splendid`/`brilliant` is harder to justify reusing).
2. Owner rewrites the affected `trophyWord` entries in `frontend/src/data/guidedLessons.ts` (P2 inputs at lines 1880–2519). The lesson body — corePhrase, scene caption, type-recall, song mood — likely also wants a small revision to fit the new trophy word.
3. After lesson data is corrected, the existing trophy-song rows for A1P2 in `guidedTrophySongs.ts` need their `trophyWords` arrays, `rawLyricsWithWrappers`, `lyricsTranslationDe`, and `musicCaption` updated to use the new words. Lyrics rewrite is required because the cloze positions and rhymes are written around specific words.
4. Once both lesson + song catalog are coherent for A1P2, run `scripts/generate-guided-trophy-song-audio.ts` (asset collection `a1p2`) to regenerate the six A1P2 trophy-song audio candidates.
5. A1P3–A1P5 trophy-song generation should remain blocked until the same uniqueness check is applied — P3 already has visible cross-path repeats (~7 cells), and the same content-owner pass should sweep P3–P5 before any song authoring starts there.

The song-generation pipeline is sound. The vocabulary upstream of it is the issue.

## What This Audit Did Not Change

- No edits to `guidedLessons.ts`.
- No edits to `guidedTrophySongs.ts`.
- No new test files.
- No audio regenerated.
- No paths or lessons created.
- Only artifact: this report file at `docs/Product/GUIDED_TROPHY_WORD_SOURCE_DUPLICATION_INVESTIGATION_2026_05_15.md`.

## Files Read

- [frontend/src/data/guidedLessons.ts](../../frontend/src/data/guidedLessons.ts) — 5703 lines.
- [frontend/src/data/guidedTrophySongs.ts](../../frontend/src/data/guidedTrophySongs.ts) — 1212 lines.
- [frontend/scripts/test-guided-trophy-songs.ts](../../frontend/scripts/test-guided-trophy-songs.ts)
- [frontend/scripts/test-guided-cross-vibe.ts](../../frontend/scripts/test-guided-cross-vibe.ts)
- [frontend/scripts/test-guided-vibes.ts](../../frontend/scripts/test-guided-vibes.ts)
- [frontend/scripts/test-guided-today-data.ts](../../frontend/scripts/test-guided-today-data.ts) (headers only)
- [frontend/scripts/generate-guided-trophy-song-audio.ts](../../frontend/scripts/generate-guided-trophy-song-audio.ts) (headers only)
