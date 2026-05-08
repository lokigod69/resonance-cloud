# German i18n Phase 2B QA Cleanup Report

## Starting Worktree State

Canonical worktree `D:\CODING\ResonanceTEST\orchestrator` was aligned with `origin/main`, but it still contained untracked manual-QA report and screenshot artifacts. To avoid building on unrelated files, this change was made in a clean linked worktree:

`C:\Users\micha\.config\superpowers\worktrees\orchestrator\phase2b-qa-cleanup`

Initial clean-worktree checks before editing:

```text
git status --branch --short
## phase2b-qa-cleanup...origin/main

git log --oneline origin/main..HEAD
<empty>

git log --oneline HEAD..origin/main
<empty>

git diff --name-status
<empty>
```

Baseline included `d7bcf59 Localize small authenticated surfaces`.

## Exact Leaks Fixed

- Generate / Premium Card word substep:
  - `Add your words` -> `Wörter hinzufügen`
  - `Type Your Own` -> `Selbst eingeben`
  - `Pick a Category` -> `Kategorie wählen`
- Deck status display labels now render localized text instead of raw stored values:
  - `draft` -> `Entwurf`
  - `generating` -> `Wird erstellt`
  - `pending` -> `Wartet`
  - `complete` -> `Fertig`
  - `partial` -> `Teilweise fertig`
  - `failed` -> `Fehler`
  - `cancelled` -> `Abgebrochen`
- Deck target/base language labels now render through localized display labels where the deck cards/details were still showing raw English names.

## Files Changed

- `frontend/src/components/generate/steps/WordsStep.tsx`
- `frontend/src/components/generate/steps/CategoryPicker.tsx`
- `frontend/src/lib/translations.ts`
- `frontend/src/lib/i18nDisplay.ts`
- `frontend/src/pages/Decks.tsx`
- `frontend/src/pages/DecksPG.tsx`
- `frontend/src/pages/DeckView.tsx`
- `frontend/src/pages/DeckViewPG.tsx`
- `frontend/scripts/test-i18n-display-labels.ts`
- `frontend/scripts/test-generate-responsive-layout.ts`
- `frontend/package.json`

## Keys Added/Reused

Added in EN/DE/FR:

- `generate.words.addTitle`
- `generate.words.typeOwn`
- `generate.words.pickCategory`
- `deck.status.draft`
- `deck.status.generating`
- `deck.status.pending`
- `deck.status.complete`
- `deck.status.partial`
- `deck.status.failed`
- `deck.status.cancelled`

Reused:

- `generateGo.languageDeckName`
- existing `langName.*` keys through the new display helper
- existing counted generating copy on classic deck cards where progress counts are shown

## Internal Values Confirmed Unchanged

The patch only maps rendered labels. It does not modify stored deck status values, deck language values, generation payloads, product lane values, premium quick mode values, card layer values, backend template values, infographic template values, or card image model values.

The new helper falls back to the raw value for unknown statuses/languages so unexpected backend values remain visible without changing data.

## Manual QA Notes

Attempted local patched QA at `http://127.0.0.1:5175` using the clean worktree. The first server launch failed visually because the isolated worktree did not have Supabase env vars. I restarted Vite with the canonical frontend env loaded.

Authenticated browser QA could not be completed in the isolated local browser session:

- `/generate` correctly redirected to `/login` when unauthenticated.
- The browser automation layer could not fill the email input because of an input interaction error on `type="email"`.
- A same-origin localStorage session injection via `javascript:` URL was rejected by the browser security policy, and no workaround was attempted.

Source-level regression coverage was added for the fixed labels, and the app was compiled successfully. Mobile 390px visual inspection was not completed for the patched authenticated routes because local authentication could not be established in the browser tool.

## Checks Run

```text
npm run test:i18n-display-labels
npm run check:i18n
npm run test:generate-responsive-layout
npm run build
npx eslint src/components/generate/steps/WordsStep.tsx src/components/generate/steps/CategoryPicker.tsx src/pages/Decks.tsx src/pages/DecksPG.tsx src/pages/DeckView.tsx src/pages/DeckViewPG.tsx src/lib/translations.ts src/lib/i18nDisplay.ts scripts/test-i18n-display-labels.ts scripts/test-generate-responsive-layout.ts
git diff --check
```

`npm run check:i18n` still reports the known FR warn-only gaps documented by the existing i18n checker:

- `speak.newChatConfirmAction`
- `speak.newChatConfirmDescription`
- `speak.newChatConfirmTitle`
- `speak.studyModeOffToast`
- `speak.studyModeOnToast`

## Remaining Deferred Gaps

- Speak roleplay/persona/provider metadata remains deferred by Phase 2B scope.
- Public login `html lang` remains deferred because it was optional and not obvious enough to patch safely in this pass.
- Broader PipelineView/StagePanel surfaces remain deferred by scope.
