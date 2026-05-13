# Guided Today A1 Practical 5 V1.2 Polish Report

Date: 2026-05-13

## Commit

- Commit SHA: recorded in the final response after `git push origin main` completes. A committed file cannot contain its own final SHA without changing that SHA.
- Branch: `main`
- Push target: `origin main`

## Files Changed

- `frontend/scripts/test-guided-today-data.ts`
- `frontend/src/data/guidedLessons.ts`
- `docs/Product/GUIDED_TODAY_A1_PRACTICAL_5_POLISH_REPORT.md`

## Block A - German-Signal Validator Widening

The `looksLikeGermanCue()` marker list was widened from 26 markers to 103 markers.

Markers added:

- Pronouns: `wir`, `uns`, `dir`, `dich`, `sich`, `ihn`, `ihm`
- Articles and contractions: `der`, `die`, `dem`, `den`, `ein`, `eine`, `einer`, `einen`, `im`, `am`, `vom`, `zum`, `zur`, `beim`, `ans`, `ins`
- Possessives: `mein`, `meine`, `dein`, `deine`, `sein`, `seine`, `unser`, `unsere`
- Common verbs and forms: `ist`, `sind`, `war`, `waren`, `hat`, `haben`, `hatte`, `kann`, `soll`, `muss`, `möchte`, `würde`, `wäre`, `hätte`, `geht`, `geh`, `gehe`, `machen`, `lass`, `lasst`
- Particles, conjunctions, time/place/function words: `entschuldigung`, `ja`, `nein`, `oder`, `weil`, `dass`, `wenn`, `aber`, `doch`, `schon`, `noch`, `etwas`, `alles`, `sehr`, `gerne`, `vielleicht`, `jetzt`, `mit`, `ohne`, `für`, `von`, `zu`, `nach`, `bei`, `auf`, `in`

The validator also now accepts any cue containing `ä`, `ö`, `ü`, `ß`, `Ä`, `Ö`, or `Ü`, while retaining the existing English-leakage exclusions.

## Blocks 1-5 - Before/After

### Block 1 - L1 Wistful `corePhrase.baseText`

Before:

```text
Entschuldigung, ich war im langsamen Bus.
```

After:

```text
Entschuldigung, der Bus war langsam.
```

### Block 2 - L4 Sharp `corePhrase.baseText`

Before:

```text
Ich freue mich.
```

After:

```text
Freut mich.
```

### Block 3 - L7 Wistful `corePhrase.targetText` and `corePhrase.baseText`

Before:

```text
Maybe, are you free tonight?
Vielleicht: Hast du heute Abend Zeit?
```

After:

```text
Would you be free tonight?
Wärst du heute Abend frei?
```

### Block 4 - L8 Bright `corePhrase.baseText`

Before:

```text
Ich schlage vor, wir treffen uns im Café!
```

After:

```text
Lass uns im Café treffen!
```

### Block 5 - L7 Wistful Build Phrase Chips

Before:

```ts
targetChips: ['Maybe,', 'are you free tonight?']
distractors: ['tentative', 'tomorrow']
```

After:

```ts
targetChips: ['Would you', 'be free tonight?']
distractors: ['tentative', 'tomorrow']
```

## Test Output

### `npx tsx scripts/test-guided-today-data.ts`

Previously failing checks now green:

```text
  ok  english-a1-practical-5-007-are-you-free-tonight/wistful build chips support target phrase
  ok  english-a1-practical-5-001-sorry-im-late/wistful speak cue is learner-facing German
  ok  english-a1-practical-5-008-lets-meet-at-the-cafe/bright speak cue is learner-facing German

4510 passed, 0 failed
```

### `npx tsx scripts/test-guided-vibes.ts`

```text
98 passed, 0 failed
```

### `npx tsx scripts/test-guided-today-path-overview.ts`

```text
[content coherence audit]
  review lesson 1/sharp: weak generic lesson item "focused"
  review lesson 6/wistful: weak generic lesson item "almost"
  review lesson 7/sharp: weak generic lesson item "focused"
  ok  Lesson 8 variants avoid known incoherent review items and chips

131 passed, 0 failed
```

The review lines are non-failing audit notes emitted by the existing script.

### `npx tsx scripts/test-checkpoint-selection.ts`

```text
33 passed, 0 failed
```

### `npx tsx scripts/test-checkpoint-trigger.ts`

```text
8 passed, 0 failed
```

### `npx tsx scripts/test-checkpoint-storage.ts`

```text
15 passed, 0 failed
```

### `npm run check:i18n`

```text
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

The French gaps are existing warn-only coverage notes; the command exited 0.

### `npx eslint src/data/guidedLessons.ts scripts/test-guided-today-data.ts`

```text
No output; command exited 0.
```

### `npm run build`

```text
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.0.1 building client environment for production...
transforming...✓ 2673 modules transformed.
rendering chunks...
computing gzip size...
✓ built in 1.11s
```

The build also emitted existing chunk-size and dynamic-import warnings; the command exited 0.

### `git diff --check`

```text
warning: in the working copy of 'frontend/scripts/test-guided-segment-reviews.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'frontend/scripts/test-guided-today-data.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'frontend/scripts/test-guided-today-path-overview.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'frontend/src/components/today/Today.css', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'frontend/src/components/today/TodayPathOverview.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'frontend/src/data/guidedLessons.ts', LF will be replaced by CRLF the next time Git touches it
```

The command exited 0. Several warnings reference pre-existing unstaged workspace changes outside this polish scope.

### `git diff --cached --check`

```text
No output; command exited 0.
```

## Scope Confirmations

- A1P1, A1P2, A1P3, and A1P4 content were not modified by this polish.
- No backend, Supabase, provider, generation, deck, word, global-theme, or translations changes were included.
- The only English `targetText` change is L7 Wistful: `Maybe, are you free tonight?` -> `Would you be free tonight?`.
- The only A1P5 content edits are the four approved content fields plus the L7 Wistful `targetChips` array.
- Umlauts and accents in replacements use proper Unicode: `Wärst`, `Café`.

## Notes

The MARGINAL cross-vibe pairs identified in the adversarial review at L4, L6, and L9 were intentionally not patched per move-faster calibration; they were not FAIL items.

The original implementation report's `Max Count: 1` opener claim was a report-quality error, not a content failure. The real Wistful opener-family counts were `Maybe: 3`, `Sorry: 2`, and `May I ask: 2`; after Block 3, `Maybe` drops from 3 to 2 as a side benefit.
