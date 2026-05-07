# Generate Responsive Layout Polish Report

Date: 2026-05-07

Scope: frontend-only `/generate` responsive polish. Backend prompts, provider calls, pricing, Supabase migrations, worker orchestration, request retry paths, and payload enum values were not changed.

## Files Changed

- `frontend/package.json`
- `frontend/scripts/test-generate-responsive-layout.ts`
- `frontend/src/components/generate/shared/GlassInput.tsx`
- `frontend/src/components/generate/shared/PremiumVisualSelectors.tsx`
- `frontend/src/components/generate/steps/CardImageStyleStep.tsx`
- `frontend/src/components/generate/steps/WordsStep.tsx`
- `frontend/src/index.css`
- `frontend/src/pages/GenerateGO.tsx`
- `frontend/src/pages/GeneratePG.tsx`
- `frontend/src/themes/glass-orb.css`

## Desktop Fixes

- Orb-based product, premium customize, Niveau, and Standard Card style selectors now keep selected/hover emphasis on the orb itself instead of drawing an outer selected card/cube.
- Summary selections render through the shared `PremiumSummaryRow`, centered in a horizontal row with wrapping only when needed.
- Standard Card Visual Style now uses a centered `standard-card-style-grid` in classic and glassy flows.
- Product lane copy remains title plus credits, with mobile ordering handled by CSS while desktop keeps the existing balanced row.

## Mobile Fixes

- Global and generate-flow containers now cap width and hide horizontal overflow.
- Language selection is compact on mobile with a two-column layout instead of full-width rows.
- Mobile product order is Video & Music, Premium Card, Standard Card, while preserving `video`, `card_premium`, and `card_standard` values.
- Add Words input/chips now use `min-width: 0`, wrapping chips, and a non-shrinking add button.
- Premium Customize opens at the top of the step, uses compact two-column grids, and keeps the selected indication on the orb.
- Review/Synthesis summary selections use compact clickable summary orbs.

## Selected State

Selected orb tiles no longer receive a visible outer selected rectangle. The selected state is now represented by orb border/ring, glow, brightness, and text accent.

## Scroll And Overflow

Step changes reset to the top of the active step. The glassy flow uses `scroll-margin-top` so Customize starts on the heading/Meaning Strategy area instead of landing near Art Style.

## Visual QA Notes

Visual QA was run against a local Vite preview on `http://127.0.0.1:4174/generate` using a fake local Supabase session/profile only to render the protected route. No generation submit action or paid provider path was called.

Coverage:

- Desktop 1280px: product lane, Premium Add Words, Premium Customize, Standard Card Visual Style, Niveau, and Review/Synthesis in classic and glassy skins.
- Mobile 390px: language step, product lane, Premium Add Words, Premium Customize, Standard Card Visual Style, Niveau, and Review/Synthesis in classic and glassy skins.

Results:

- Horizontal overflow: `0` in every captured state.
- Add Words plus button: visible in classic/glassy mobile and desktop Add Words captures.
- Standard Card Visual Style: center delta `0` in every captured classic/glassy mobile and desktop state.
- Premium Customize: title appeared above Art Style in every capture.
- Mobile product coordinates confirmed visible order: Video & Music, Premium Card, Standard Card.
- Review summary orbs wrapped compactly on mobile and remained a single row where desktop width allowed.

## Checks Run

- `npm run test:generate-responsive-layout` - passed.
- `npm run test:lane-payload` - passed, 87 passed / 0 failed.
- `npm run test:premium-style-assets` - passed, 44 passed / 0 failed.
- `npm run build` - passed. Existing Vite warnings remain for dynamic/static Supabase import and large bundle size.
- `npx eslint src/components/generate/shared/PremiumVisualSelectors.tsx src/components/generate/shared/GlassInput.tsx src/components/generate/steps/CardImageStyleStep.tsx src/components/generate/steps/WordsStep.tsx src/pages/GeneratePG.tsx src/pages/GenerateGO.tsx scripts/test-generate-responsive-layout.ts` - passed.
- `git diff --check` - passed.

## Known Limitations

- Visual QA used scripted local auth and cached profile data to render the protected page; it did not test real authentication or provider submission.
- The existing Vite build warnings were not addressed because they are outside this responsive layout scope.
