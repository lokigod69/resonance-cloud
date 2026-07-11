# Mobile Frontend P0/P1 Fix Report

Date: 2026-05-04
Scope: Phase M1 small mobile frontend patches from `MOBILE_FRONTEND_ADVERSARIAL_REVIEW.md`.

## Findings Fixed

- NAV-1 / DASH-3: added shared safe-area tokens in `frontend/src/index.css` and applied the safe top/header offset to Glassy shell navigation, mobile menu positioning, protected route content, and dashboard sticky language tabs.
- DETAIL-1: reserved bottom space in `DeckViewPG` for the fixed footer plus safe-area bottom, moved the footer to the shared bottom token, and added padding below carousel dots.
- DETAIL-5: added safe-area top/bottom padding to `VideoPlayer` and made the main content area `min-h-0 overflow-y-auto` so close, video, word info, replay, and back controls remain reachable in landscape.
- SPEAK-1 / SPEAK-2: moved fixed Speak chat shells and history panel to the shared safe header offset; added bottom safe-area padding to recording and transcript bars.
- DECKS-1: changed Glassy Stack deck touch handling from `touchAction: 'none'` to `touchAction: 'pan-y'` to preserve vertical page panning.
- DETAIL-2 / DECKS-4: changed card-deck art in Classic deck detail, Glassy deck detail, and Glassy stack previews to `object-contain` while preserving `object-cover` for video/decorative previews and tiny WordLibrary avatars.
- DASH-1 / STUDY-1 / STUDY-4 / SPEAK-3 / SHARE-2: added the reusable `.long-copy` utility and applied it to WordDetailModal, WordInfoPanel, Study video/PG/flashcard text, Speak live/history bubbles and corrections, and SharePage word text.
- NAV-3 / NAV-4 small fixes: increased shared dialog/sheet close targets to 44px with safe top placement, enlarged mobile header/profile/credits targets, and made ProfileModal avatar/action/name/language rows more mobile-safe without changing avatar behavior.

## Findings Deferred

- GEN-1 / GEN-2 / GEN-3 / GEN-4 remain deferred to Phase M3 because the generation wizard/orb flow needs layout design decisions, not a small M1 patch.
- SPEAK-4 / SPEAK-5 remain deferred to Phase M4 because voice sample sizing and microphone permission UX are broader Speak/audio polish and should not touch provider logic in M1.
- DECKS-2 / DECKS-3 remain deferred because Water/Orbs mode landscape and reduced-motion cleanup require layout/interaction decisions beyond the stack touch-action fix.
- MUSIC-1 / MUSIC-2 / MUSIC-3 remain deferred because Music was P2 in the adversarial review and outside the highest-risk M1 target set.

## Files Changed

- `frontend/src/index.css`
- `frontend/scripts/verify-admin-deck-regressions.mjs`
- `frontend/src/components/layout/PolishGlassLayout.tsx`
- `frontend/src/components/layout/AppHeader.tsx`
- `frontend/src/components/ProfileModal.tsx`
- `frontend/src/components/ui/dialog.tsx`
- `frontend/src/components/ui/sheet.tsx`
- `frontend/src/components/dashboard/WordDetailModal.tsx`
- `frontend/src/components/WordInfoPanel.tsx`
- `frontend/src/components/speak/SpeakHistoryPanel.tsx`
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/DashboardPG.tsx`
- `frontend/src/pages/DecksPG.tsx`
- `frontend/src/pages/DeckView.tsx`
- `frontend/src/pages/DeckViewPG.tsx`
- `frontend/src/pages/VideoPlayer.tsx`
- `frontend/src/pages/Speak.tsx`
- `frontend/src/pages/Study.tsx`
- `frontend/src/pages/StudyPG.tsx`
- `frontend/src/pages/StudyFlashcard.tsx`
- `frontend/src/pages/SharePage.tsx`

## Before / After Behavior

- Before: Glassy top nav, dashboard tabs, and Speak fixed shells used hard-coded top offsets. After: they use safe-area-aware shell tokens.
- Before: Glassy deck detail footer could overlap dots/content and sit too close to the home indicator. After: the page reserves footer space and the footer uses the shared safe bottom token.
- Before: VideoPlayer could exceed the short 844x390 landscape height without a scrollable content column. After: the full-screen shell has safe-area padding and a scrollable main column.
- Before: Glassy Stack cards could block vertical scroll from the top card. After: vertical panning is preserved while horizontal drag remains available.
- Before: several card-deck art contexts cropped generated card images. After: card art uses contain in deck-detail/card-art surfaces while video thumbnails still cover.
- Before: long German/French/CJK/no-space text could overflow in key mobile surfaces. After: the shared `.long-copy` utility is applied to the highest-risk text paths.

## Viewport / Source-Review Notes

- 360x800 and 375x667: safe-area and long-copy changes target small phone portrait pressure points, especially Speak bottom controls, ProfileModal rows, dashboard word text, and deck detail footer overlap.
- 390x844 and 430x932: fixed footer and Speak recording bars now reserve browser/home-indicator space through shared bottom tokens.
- 844x390 landscape: VideoPlayer now scrolls from the top with safe-area padding so the close button, video, WordInfoPanel, replay/back controls, and nav hints remain reachable by scrolling.
- 768x1024: desktop/tablet layout remains largely unchanged because most changes are CSS tokens, safe-area no-ops on non-notched devices, or content wrapping.

No browser/provider run was used. This was source review plus static regression coverage; no paid provider calls were made.

## Tests / Checks Run

- `npm run build`: passed. Vite still reports the existing Supabase dynamic import warning and large chunk warning.
- `npx eslint ...changed frontend files...`: exit 0 with existing warnings in `Dashboard.tsx`, `DashboardPG.tsx`, and `DecksPG.tsx`.
- `npm run test:regressions`: passed. Added M1 static checks for safe-area tokens, VideoPlayer scroll/safe-area, Speak bottom safe-area, DeckViewPG footer reservation, card-art contain, Stack `pan-y`, and long-copy coverage.
- `git diff --check`: to be run after this report is added.

## Remaining P2/P3 Issues

- Generation mobile layout still needs Phase M3 design cleanup.
- Speak mobile action grouping, voice sample hit targets, and microphone permission explanations remain Phase M4.
- Decks Water/Orbs landscape, reduced motion, and discoverability remain later responsive/design-system work.
- Music player and retry touch targets remain P2 mobile polish.
- Some existing ESLint dependency warnings remain in dashboard/decks files.

## Next Recommended Mobile Phase

Phase M2 should normalize modal and safe-area behavior more broadly: custom fixed modals, body scroll locking, close target placement, nested scroll traps, and safe-area bottom handling across remaining overlays.

## Non-Goals Confirmed

No backend logic, Supabase migrations, Storage/RLS, generation/provider logic, prompt architecture, credit/pricing logic, Layer 2 controls, broad Speak provider refactor, or generation wizard redesign were changed.
