# Card Image Presentation and Modal Aspect Ratio Report

## Files Changed

- `frontend/src/components/media/GeneratedMediaFrame.tsx`
- `frontend/src/components/dashboard/WordDetailModal.tsx`
- `frontend/src/components/deck/CardWordViewerModal.tsx`
- `frontend/src/pages/Decks.tsx`
- `frontend/src/pages/DecksPG.tsx`
- `frontend/src/index.css`
- `frontend/scripts/verify-admin-deck-regressions.mjs`

## What Changed

- Added a shared `GeneratedMediaFrame` for generated media display.
- Detail and modal contexts now use a stable 16:9 frame with `object-contain`.
- Dashboard word details no longer use the old fixed `h-48` cropped image block.
- Card deck viewer images now render inside the shared 16:9 modal media frame.
- Classic deck cards now show a real top media preview instead of relying on a full-card CSS background image.
- Glassy deck grid card previews now use contained display for card decks and decorative cover display for video decks.

## Full 16:9 Preservation Contexts

- Dashboard and DashboardPG word detail modal.
- Card deck viewer modal.
- Classic Decks card deck preview.
- Glassy Decks grid card deck preview.

## Intentionally Cropped Contexts

- `WordLibrary` 40x40 thumbnails remain `object-cover` because they are list avatars, not inspection surfaces.
- Glassy stack, water, and orb modes remain decorative/ambient deck browsing surfaces in this pass. The grid view is the practical inspection-style deck preview and now preserves full card images.
- Video deck previews may still use cover behavior where they are cinematic/decorative rather than card-inspection contexts.

## Desktop and Mobile Behavior

- Word detail modal is wider on desktop (`max-w-4xl`) and keeps the content scrollable for long metadata.
- Word detail modal uses safe-area-aware bottom padding on mobile.
- Card viewer modal keeps image-first layout, then word details, with scrolling when viewport height is limited.
- Generated images have native dragging disabled to avoid gesture interference.

## Screenshots and Manual Observations

- No screenshots were captured in this pass.
- Manual source review verified that the former fixed-height/detail crop and classic background-cover deck preview paths were removed from inspection contexts.

## Tests and Checks

- `npm run test:regressions`
- `npm run build`
- `npx eslint src/components/media/GeneratedMediaFrame.tsx src/components/dashboard/WordDetailModal.tsx src/components/deck/CardWordViewerModal.tsx src/pages/Decks.tsx src/pages/DecksPG.tsx`
- `git diff --check`

## Remaining Polish Suggestions

- Consider extending full-image preservation to glassy stack and water modes if users treat those as inspection surfaces rather than decorative browsing.
- Consider replacing hard-coded English share/fallback strings in modal components with localized keys in a later copy pass.
