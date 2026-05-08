# German i18n Phase 2A: Small Authenticated Surfaces

## Starting worktree state

- Canonical worktree `D:\CODING\ResonanceTEST\orchestrator` was not used for edits because it had an unrelated dirty tracked file: `frontend/src/lib/imageUrls.ts`.
- Work was done in isolated worktree `C:\Users\micha\.config\superpowers\worktrees\orchestrator\german-i18n-phase2a-small-surfaces`.
- Initial isolated worktree state before edits:
  - `git status --branch --short`: `## german-i18n-phase2a-small-surfaces...origin/main`
  - `git log --oneline origin/main..HEAD`: no commits
  - `git log --oneline HEAD..origin/main`: no commits
  - `git diff --name-status`: no changes
- While work was in progress, `origin/main` advanced by `50a31e4 refactor(thumbnails): tighten getThumbnailUrl format API to 'webp' only`. The branch was rebased with autostash and the Phase 2A changes were reapplied cleanly.

## Files changed

- `frontend/src/components/AddWordModal.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Speak.tsx`
- `frontend/src/components/speak/GrokPicker.tsx`
- `frontend/src/components/speak/SpeakHistoryPanel.tsx`
- `frontend/src/components/speak/GeminiAccentPicker.tsx`
- `frontend/src/components/speak/GeminiModeVoicePicker.tsx`
- `frontend/src/components/speak/VoiceSampleButton.tsx`
- `frontend/src/components/study/canvas/ZenCanvas.tsx`
- `frontend/src/components/study/canvas/FrostCanvas.tsx`
- `frontend/src/components/study/canvas/EmberCanvas.tsx`
- `frontend/src/components/study/canvas/SyndicateCanvas.tsx`
- `frontend/src/lib/translations.ts`
- `docs/I18N/GERMAN_I18N_PHASE2A_SMALL_SURFACES_REPORT.md`

## Keys added and reused

- Added EN/DE/FR keys under:
  - `addWord.*`
  - `auth.*`
  - `speak.grok.*`
  - `speak.grok.category.*`
  - `speak.history.*`
  - `speak.accent.*`
  - `speak.voiceSample.*`
  - `study.canvas.*`
- Reused existing common/study keys where appropriate, including `common.cancel`, `speak.reviewButton`, `speak.reviewLoading`, `study.reviewLater`, and `study.rememberedAction`.
- German copy uses `du` voice where user-facing.

## Scope notes

- AddWordModal labels, placeholders, submit/cancel actions, and CSV language picker copy are localized.
- Login was small and isolated, so visible auth page copy was localized without changing auth behavior.
- Speak Grok category labels, picker labels, history empty/loading states, accent labels, and voice sample titles/aria labels are localized.
- Study canvas empty/tool labels and review action aria labels are localized across Zen, Frost, Ember, and Syndicate canvases.
- Backend/internal enum values, provider payload values, Supabase calls, auth behavior, study scheduling behavior, generation flows, and admin surfaces were not changed.

## Intentionally skipped

- Speak scenario/persona names and detailed voice metadata remain as product/provider content rather than small secondary labels.
- Language option values returned by `getSupportedLanguages()` remain raw API values.
- Admin, Layer2Lab, GenerateGO/Premium, PipelineView, and StagePanel were not touched.

## Checks run

- `npm run check:i18n`
  - EN source: 714 keys
  - DE: 714/714 covered
  - FR: 709/714 covered, with existing warn-only gaps:
    - `speak.newChatConfirmAction`
    - `speak.newChatConfirmDescription`
    - `speak.newChatConfirmTitle`
    - `speak.studyModeOffToast`
    - `speak.studyModeOnToast`
- `npx eslint src/components/AddWordModal.tsx src/pages/Login.tsx src/pages/Speak.tsx src/components/speak/SpeakHistoryPanel.tsx src/components/speak/GeminiAccentPicker.tsx src/components/speak/GeminiModeVoicePicker.tsx src/components/speak/GrokPicker.tsx src/components/speak/VoiceSampleButton.tsx src/components/study/canvas/ZenCanvas.tsx src/components/study/canvas/FrostCanvas.tsx src/components/study/canvas/EmberCanvas.tsx src/components/study/canvas/SyndicateCanvas.tsx src/lib/translations.ts`
- `npm run verify:grok-ios-audio`
- `npm run build`
- `git diff --check`

## Visual QA notes

- Dev server was started from the isolated worktree and `/login?lang=de` returned HTTP 200.
- Full authenticated visual QA for AddWordModal, Speak history, and Study canvas was not completed because the isolated worktree did not have an authenticated browser session for those gated surfaces.
- A targeted literal scan of the Phase 2A files did not find the old visible English strings except identifier/type-name false positives such as `History` icon imports and `Accent` type names.

## Remaining German gaps

- Authenticated manual QA should still verify AddWordModal, Speak history, and Study canvas in German at desktop and 390px mobile.
- Larger Speak content surfaces, including scenario/persona copy and voice metadata, remain for a later pass.
