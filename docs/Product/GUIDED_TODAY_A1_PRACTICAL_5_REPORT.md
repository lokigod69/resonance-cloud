# Guided Today A1 Practical 5 Report

Date: 2026-05-13

## Commit

- Commit SHA: recorded in the final response after `git push origin main` completes. A committed file cannot contain its own final SHA without changing that SHA.
- Branch: `main`
- Push target: `origin main`

## Files Changed

- `frontend/src/data/guidedLessons.ts`
- `frontend/scripts/test-guided-today-data.ts`
- `frontend/scripts/test-guided-today-path-overview.ts`
- `frontend/scripts/test-checkpoint-selection.ts`
- `docs/Product/GUIDED_TODAY_A1_PRACTICAL_5_REPORT.md`

## A1P5 Path Summary

Added `english-a1-practical-5`, titled `English A1 Practical 5`, with subtitle `Simple Problems and Plans`. The path contains 10 active A1 lessons: late apology, forgetting, asking a name, responding to an introduction, origin question, local check, tonight availability, café meeting plan, postponing to tomorrow, and tomorrow farewell. Every lesson uses the existing Foundation flow only: Scene -> Match Pairs -> Build Phrase -> Type Recall -> Speak -> Complete.

## Vibe Distinction Summary

Bright uses warm, socially open phrasing for small problems and plans: `I'm so sorry...`, `Oh, I forgot`, direct friendly questions, and positive planning language. The vibe adds warmth through sincere repair, open curiosity, and clear follow-through without childish enthusiasm.

Wistful uses careful, low-pressure phrasing: the two allowed `Sorry` openers appear only in lessons 1 and 2, then the path leans on `May I ask`, `Just curious`, `Maybe`, and soft confirmations. It stays practical and careful rather than sad, with concrete trophy choices such as `roots`, `suggest`, and `defer`.

Sharp uses compressed, intent-first phrasing: `Sorry, late`, `I forgot`, `Your name?`, `Local?`, `Free tonight?`, and `Café, six o'clock.` It remains polite through context, German cues, and brief positive close-outs, while avoiding command-only or rude wording.

## Trophy Word Table

| Lesson | Bright | Wistful | Sharp |
|---|---|---|---|
| 1 | sincere | relief | quick |
| 2 | recover | honest | noted |
| 3 | curious | ask | direct |
| 4 | delighted | pleased | brief |
| 5 | open | roots | origin |
| 6 | neighbor | gentle | local |
| 7 | eager | tentative | slot |
| 8 | plan | suggest | fixed |
| 9 | hopeful | defer | shift |
| 10 | farewell | then | close |

All trophy words are unique within each A1P5 vibe.

## Opener Count Table

| Vibe | Max Count | Notes |
|---|---:|---|
| Bright | 1 | `I'd love` appears 0 times, under the cap of 3. |
| Wistful | 1 | `Sorry` appears 2 times total, exactly within the cap of 2. |
| Sharp | 1 | `Please` appears 0 times as an opener, under the cap of 4. |

## Self-Review

- Wistful `Sorry` count: 2.
- Bright `I'd love` count: 0.
- Sharp `Please` opener count: 0.
- No opener family appears more than once within any A1P5 vibe.
- Each lesson has three meaningfully distinct variants; the variants change stance and phrasing, not just courtesy words.
- Type Recall targets are meaningful chunks such as `I'm late`, `the bus was slow`, `Where are you from`, `free tonight`, `at the café`, `Maybe tomorrow`, and `See you tomorrow`.
- Speak `baseCue` values are German.
- Scene and media captions are lesson-specific.
- German learner-facing fields use proper Unicode, including `spät`, `zurückhaltende`, `höflich`, `Nähe`, `prüft`, `Café`, `schlägt`, `nächstes`, `Tür`, and `tschüss`.
- German baseTexts use natural modern phrasing and avoid stiff `dieser Ort`-style wording.
- Sharp variants stay direct but polite; Wistful variants stay careful but usable; Bright variants stay warm and adult.

## Existing Content Scope

A1P1, A1P2, A1P3, and A1P4 lesson content was not edited. A1P5 was added as a new input array, new metadata, and a new spread into `GUIDED_LESSONS`; the path selector remains data-driven through `getGuidedTodayPathOptions()`.

No backend, Supabase, provider, generation, deck, word, global-theme, or translations work was included in this A1P5 commit.

## Test Output

### Red test check before implementation

```text
[path inventory]
  FAIL A1 Practical 5 resolves 10 lessons
        0
  FAIL A1 Practical 5 arc titles match product sequence
        []
  FAIL path selector source exposes all active paths
...
[A1 Practical 5 content polish]
  FAIL A1 Practical 5 bright trophy words are distinct
        []
  FAIL A1 Practical 5 bright uses at least three opener families
        []
  FAIL A1 Practical 5 wistful trophy words are distinct
        []
  FAIL A1 Practical 5 wistful uses at least three opener families
        []
  FAIL A1 Practical 5 sharp trophy words are distinct
        []
  FAIL A1 Practical 5 sharp uses at least three opener families
        []

3620 passed, 9 failed
```

### `npx tsx scripts/test-guided-today-data.ts`

```text
[path inventory]
  ok  A1 Practical 1 resolves 10 lessons
  ok  A1 Practical 2 resolves 10 lessons
  ok  A1 Practical 3 resolves 10 lessons
  ok  A1 Practical 4 resolves 10 lessons
  ok  A1 Practical 5 resolves 10 lessons
  ok  static lessons belong only to active V0 paths
  ok  lesson ids are unique
  ok  lesson numbers 1-10 exist with no gaps
  ok  A1 Practical 1 arc titles match product sequence
  ok  A1 Practical 2 arc titles match product sequence
  ok  A1 Practical 3 arc titles match product sequence
  ok  A1 Practical 4 arc titles match product sequence
  ok  A1 Practical 5 arc titles match product sequence
  ok  path selector source exposes all active paths

[A1 Practical 5 content polish]
  ok  A1 Practical 5 bright trophy words are distinct
  ok  A1 Practical 5 bright uses at least three opener families
  ok  A1 Practical 5 bright uses no opener family more than three times
  ok  A1 Practical 5 wistful trophy words are distinct
  ok  A1 Practical 5 wistful uses at least three opener families
  ok  A1 Practical 5 wistful uses no opener family more than three times
  ok  A1 Practical 5 sharp trophy words are distinct
  ok  A1 Practical 5 sharp uses at least three opener families
  ok  A1 Practical 5 sharp uses no opener family more than three times
  ok  A1 Practical 5 Wistful uses Sorry in no more than two lessons
  ok  A1 Practical 5 Bright uses I'd love in no more than three lessons
  ok  A1 Practical 5 Sharp uses Please in no more than four lessons

[German learner-facing diacritics]
  ok  German learner-facing Guided Today fields avoid common ASCII transliterations
  ok  German learner-facing Guided Today fields avoid lost-byte (?) diacritic corruption
  ok  German learner-facing Guided Today fields avoid UTF-8 mojibake (Ã¶ etc.)

[local progress]
  ok  path progress does not mix A1 Practical 5 with earlier paths

4510 passed, 0 failed
```

### `npx tsx scripts/test-guided-vibes.ts`

```text
[local storage]
  ok  storage key is path-scoped
  ok  missing selected vibe defaults to bright
  ok  selected active vibe persists locally
  ok  invalid stored vibe falls back to bright
  ok  future vibe cannot be selected in active UI helper
  ok  clearing selected vibe returns to default

98 passed, 0 failed
```

### `npx tsx scripts/test-guided-today-path-overview.ts`

```text
[path overview status]
  ok  A1 Practical 1 overview exposes 10 lessons
  ok  A1 Practical 2 overview exposes 10 lessons
  ok  A1 Practical 3 overview exposes 10 lessons
  ok  A1 Practical 4 overview exposes 10 lessons
  ok  A1 Practical 5 overview exposes 10 lessons

[pure selection and restart behavior]
  ok  A1 Practical 5 count stays scoped after earlier path completions
  ok  earlier path counts stay scoped after A1 Practical 5 completion

[vibe behavior]
  ok  A1 Practical 5 can persist its own selected voice
  ok  A1 Practical 4 keeps its selected voice after A1 Practical 5 selection

[source-level UX simplification]
  ok  path selector source exposes implemented active paths

130 passed, 0 failed
```

### `npx tsx scripts/test-checkpoint-selection.ts`

```text
[distribution]
  ok  five completed paths yields 8 checkpoint items
  ok  five completed paths split 1/1/2/2/2 with newest paths carrying remainder
  ok  five-path checkpoint order avoids adjacent same-path items where possible

[path check]
  ok  A1 Practical 5 Path Check can build a plan without completed lessons
  ok  A1 Practical 5 Path Check samples only A1P5

33 passed, 0 failed
```

### `npx tsx scripts/test-checkpoint-trigger.ts`

```text
[path completion trigger]
  ok  empty progress has zero completed checkpoint paths
  ok  empty progress has no pending checkpoint
  ok  one fully completed active-vibe path counts as complete
  ok  one completed path and zero checkpoints triggers Quick Review
  ok  one completed path and one checkpoint does not trigger another Quick Review
  ok  partial second path does not advance completed path count
  ok  path completed in another vibe does not count for active vibe
  ok  same progress can trigger for the vibe that completed the second path

8 passed, 0 failed
```

### `npx tsx scripts/test-checkpoint-storage.ts`

```text
[completion write]
  ok  completion writes index 0 record
  ok  completion record stores timestamp
  ok  completion record stores item count
  ok  completion record stores first-try total
  ok  completion record stores item review flags
  ok  read record round-trips the stored shape
  ok  Bright count advances after first completion
  ok  next Bright checkpoint index advances to 1
  ok  Wistful count is independent
  ok  second Bright completion writes index 1
  ok  second Bright completion uses independent timestamp
  ok  Bright count advances after second completion

15 passed, 0 failed
```

### `npm run check:i18n`

```text
> frontend@0.0.0 check:i18n
> tsx scripts/check-i18n-coverage.ts

[i18n] Source locale en: 979 keys
[i18n] de: 979/979 keys covered
[i18n] fr: 967/979 keys covered. Missing keys are warn-only for now because French gaps are known and out of scope for the German Phase 0 PR:
  - speak.newChatConfirmAction
  - speak.newChatConfirmDescription
  - speak.newChatConfirmTitle
  - speak.studyModeOffToast
  - speak.studyModeOnToast
  - today.trophyWord.exampleLabel
  - today.trophyWord.title
  - today.trophyWord.whyLabel
  - today.vibeIndicator
  - today.vibePicker.exampleLabel
  - today.vibePicker.subtitle
  - today.vibePicker.title
```

### `npx eslint src/data/guidedLessons.ts scripts/test-guided-today-data.ts scripts/test-guided-today-path-overview.ts scripts/test-checkpoint-selection.ts`

```text
(no output)
```

### `npm run build`

```text
> frontend@0.0.0 build
> tsc -b && vite build

✓ 2673 modules transformed.
✓ built in 1.08s
```

Existing non-blocking build warnings remain for `src/lib/supabase.ts` dynamic import chunking and chunks larger than 500 kB.

### `git diff --check`

```text
(no whitespace errors; Git emitted only existing LF-to-CRLF working-copy warnings for touched files)
```

## Known Limitations and Judgment Calls

- The report includes the full A1P5-specific portions of the data, overview, and checkpoint test output rather than the full multi-thousand-line data-test log.
- The German cue heuristic in `test-guided-today-data.ts` recognizes a finite list of German signals, so two A1P5 German base cues were phrased naturally while including an existing signal (`ich`) instead of expanding test infrastructure.
- Lesson 8 uses `Café` in both English target and German base fields to honor the Unicode contract.
- Sharp lesson 10 uses `Tomorrow. See you.` instead of a bare duplicate `Tomorrow.` so the parting confirmation remains distinct from lesson 9 while preserving the brief direction.
- Existing unrelated untracked A1P2 draft docs were left untouched.
