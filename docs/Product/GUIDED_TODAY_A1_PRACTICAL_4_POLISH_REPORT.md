# Guided Today A1 Practical 4 — V1.2 Polish Report

Date: 2026-05-13
Author: Claude (Opus 4.7, 1M context)
Scope: Three targeted German `baseText` edits in `frontend/src/data/guidedLessons.ts` based on the adversarial review's single FAIL plus two character-inconsistency notes.

## Commit

- Commit SHA: recorded in the final response after `git push origin main` completes. A committed file cannot contain its own final SHA without changing that SHA.
- Branch: `main`
- Push target: `origin main`

## Files Changed

- `frontend/src/data/guidedLessons.ts` — three German `baseText` strings only
- `docs/Product/GUIDED_TODAY_A1_PRACTICAL_4_POLISH_REPORT.md` — new (this file)

## Edits

### Block 1 — L5 Bright baseText (Rule 2 FAIL: awkward `bitte` placement)

- Lesson id: `english-a1-practical-4-005-is-it-fresh`
- Variant: `bright`
- Field: `baseText`

Before:
```
Ist es heute bitte frisch?
```
After:
```
Ist das heute frisch?
```

Reasoning. Mid-sentence `bitte` inside a polar yes/no question is non-native in German shop register — it reads as if the speaker were asking the food to please be fresh, rather than asking the clerk to please answer. Native shop-counter freshness checks omit `bitte`. Also switched the pronoun `es` to `das` because the shop-counter context calls for a deictic (pointing at an item in the case) rather than an antecedent-less pronoun. The English target `"Is it fresh today, please?"` is unchanged.

### Block 2 — L7 Wistful baseText (Wistful character: German injected `bitte` not in English target)

- Lesson id: `english-a1-practical-4-007-to-go-please`
- Variant: `wistful`
- Field: `baseText`

Before:
```
Zum Mitnehmen bitte, wenn das möglich ist?
```
After:
```
Zum Mitnehmen, wenn das möglich ist?
```

Reasoning. The English target is `"To go, if possible?"` — no "please" present. The German injection of `bitte` made Wistful louder in German than in English. Wistful's signature is restraint, not polite-particle stacking; the `wenn das möglich ist?` conditional softener already carries the Wistful character beat on its own. The English target is unchanged.

### Block 3 — L8 Wistful baseText (Wistful character: German appended `danke` not in English target)

- Lesson id: `english-a1-practical-4-008-it-was-good`
- Variant: `wistful`
- Field: `baseText`

Before:
```
Das war wirklich schön, danke.
```
After:
```
Das war wirklich schön.
```

Reasoning. The English target is `"That was really nice."` — intentionally bare, no closing thanks. That bareness is the Wistful character beat ("means what they say, even when they say very little" from the vibe bible). The trailing `, danke` in German broke that restraint and made Wistful's gratitude more effusive in German than in English. The English target is unchanged.

## Self-review

1. **Only three German `baseText` fields changed.** Verified by `git diff -- frontend/src/data/guidedLessons.ts`:
   - Line 3566: L5 Bright `baseText`
   - Line 3742: L7 Wistful `baseText`
   - Line 3819: L8 Wistful `baseText`
2. **No English `targetText` changes.** All three pairs had their English target inspected before and after; the English remained byte-identical.
3. **No other lesson, vibe, or field touched.** No `chunks`, no `extraLessonItems`, no `targetChips`, no `distractors`, no `typeRecall`, no `sceneCaption`, no `mediaCaption`, no `trophyWord`, no `songSeed`, no `visualNotes`, no `meaning`. The diff is exactly six changed lines (three deletions + three insertions).
4. **No A1P1, A1P2, A1P3, or A1P5 content modified.** All three changes sit inside the `a1Practical4Inputs` array. A1P5 does not exist in this commit.
5. **Umlauts use proper Unicode.** The retained `möglich` (`ö` = U+00F6) and `schön` (`ö` = U+00F6) are preserved as native Unicode characters, not ASCII transliterations. The umlaut guard in `test-guided-today-data.ts` passed.
6. **No tests touched.** Only the data file and this report changed.
7. **No backend / Supabase / provider / generation / deck / word / global-theme / translations work.** This is data-only polish.

## MARGINAL findings intentionally NOT patched (per move-faster calibration)

The adversarial review surfaced five MARGINAL cross-vibe distinctness pairs and three other non-FAIL notes. All are intentionally left alone in this polish pass:

- **L6 Anything else? — Wistful vs Sharp MARGINAL.** "No, that's all, thank you." vs "That's all, thanks." — both closing nucleus with slim Wistful character beat.
- **L7 To go, please — Wistful vs Sharp MARGINAL.** "To go, if possible?" vs "To go, please." — both noun-phrase + politeness particle.
- **L8 It was good — Bright vs Wistful MARGINAL.** "That was lovely, thank you." vs "That was really nice." — shared "That was [praise]" skeleton.
- **L9 Small talk at the counter — Bright vs Wistful MARGINAL.** "Beautiful day, isn't it?" vs "Quiet today, isn't it?" — identical tag-question skeleton, adjective-only differentiation.
- **L10 The bill, please — Wistful vs Sharp MARGINAL.** "Just the bill, if that's alright?" vs "The bill, please." — Sharp is a strict subset of Wistful's frame.
- **L6 Bright trophy `plenty` / example "Plenty, thank you." (Rule 5 borderline note).** Trophy phrase signals declining-more while Bright's lesson target is additive ("Yes, a croissant too, please."). Left alone — `plenty` still situated in café-counter context, and the other two L6 trophies are clean.
- **Sharp trophy meta-description style (Rule 5 minor pattern note).** "Clear table request.", "Quick scan.", "Brief note." read more like meta-descriptions than utterances. Stays coherent with Sharp aesthetic; not flagged.

Rationale for deferring: none of the MARGINALs cross the FAIL threshold. Vibe character is still legible in every pair. Patching them would require either rewriting one of the three vibes' targets (breaking the test-enforced opener-variety, "Please" cap, "I'd love" cap, "Sorry" cap caps) or substituting fresh English phrasings (broader rewrite scope than this polish pass). The L5 Bright FAIL was the only Rule-strict violation and is fixed.

## Test Output

### `npx tsx scripts/test-guided-today-data.ts`

```
... (3615 ok lines)
  ok  written localStorage progress uses schema version 2

3615 passed, 0 failed
```

Includes the test-enforced gates for A1P4 specifically:
- `A1 Practical 4 bright trophy words are distinct`
- `A1 Practical 4 wistful trophy words are distinct`
- `A1 Practical 4 sharp trophy words are distinct`
- `A1 Practical 4 bright uses at least three opener families`
- `A1 Practical 4 wistful uses at least three opener families`
- `A1 Practical 4 sharp uses at least three opener families`
- `A1 Practical 4 Wistful uses Sorry in no more than two lessons`
- `A1 Practical 4 Bright uses I'd love in no more than three lessons`
- `A1 Practical 4 Sharp uses Please in no more than four lessons`
- `German learner-facing Guided Today fields avoid common ASCII transliterations`
- `German learner-facing Guided Today fields avoid lost-byte (?) diacritic corruption`
- `German learner-facing Guided Today fields avoid UTF-8 mojibake (Ã¶ etc.)`

### `npx tsx scripts/test-guided-vibes.ts`

```
... (98 ok lines)
  ok  clearing selected vibe returns to default

98 passed, 0 failed
```

### `npx tsx scripts/test-guided-today-path-overview.ts`

```
... (125 ok lines)
  ok  Lesson 8 variants avoid known incoherent review items and chips

125 passed, 0 failed
```

The earlier non-failing `review` notes about `lesson 1/sharp`, `lesson 6/wistful`, `lesson 7/sharp` reference earlier paths (A1P1/P2/P3), not A1P4, and are unaffected by this polish.

### `npx tsx scripts/test-checkpoint-selection.ts`

```
... (28 ok lines)
  ok  Segment Review is available before any selected segment lessons are complete

28 passed, 0 failed
```

### `npx tsx scripts/test-checkpoint-trigger.ts`

```
... (8 ok lines)
  ok  same progress can trigger for the vibe that completed the second path

8 passed, 0 failed
```

### `npx tsx scripts/test-checkpoint-storage.ts`

```
... (15 ok lines)
  ok  Bright count advances after second completion

15 passed, 0 failed
```

### `npm run check:i18n`

```
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

Exit code 0. German coverage 979/979. French gaps unchanged from the prior commit and pre-existing.

### `npx eslint src/data/guidedLessons.ts`

```
(no output)
```

### `npm run build`

```
> frontend@0.0.0 build
> tsc -b && vite build

...
✓ built in 1.16s
```

Existing non-blocking warnings about `src/lib/supabase.ts` dynamic import chunking and chunks larger than 500 kB are unchanged from before the polish; no new warnings introduced.

### `git diff --check` and `git diff --cached --check`

```
(no output)
```

No whitespace errors.

## Known Limitations and Judgment Calls

- Three MARGINAL Bright/Wistful adjective-swap pairs (L8 and L9) and three Wistful/Sharp tail-only pairs (L6/L7/L10) remain. They are within A1 simplicity constraints and pass character integrity — left alone here per the move-faster calibration.
- The trailing `, danke` removed from L8 Wistful baseText could be reconsidered if Sir Robert wants the German formal-politeness layer above the English; current edit aligns German with English bareness.
- The polish does not change any trophy word, chunk, target, distractor, or chip — those are out of scope per the brief.
