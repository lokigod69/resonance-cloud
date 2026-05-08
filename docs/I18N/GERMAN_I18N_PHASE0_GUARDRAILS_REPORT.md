# German i18n Phase 0 Guardrails Report

Date: 2026-05-08

## Scope

This Phase 0 PR adds the first safety guardrails for German UI localization without changing the i18n architecture, generation flow, backend, Supabase/RPC code, admin pages, or Premium Card CSS.

## Changes

- Added `npm run check:i18n`.
- Added `frontend/scripts/check-i18n-coverage.ts` to compare `en`, `de`, and `fr` keys in `src/lib/translations.ts`.
- Made German coverage strict: missing `de` keys fail the command.
- Kept French coverage warn-only because current French gaps are known and out of scope for the German Phase 0 work.
- Added a dev-only runtime warning when a non-English locale falls back to an English string.
- Set `document.documentElement.lang` from the resolved UI locale.
- Applied low-risk German wording fixes:
  - `common.cancel`: `Abbrechen`
  - `study.startAgain`: `Neue Sitzung`
  - `study.mode.canvas`: `Canvas`
  - `profile.baseLanguage`: already shipped as `Muttersprache`

## Coverage Policy

`check:i18n` treats English as the source locale.

- `de`: required. Any missing English key exits non-zero.
- `fr`: warn-only. Missing French keys are printed, but they do not fail the command in this PR.

This keeps the German rollout protected while avoiding unrelated French translation work in the same change.

## Verification

Run before merge:

```bash
npm run check:i18n
npm run build
npx eslint src/lib/translations.ts src/hooks/useTranslation.ts src/App.tsx scripts/check-i18n-coverage.ts
git diff --check
```
