# Guided Today A1 Practical 4 Report

Date: 2026-05-13

## Commit

- Commit SHA: recorded in the final response after `git push origin main` completes. A committed file cannot contain its own final SHA without changing that SHA.
- Branch: `main`
- Push target: `origin main`

## Files Changed

- `frontend/src/data/guidedLessons.ts`
- `frontend/scripts/test-guided-today-data.ts`
- `docs/Product/GUIDED_TODAY_A1_PRACTICAL_4_REPORT.md`

## A1P4 Path Summary

Added `english-a1-practical-4`, titled `English A1 Practical 4`, with subtitle `Food, Café, Shop, Small Talk`. The path contains 10 active A1 lessons: table request, menu request, tea order, no-sugar preference, freshness check, anything-else response, takeaway request, brief compliment, counter small talk, and bill request. Every lesson uses the existing Foundation flow only: Scene -> Match Pairs -> Build Phrase -> Type Recall -> Speak -> Complete.

## Vibe Distinction Summary

Bright uses warm, socially open service language: `Could we have...`, `Could I see...`, `I'd love...`, and friendly close-outs. It often includes a little extra context such as party size, lemon, croissant, or a polite thank-you, while staying adult and practical.

Wistful uses careful, low-pressure phrasing: `Just...`, `May I...`, `Maybe...`, `if possible`, and quiet observations. It avoids sadness and keeps each line usable at A1 level by making the speaker gentle rather than passive.

Sharp uses compressed, intent-first phrasing: `Table for two`, `The menu`, `Black tea`, `No sugar`, `Fresh today`, and `The bill`. It stays polite through context or brief courtesy, but avoids rude commands and avoids filler.

## Trophy Word Table

| Lesson | Bright | Wistful | Sharp |
|---|---|---|---|
| 1 | welcome | quietly | clear |
| 2 | choice | wondering | quick |
| 3 | cozy | soothing | black |
| 4 | clean | plain | none |
| 5 | crisp | careful | today |
| 6 | plenty | enough | done |
| 7 | ready | lightly | packed |
| 8 | lovely | kind | solid |
| 9 | chatty | shy | brief |
| 10 | settled | softly | total |

All trophy words are unique within each A1P4 vibe.

## Opener Count Table

| Vibe | Max Count | Notes |
|---|---:|---|
| Bright | 1 | `I'd love` appears once, under the cap of 3. |
| Wistful | 1 | `Sorry` appears 0 times, under the cap of 2. |
| Sharp | 1 | `Please` appears 0 times as an opener, under the cap of 4. |

## Self-Review

- Wistful `Sorry` count: 0.
- Bright `I'd love` count: 1.
- Sharp `Please` opener count: 0.
- No opener family appears more than once within any A1P4 vibe.
- Type Recall targets are meaningful chunks, including `a table for two`, `a tea with lemon`, `is the bread fresh`, `That was lovely`, `Busy day`, and `the bill`.
- Speak `baseCue` values are German.
- Scene and media captions are lesson-specific.
- German learner-facing fields use Unicode German, including `Café`, `Könnte`, `für`, `Tüte`, `Gebäck`, `schön`, `möglich`, and `Rechnung`.

## Existing Content Scope

A1P1, A1P2, and A1P3 lesson content was not edited. The only shared data-shape change is optional `extraLessonItems` support in the existing variant factory so A1P4 lessons can carry 5-7 micro-situation items without duplicating the older path content.

No backend, Supabase, provider, generation, deck, word, global-theme, or translations work was included in this A1P4 commit.

## Test Output

### `npx tsx scripts/test-guided-today-data.ts`

```text
[path inventory]
  ok  A1 Practical 1 resolves 10 lessons
  ok  A1 Practical 2 resolves 10 lessons
  ok  A1 Practical 3 resolves 10 lessons
  ok  A1 Practical 4 resolves 10 lessons
  ok  path selector source exposes all active paths

[A1 Practical 4 content polish]
  ok  A1 Practical 4 bright trophy words are distinct
  ok  A1 Practical 4 bright uses at least three opener families
  ok  A1 Practical 4 bright uses no opener family more than three times
  ok  A1 Practical 4 wistful trophy words are distinct
  ok  A1 Practical 4 wistful uses at least three opener families
  ok  A1 Practical 4 wistful uses no opener family more than three times
  ok  A1 Practical 4 sharp trophy words are distinct
  ok  A1 Practical 4 sharp uses at least three opener families
  ok  A1 Practical 4 sharp uses no opener family more than three times
  ok  A1 Practical 4 Wistful uses Sorry in no more than two lessons
  ok  A1 Practical 4 Bright uses I'd love in no more than three lessons
  ok  A1 Practical 4 Sharp uses Please in no more than four lessons

[German learner-facing diacritics]
  ok  German learner-facing Guided Today fields avoid common ASCII transliterations
  ok  German learner-facing Guided Today fields avoid lost-byte (?) diacritic corruption
  ok  German learner-facing Guided Today fields avoid UTF-8 mojibake (Ã¶ etc.)

3615 passed, 0 failed
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

[content coherence audit]
  ok  Lesson 8 variants avoid known incoherent review items and chips

125 passed, 0 failed
```

### `npx tsx scripts/test-checkpoint-selection.ts`

```text
[distribution]
  ok  four completed paths yields 8 checkpoint items
  ok  four completed paths split 2/2/2/2
  ok  four-path checkpoint order avoids adjacent same-path items where possible

[path check]
  ok  A1 Practical 4 Path Check can build a plan without completed lessons
  ok  A1 Practical 4 Path Check samples only A1P4

28 passed, 0 failed
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
✓ built in 1.14s
```

Existing non-blocking build warnings remain for `src/lib/supabase.ts` dynamic import chunking and chunks larger than 500 kB.

### `git diff --check`

```text
(no whitespace errors)
```

## Known Limitations and Judgment Calls

- The report includes condensed verbatim pass output rather than the full multi-thousand-line data-test log, because the data script prints every lesson and variant assertion.
- A1P4 uses optional `extraLessonItems` in the shared variant factory to satisfy the 5-7 micro-situation item requirement while preserving the older A1P1/P2/P3 authored content.
- Path selector exposure is data-driven through `getGuidedTodayPathOptions()`, so no `Today.tsx` change was needed.
- Existing unrelated worktree changes were left unstaged.
