# German i18n Phase 1C GenerateGO / Premium Report

Date: 2026-05-08

## Starting State

Canonical worktree `D:\CODING\ResonanceTEST\orchestrator` was not used for implementation. It was behind `origin/main` and had unrelated dirty tracked Premium/Speak files plus unrelated untracked investigation files.

Phase 1C was implemented in a clean isolated worktree:

`C:\Users\micha\.config\superpowers\worktrees\orchestrator\german-i18n-phase1c-generatego-premium`

Initial isolated state had no ahead/behind, no dirty tracked files, no relevant untracked files, and no diff. During the work, `origin/main` advanced by `4dfbfb9 fix(speak): stabilize iPhone setup scrolling`; the branch was rebased onto current `origin/main` before final verification.

## Keys Added

Added complete EN/DE/FR coverage for:

- `generateGo.*` scaffold, summaries, placeholders, counts, status copy, video-lane vibe labels, genre custom label, art group labels, and GenerateGO art style labels.
- `premium.*` summary aria text, customize headings, quick mode labels/helpers, meaning labels/helpers, presentation labels/helpers, infographic style labels/helpers, and premium art style labels.

German terminology follows the Phase 1C table:

- Quick Generate: `Schnell-Erstellen`
- Customize: `Anpassen`
- Clear / Memorable / Weird: `Klar` / `Einprägsam` / `Skurril`
- Meaning Strategy / Presentation Form / Art Style: `Bedeutung` / `Darstellung` / `Kunststil`
- Word Design / Infographic Style: `Wortdesign` / `Infografik-Stil`

Proper-noun style labels remain English where intended: Anime, Disney, Pixar 3D, Studio Ghibli, South Park, Rick and Morty, Ukiyo-e, Editorial.

## Files Wired

- `frontend/src/pages/GenerateGO.tsx`
- `frontend/src/components/generate/shared/PremiumQuickModePanel.tsx`
- `frontend/src/components/generate/steps/PremiumCardCustomizationStep.tsx`
- `frontend/src/components/generate/shared/PremiumVisualSelectors.tsx`
- `frontend/src/components/generate/useWizardState.ts`
- `frontend/src/components/generate/premiumVisualAssets.ts`
- `frontend/src/lib/translations.ts`

`useWizardState.ts` keeps English `label` / `helper` fallbacks for pure helpers, admin, and tests, and adds UI-only `labelKey` / `helperKey` metadata. Rendered Premium surfaces now consume the keys through `t()`.

## Internal Values

Confirmed unchanged:

- Product lane values: `video`, `card_standard`, `card_premium`
- Card image models: `zturbo`, `gpt_image_2`
- Premium quick mode values: `clear`, `memorable`, `weird`, `word_design`, `infographic`
- `card_layer2` meaning and presentation enum values
- `backend_template`, `infographic_template`, and provider payload values
- Credit pricing and generation submission behavior

`npm run test:lane-payload` passed 148 assertions after the localization wiring.

## CSS Fixes

Applied German-safe layout changes from the overflow audit:

- `.gen-orb` increased from `110px` to `124px`, with safer label wrapping/hyphenation.
- `.premium-summary-orb` max width increased from `150px` to `180px`.
- `.premium-quick-grid` now uses `repeat(auto-fit, minmax(120px, 1fr))`.
- Premium selector columns widened for German labels.
- `.premium-option-helper` is clamped to two lines with a stable minimum height.
- `--premium-quick-main-width` increased to `240px`.
- `GlassInput` locked word chips changed from `break-all` to `break-words` with `hyphens:auto`.
- `AppHeader` nav labels get nowrap/min-width guards.
- Mobile product tiles keep square rhythm and slightly smaller labels.

## Visual QA

Temporary Vite QA harness rendered the real GenerateGO entry surface plus shared Premium quick/customize surfaces with fake EN/DE auth profiles. No Supabase writes or backend calls were used.

Matrix:

- Locales: English, German
- Skins: classic, glassy
- Viewports: 1440px desktop, 768px tablet, 390px mobile

Headless Chrome overflow scan result:

- `12` combinations checked
- `0` horizontally overflowing nodes
- `html lang` was `en` for English and `de` for German

German mobile quick/customize text included:

`Schnell-Erstellen`, `Klar`, `Einprägsam`, `Skurril`, `Wortdesign`, `Infografik`, `Anpassen`, `Premium-Karte anpassen`, `Bedeutung`, `Darstellung`, `Kunststil`.

Temporary QA files, screenshots, logs, and browser profile directories were removed before commit.

## Checks

Run:

```bash
npm run check:i18n
npm run test:premium-style-assets
npm run test:generate-responsive-layout
npm run test:lane-payload
npm run build
npx eslint src/pages/GenerateGO.tsx src/components/generate/shared/PremiumQuickModePanel.tsx src/components/generate/steps/PremiumCardCustomizationStep.tsx src/components/generate/shared/PremiumVisualSelectors.tsx src/components/generate/useWizardState.ts src/components/generate/premiumVisualAssets.ts src/components/generate/shared/GlassInput.tsx src/components/layout/AppHeader.tsx scripts/test-generate-responsive-layout.ts scripts/test-product-lane-payload.ts
git diff --check
```

Not run:

- Full authenticated Supabase-backed manual generation. This PR intentionally avoids submission behavior, RPCs, backend, worker, and provider paths.

## Remaining German Gaps

- Login, AddWordModal, Speak secondary labels/history, Study canvas empty states/aria, pipeline/stage observability, and admin surfaces remain outside this phase.
- French still has the known warn-only gaps reported by `check:i18n`; German has full key coverage against English.
