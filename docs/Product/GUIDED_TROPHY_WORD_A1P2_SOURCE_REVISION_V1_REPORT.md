# Guided Trophy Word — A1P2 Source Revision V1

Date: 2026-05-15
Author: Claude (implementation pass)
Repo: d:\CODING\ResonanceTEST\orchestrator
Branch: main
Scope: lesson trophy-word source data only.

This pass fixes the 21-of-30 A1P1↔A1P2 trophy-word duplication that was flagged in [GUIDED_TROPHY_WORD_SOURCE_DUPLICATION_INVESTIGATION_2026_05_15.md](GUIDED_TROPHY_WORD_SOURCE_DUPLICATION_INVESTIGATION_2026_05_15.md). It revises only the lesson trophy words in `frontend/src/data/guidedLessons.ts`, diversifies the A1P2 `songSeed.genre` tags away from the bright=acoustic-pop / wistful=folk / sharp=synth-pulse fence per [GUIDED_TROPHY_SONG_MUSICALITY_RESET_V2.md](GUIDED_TROPHY_SONG_MUSICALITY_RESET_V2.md), and adds a small diagnostic test that will keep this category of duplication out of the data going forward.

No edits to `guidedTrophySongs.ts`, no audio touched, no provider/backend changes, no P1 / P3 / P4 / P5 changes.

## Files Changed

- `frontend/src/data/guidedLessons.ts` — A1P2 trophy words, A1P2 distractor chips, A1P2 songSeed values updated. A1P1 and A1P3–A1P5 untouched.
- `frontend/scripts/test-guided-trophy-word-uniqueness.ts` — **new** small diagnostic that hard-fails on any A1P1↔A1P2 same-vibe collision and on any within-path repeat that is not allowlisted. Allowlist captures product-owner-approved repeats with a written reason.
- `docs/Product/GUIDED_TROPHY_WORD_A1P2_SOURCE_REVISION_V1_REPORT.md` — this report.

## Old A1P2 Trophy Word Matrix

Pre-revision A1P2 trophy words. 21 of 30 duplicated A1P1.

| L# | Lesson title | Bright (old) | Wistful (old) | Sharp (old) |
|---|---|---|---|---|
| 1 | I don't understand | lovely* | gently* | clear* |
| 2 | Write it down | glad* | slowly* | quick* |
| 3 | Show me | brilliant* | perhaps* | exactly* |
| 4 | Which one? | ready* | quiet* | decided* |
| 5 | Do you have…? | charming* | soft* | certain* |
| 6 | By card | easy | again* | straight* |
| 7 | A receipt, please | splendid* | near | focused* |
| 8 | I have a reservation | kind | calm | direct |
| 9 | Is this right? | sure | simple | settled* |
| 10 | One moment | cheerful | patient | done* |

`*` = duplicates an A1P1 trophy word.

Duplicate count before this pass:
- Bright: 6 of 10 (lovely, glad, brilliant, ready, charming, splendid)
- Wistful: 6 of 10 (gently, slowly, perhaps, quiet, soft, again)
- Sharp: 9 of 10 (clear, quick, exactly, decided, certain, straight, focused, settled, done)
- **Total A1P1↔A1P2 same-vibe duplicates: 21 of 30 (70%)**

## New A1P2 Trophy Word Matrix

| L# | Lesson title | Bright (new) | Wistful (new) | Sharp (new) |
|---|---|---|---|---|
| 1 | I don't understand | **happy** | **maybe** | **short** |
| 2 | Write it down | **warm** | **kindly** | **note** |
| 3 | Show me | **right** | **somewhere** | **here** |
| 4 | Which one? | **fine** | **either** | **this** |
| 5 | Do you have…? | **fresh** | **anywhere** | **any** |
| 6 | By card | easy | **carefully** | **now** |
| 7 | A receipt, please | **neat** | near | **two** |
| 8 | I have a reservation | kind | calm | direct |
| 9 | Is this right? | sure | simple | **yes** |
| 10 | One moment | cheerful | patient | **wait** |

Bold = revised in this pass. Plain = kept (already unique and good).

Duplicate count after this pass:
- A1P1↔A1P2 same-vibe duplicates: **0 of 30**
- A1P2 internal uniqueness: **30 of 30 distinct**

## Which A1P2 Words Were Replaced

| Cell | Old | New | Rationale |
|---|---|---|---|
| L1 bright | lovely | happy | A1, social, real reaction after help arrives; not in P1. |
| L1 wistful | gently | maybe | A1, hesitant hope before asking; carries Wistful uncertainty without sleep. |
| L1 sharp | clear | short | A1, decisive request shape; Sharp without being "clear" again. |
| L2 bright | glad | warm | A1-ish, warmth without praise-spam; "warm thanks" is real English. |
| L2 wistful | slowly | kindly | A1+, soft request adverb; fits "could you write it kindly". |
| L2 sharp | quick | note | A1, noun-as-direct-ask ("Note, please.") — Sharp service register. |
| L3 bright | brilliant | right | A1, very high-utility confirmation word for A1 learners. |
| L3 wistful | perhaps | somewhere | A1, suspended pointing ("somewhere here?"). |
| L3 sharp | exactly | here | A1, the most direct pointer; Sharp by virtue of compactness. |
| L4 bright | ready | fine | A1, low-stakes positive ("a fine choice"). |
| L4 wistful | quiet | either | A1, real decision-hedging word A1 learners need. |
| L4 sharp | decided | this | A1, decisive demonstrative — Sharp at its most compact. |
| L5 bright | charming | fresh | A1, fits service/shop context ("Is it fresh? — Fresh, thanks."). |
| L5 wistful | soft | anywhere | A1, parallels L3 "somewhere" but for availability scope. |
| L5 sharp | certain | any | A1, direct stock check ("Any in stock?"). |
| L6 wistful | again | carefully | A1+, slow careful payment posture, replaces the L6 repair word. |
| L6 sharp | straight | now | A1, time-anchored decisiveness at the till. |
| L7 bright | splendid | neat | A1, low-key "nice job" word; not praise-fancy. |
| L7 sharp | focused | two | A1, decisive number naming the two items requested. |
| L9 sharp | settled | yes | A1, the most direct affirmation; Sharp service confirmation. |
| L10 sharp | done | wait | A1, Sharp pause that names the action without slogan. |

Total replacements: **21 cells**.

## Which A1P2 Words Stayed

These were already unique vs A1P1 and good for the lesson; kept unchanged.

| Cell | Word | Note |
|---|---|---|
| L6 bright | easy | A1, fits payment moment cleanly. |
| L7 wistful | near | A1, fits "receipt is near the door". |
| L8 bright | kind | A1, fits warm arrival. |
| L8 wistful | calm | A1, fits quiet arrival. |
| L8 sharp | direct | A1, fits decisive reservation phrase. |
| L9 bright | sure | A1, fits confirmation. |
| L9 wistful | simple | A1, fits careful check. |
| L10 bright | cheerful | A1, fits bright pause. |
| L10 wistful | patient | A1, fits wistful pause. |

Total kept: **9 cells**.

## Intentional Cross-Path Repeats (Informational)

The new uniqueness diagnostic reports the following informational A1P2-to-other-path repeats. None are A1P1↔A1P2 same-vibe collisions, and none were introduced by this revision — they are pre-existing facts about P3/P4/P5 trophy vocabulary that simply share a word with one of the A1P2 cells we kept unchanged:

- `direct` — A1P2 L8 sharp (kept), A1P3 L3 sharp, A1P5 L3 sharp. "Direct" is core A1 service vocabulary.
- `kind` — A1P2 L8 bright (kept), A1P4 L8 wistful. Different vibes, same word.
- `simple` — A1P2 L9 wistful (kept), A1P3 L4 bright. Different vibes.

These are flagged for product-owner awareness but are out of scope for this pass (the brief explicitly limits scope to A1P1↔A1P2). They can be revisited when P3/P4/P5 are themselves audited.

No A1P2-introduced word collides with any P3/P4/P5 cell after this pass. (The first draft of this revision used `today` at A1P2 L5 sharp, which collided with `today` at A1P4 L5 sharp; the diagnostic caught it and we swapped to `any` before committing.)

## SongSeed Changes

`songSeed.genre` and (in a few cases) `mood` were updated for all 30 A1P2 lesson/vibe cells. This is a light cleanup, not a full musicCaption rewrite — the V2 musicCaption work happens in the next pass per [GUIDED_TROPHY_SONG_MUSICALITY_RESET_V2.md](GUIDED_TROPHY_SONG_MUSICALITY_RESET_V2.md). The point of this cleanup is to break the "all bright = light acoustic pop / sunny indie pop, all wistful = soft indie folk, all sharp = minimal synth pulse" pattern that the songSeeds were locked into.

New A1P2 `songSeed.genre` rotation (drawing on V2 framework constructions as compact tags):

| L# | Bright | Wistful | Sharp |
|---|---|---|---|
| 1 | soft funk groove | shoegaze pulse | dry post-punk guitar |
| 2 | warm road rock | trip-hop hallway | staccato piano groove |
| 3 | garage-pop handshake | dub-techno memory loop | drumline precision |
| 4 | city-pop shimmer | chamber-electronic hybrid | angular guitar-pop |
| 5 | acoustic road song | motorik dusk ride | tight garage rock |
| 6 | brass-and-guitar daylight | coldwave night drive | crisp funk-bass precision |
| 7 | highlife walk | nylon-guitar memory piece | brass-hits and tight kit |
| 8 | power-pop quick yes | industrial ambient with a beat | acoustic percussion grid |
| 9 | bossa-lite lunchroom | late-night piano | piano + snare decisive |
| 10 | surf-guitar shuffle | wistful drum-and-bass | spoken-sung rhythmic pop |

These are lesson-level metadata hints. The actual rendered audio for A1P1 and A1P2 still comes from `guidedTrophySongs.ts`, which this pass does not touch.

## Confirmation Block

- A1P1 trophy words: **unchanged**. Verified by grep at lines 278–1838 in `guidedLessons.ts` — same words/meanings/examples as before.
- A1P3 trophy words: **unchanged**. Verified at lines 2594–3204.
- A1P4 trophy words: **unchanged**. Verified at lines 3279–4022.
- A1P5 trophy words: **unchanged**. Verified at lines 4067–4867.
- `frontend/src/data/guidedTrophySongs.ts`: **unchanged**.
- `frontend/public/guided/trophy-songs/a1p1/**`: **unchanged**.
- `frontend/public/guided/trophy-songs/a1p2/**`: **unchanged**.
- Audio manifests: **unchanged**.
- No audio generated this pass.
- No Supabase / backend / Music page / decks / words / generation_jobs / credits / providers / Suno / KIE / ElevenLabs / normal generation pipeline / lesson videos touched.

## Temporary Mismatch (Documented)

`guidedTrophySongs.ts` A1P2 song rows still ship the **old** trophy words inside `trophyWords` arrays, song lyrics, and German translations:

| Song-catalog row | Catalog `trophyWords` (still old) | Lesson `trophyWord.word` (revised) |
|---|---|---|
| A1P2 seg-1 bright | lovely, glad, brilliant, ready, charming | happy / warm / right / fine / fresh (L1–5 bright) |
| A1P2 seg-2 bright | easy, splendid, kind, sure, cheerful | easy / neat / kind / sure / cheerful (L6–10 bright) |
| A1P2 seg-1 wistful | gently, slowly, perhaps, quiet, soft | maybe / kindly / somewhere / either / anywhere (L1–5 wistful) |
| A1P2 seg-2 wistful | again, near, calm, simple, patient | carefully / near / calm / simple / patient (L6–10 wistful) |
| A1P2 seg-1 sharp | clear, quick, exactly, decided, certain | short / note / here / this / any (L1–5 sharp) |
| A1P2 seg-2 sharp | straight, focused, direct, settled, done | now / two / direct / yes / wait (L6–10 sharp) |

This mismatch is **expected and acceptable** because:
- A1P2 trophy songs are already **product-blocked** pending the V2 lyrics+captions pass and the audio regeneration pass.
- The current A1P2 songs are still playable for fallback (they don't crash), but they should not be considered a feature ship.
- `test-guided-trophy-songs.ts` checks the song catalog against its own hardcoded expected map — that map was authored to mirror the song catalog rows, not the lesson data. The test still passes because the catalog and its self-mirror remain in sync.
- `test-guided-cross-vibe.ts` and `test-guided-today-data.ts` operate on lesson data only, so they pass against the new lesson trophy words.

The mismatch is fully resolved by the next pass: A1P2 V2 lyrics + music captions (per §10 of the Musicality Reset V2 doc) → product review → audio regeneration → catalog row update.

## Status of A1P2 Trophy Songs

**A1P2 Trophy Songs remain BLOCKED.** Audio regeneration is gated on:
1. (done) trophy-word source revision — this pass.
2. (next) A1P2 V2 lyrics + music captions only, no audio (review on the page).
3. (after that) Product-owner approval of the new lyrics + captions.
4. (after that) audio regeneration for A1P2 only.
5. (after that) update `guidedTrophySongs.ts` A1P2 rows with new `trophyWords`, lyrics, captions, German translations.

A1P3 / A1P4 / A1P5 Trophy Songs remain blocked too. They proceed only after the A1P2 V2 cycle works end-to-end.

## Checks Run

Working from `/d/CODING/ResonanceTEST/orchestrator/frontend`:

| Command | Result |
|---|---|
| `npx tsx scripts/test-guided-vibes.ts` | 98 passed, 0 failed |
| `npx tsx scripts/test-guided-today-data.ts` | 4510 passed, 0 failed |
| `npx tsx scripts/test-guided-trophy-songs.ts` | 216 passed, 0 failed |
| `npx tsx scripts/test-guided-trophy-cloze.ts` | 36 passed, 0 failed |
| `npx tsx scripts/test-guided-cross-vibe.ts` | 0 hard fails, 0 trophy collisions, 3 warns under threshold (pre-existing) |
| `npx tsx scripts/test-guided-trophy-word-uniqueness.ts` (new) | 6 passed, 0 failed |
| `npm run build` | built in 1.12s, no errors |
| `npx eslint src/data/guidedLessons.ts scripts/test-guided-trophy-word-uniqueness.ts` | no errors |
| `git diff --check` | clean |
| `git diff --cached --check` | clean (at commit time) |

## Next Prompt — A1P2 V2 Lyrics + Music Captions Only, No Audio

Use this as the next handoff once the trophy-word revision is reviewed.

---

> **A1P2 V2 — LYRICS AND MUSIC CAPTIONS ONLY (NO AUDIO)**
>
> Canonical repo: `D:\CODING\ResonanceTEST\orchestrator`. Work on main only.
>
> Inputs:
> - Approved A1P2 trophy words from `frontend/src/data/guidedLessons.ts` after the A1P2 source revision (this report). The 30 words are listed in §"New A1P2 Trophy Word Matrix" above. The segment groupings are L1–5 (segment 1) and L6–10 (segment 2) per vibe.
> - Musical Design Framework V2 (§3) and Vibe-as-Performance-Attitude (§4) in `docs/Product/GUIDED_TROPHY_SONG_MUSICALITY_RESET_V2.md`.
> - Lyric Direction V2 (§7) in the same report.
> - Proposed A1P2 style rotation (§6 of the same report): seg-1 bright = B6 Soft Funk Open Window; seg-2 bright = B10 Highlife Walk; seg-1 wistful = W4 Shoegaze Pulse; seg-2 wistful = W2 Dub-Techno Memory Loop; seg-1 sharp = S2 Crisp Funk-Bass Precision; seg-2 sharp = S5 Drumline Precision. These are starting suggestions; deviation is allowed but must be argued.
>
> Mission:
> - Produce six full A1P2 V2 lyrics + music captions, one per (segment, vibe), using the revised trophy words.
> - Surface every full lyric, every full music caption, and every full German translation in a single new doc at `docs/Product/GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md`.
> - For each of the six rows: state the chosen style construction from V2 §5 (or document a deviation), state the eight-axis decomposition explicitly, give the full musicCaption paragraph, give the full rawLyricsWithWrappers, give the full German translation, give the cloze-position rationale per trophy word.
> - Apply the creative stance from V2 §7: real small song, not a vocabulary worksheet. Apply the "match lyric structure to caption" framing from the normal pipeline (see `cloud_engines/concept_engine/lyrics.py:434–499`) without copying Ace-Step section tags.
>
> Do not:
> - generate audio
> - modify `frontend/src/data/guidedTrophySongs.ts`
> - modify `frontend/src/data/guidedLessons.ts`
> - touch backend, providers, KIE/Suno/ElevenLabs, Music page integration, Supabase, decks, words, generation_jobs, credits, or the normal generation pipeline
> - propose A1P3–A1P5 in this pass
>
> Checks (only if any runtime file is modified — for this pass none should be):
> - `npx tsx scripts/test-guided-trophy-songs.ts`
> - `npx tsx scripts/test-guided-trophy-cloze.ts`
> - `npx tsx scripts/test-guided-vibes.ts`
> - `npx tsx scripts/test-guided-today-data.ts`
> - `npx tsx scripts/test-guided-trophy-word-uniqueness.ts`
> - `git diff --check`
> - `git diff --cached --check`
>
> Final response should include:
> - path of the new lyrics-and-captions doc
> - confirmation that no runtime files were modified
> - confirmation that no audio was generated
> - confirmation that A1P2 V2 audio remains blocked pending product review of the new doc
> - recommended next step (product-owner review checklist for the new doc, then audio regeneration if approved)

---

## Summary

- 21 A1P2 trophy words revised. 9 kept.
- 30 of 30 A1P2 cells now internally distinct.
- 0 A1P1↔A1P2 same-vibe duplicates.
- Three pre-existing P2↔P3/P4 informational repeats flagged (kept words, different vibes).
- A1P2 `songSeed` values rotated to break the genre-as-vibe fence.
- New diagnostic test `test-guided-trophy-word-uniqueness.ts` will keep this category of duplication out of future passes.
- `guidedTrophySongs.ts` deliberately not changed; A1P2 song rows will mismatch lesson data temporarily; the mismatch resolves in the next pass.
- A1P2 / A1P3 / A1P4 / A1P5 Trophy Songs remain blocked.
- All six test scripts, `npm run build`, and ESLint clean.
