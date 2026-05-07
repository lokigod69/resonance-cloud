# Premium Customize Visual Selector Frontend Report

Date: 2026-05-07

## Files changed

- `frontend/src/components/generate/steps/ProductLaneStep.tsx`
- `frontend/src/components/generate/steps/WordsStep.tsx`
- `frontend/src/components/generate/steps/PremiumCardCustomizationStep.tsx`
- `frontend/src/components/generate/shared/PremiumVisualSelectors.tsx`
- `frontend/src/components/generate/shared/PremiumQuickModePanel.tsx`
- `frontend/src/components/generate/premiumVisualAssets.ts`
- `frontend/src/pages/GenerateGO.tsx`
- `frontend/src/themes/glass-orb.css`
- `frontend/public/premium-style-samples/*.webp`
- `frontend/scripts/test-premium-style-assets.ts`
- `frontend/package.json`

## UI before/after summary

The previous glassy product and Premium Customize flows placed too much copy inside circular orbs. Product lane choices, meaning strategy, presentation form, and art style options were cramped and hard to read, especially on wide screens and mobile.

The revised UI separates visual selection from readable copy:

- Product lane choices now use a circular visual emblem with product name, one-line helper, and price below the circle.
- Premium quick modes remain quick action buttons, while `Customize` is separated into its own centered outlined button with a settings icon.
- Premium Customize uses reusable visual selector tiles. Meaning strategy and presentation form use symbolic circular thumbnails with short labels outside the circle.
- Art styles use circular image thumbnails with labels outside the image.
- The Premium Customize container is centered, constrained, and responsive, with the Continue button centered under the sections.
- Selected states now use the Resonance rose/violet accent treatment instead of a generic green success border/glow.

## Asset folder and naming convention

Art-style samples live in:

`frontend/public/premium-style-samples/`

Filenames match backend enum values exactly:

`realistic.webp`, `cinematic.webp`, `editorial.webp`, `illustration.webp`, `anime.webp`, `studio_ghibli_inspired.webp`, `disney_animation_inspired.webp`, `comic_book.webp`, `pixel_art.webp`, `vintage_film.webp`, `oil_painting.webp`, `surrealism.webp`, `fantasy_art.webp`, `pen_and_ink.webp`, `charcoal_sketch.webp`, `claymation.webp`, `ukiyo_e.webp`, `south_park_style.webp`, `rick_and_morty_style.webp`, `pixar_3d.webp`.

The first generated direction reused the same old-book/key/candle still life across all styles. That approach was rejected because it made the selector feel repetitive and did not communicate style identity quickly. The final assets use distinct style-signature subjects, scenes, palettes, and compositions for each art style.

## Asset status

Real generated thumbnails were created and optimized to `.webp`. They are not placeholders.

The source generated PNGs remain under Codex's generated-images folder. The committed frontend assets are the optimized `.webp` files in `frontend/public/premium-style-samples/`.

## Payload behavior confirmation

Backend-facing enum values were preserved. The UI changes only alter frontend presentation and the glassy quick-mode routing adapter in `GenerateGO`.

Confirmed by `npm run test:lane-payload`:

- Product lane payloads remain unchanged for video, Standard Card, and Premium Card.
- Premium Quick Generate behavior remains unchanged.
- Premium quick modes still resolve to the expected meaning strategy, presentation form, backend template, and metadata.
- Premium Customize still sends selected `meaning_strategy`, `presentation_form`, and `card_image_style`.
- Standard Card payload behavior remains separate from Premium Layer 2 settings.

Confirmed by `npm run test:premium-style-assets`:

- All 20 art-style enum values map to `/premium-style-samples/<enum>.webp`.
- All 20 expected asset files exist.
- Mapping keys match the exposed Premium art-style options.

## Adversarial UI Review

- Real route inspected, not only a preview: yes. The actual `/generate` flow was driven through language, Premium Card, Add Words, and Customize.
- Glassy and classic inspected: yes. `resonance-skin=glassy` and `resonance-skin=classic` were both verified on the real route.
- Long descriptions inside selector tiles: none. Meaning strategy and presentation form show only short labels; art styles show thumbnail plus label.
- Label/description concatenation: not present. The checked route text does not include collisions such as `Clear MeaningClosest to`, `Mini StoryA compact`, `Word as DesignMakes`, or `Mnemonic HookUses`.
- Art-style thumbnails visible on actual Customize route: yes. Both glassy and classic actual routes rendered 20/20 `/premium-style-samples/<enum>.webp` images with `naturalWidth > 0`.
- Selected state color: changed away from green. Selection/focus uses rose/violet accent borders and glow.
- Horizontal overflow: none detected on desktop, laptop-width classic, or mobile-width Customize checks.
- Mobile readability: verified at 390px width for both glassy and classic. Labels remain outside thumbnails and no selector contains paragraph text.
- Backend enum values unchanged: yes. Labels changed only in frontend presentation; enum values still come from existing Premium Layer 2 option arrays.
- Payloads unchanged: yes, covered by `npm run test:lane-payload`.
- Backend/RPC/worker changes avoided: yes. This pass only changes frontend, static assets, docs, and frontend scripts.

## Checks run

- `npm run test:premium-style-assets`
- `npm run test:lane-payload`
- `npm run build`
- Targeted ESLint on changed frontend files
- `git diff --check`
- Shell Playwright actual-route QA against the local Vite app at desktop, laptop, and mobile widths:
  - 20/20 images loaded.
  - Circular crop applied.
  - Selected state visible and brand-colored.
  - Labels remain outside thumbnails.
  - No long descriptions or label/description collisions in selector text.
  - No horizontal overflow.

Build completed successfully. Vite reported existing chunk-size and ineffective dynamic import warnings, not build failures.

## Remaining follow-up

- Generate dedicated thumbnail assets for meaning strategy.
- Generate dedicated thumbnail assets for presentation form.
- Consider later dedicated Infographic prompt/backend work in a separate backend pass.
