# Mobile Frontend P0/P1 Advisory Review

Date: 2026-05-04
Branch: `main`
Reviewed patch: `feb70fe0b62124d92a778b644d3a9a672342c883` (`fix(frontend): apply M1 mobile safety patches`)

## Verdict

Clean. The Phase M1 batch is minimal, frontend-only, and matches the highest-risk P0/P1 mobile findings from `MOBILE_FRONTEND_ADVERSARIAL_REVIEW.md`. I did not find a rollback-level or follow-up-patch-level regression in desktop layout, Classic/Glassy skin routing, VideoPlayer dashboard return behavior, Speak provider call flow, or card deck/video deck visual distinction.

No provider calls were made. No backend, Supabase migration, storage/RLS, generation/provider, prompt, credit, or pricing files were changed by the reviewed patch.

## Findings Verified

### NAV-1 / DASH-3: Glassy safe-area top offsets

- Verified code changes: `frontend/src/index.css`, `frontend/src/components/layout/PolishGlassLayout.tsx`, `frontend/src/components/layout/AppHeader.tsx`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/DashboardPG.tsx`.
- Result: fixed. Shared safe-area/header variables were added and Glassy protected route offsets now use `--glassy-header-offset` instead of fixed `pt-16`/`pt-20` assumptions.
- Desktop regression check: safe-area variables fall back to `0px`, while the desktop header height remains equivalent to the prior `sm:pt-20` spacing. No double-padding pattern was found by source review.

### DETAIL-1: DeckViewPG fixed footer overlap

- Verified code changes: `frontend/src/index.css`, `frontend/src/pages/DeckViewPG.tsx`.
- Result: fixed. Glassy deck detail now reserves `--deck-footer-space` for footer height plus safe-area bottom, and carousel dots/content are padded above the fixed action bar.
- Desktop regression check: footer spacing is scoped to the deck detail layout and uses breakpoint values that preserve the prior desktop footer scale.

### DETAIL-5: VideoPlayer safe-area and landscape reachability

- Verified code changes: `frontend/src/pages/VideoPlayer.tsx`.
- Result: fixed. The full-screen route now has safe-area top/bottom padding and a `min-h-0 overflow-y-auto` main region so close, video, WordInfoPanel, Replay, and Back controls remain reachable in landscape.
- Routing regression check: dashboard modal return context is preserved. `returnTo`, `returnMode`, `returnLang`, `buildWordVideoPath`, `getCloseTarget`, and `closeVideo` behavior remain intact.

### SPEAK-1 / SPEAK-2: Speak fixed shell and bottom bar safe-area

- Verified code changes: `frontend/src/pages/Speak.tsx`, `frontend/src/components/speak/SpeakHistoryPanel.tsx`.
- Result: fixed. Fixed headers/history panel and bottom recording/chat controls now account for safe-area top/bottom.
- Provider regression check: `useVoiceTutor`, `useGrokRealtime`, provider picker behavior, recording handlers, and API call flow were not changed. No provider was called during review.

### DECKS-1: DecksPG Stack vertical scroll trap

- Verified code change: `frontend/src/pages/DecksPG.tsx`.
- Result: fixed by source review. Stack cards changed from `touchAction: 'none'` to `touchAction: 'pan-y'`, preserving vertical page pan while the Framer Motion card still uses horizontal `drag="x"` and offset-based swipe selection.
- Residual risk: should be manually verified on iOS Safari and Android Chrome because browser touch-action behavior can vary when combined with Framer Motion drag.

### DETAIL-2 / DECKS-4: Card art aspect-ratio behavior

- Verified code changes: `frontend/src/pages/DeckView.tsx`, `frontend/src/pages/DeckViewPG.tsx`, `frontend/src/pages/DecksPG.tsx`.
- Result: fixed for targeted deck-detail/card-art surfaces. Card deck images now use `object-contain` or existing `GeneratedMediaFrame` behavior where intended, while small list avatars and video previews keep `object-cover`.
- Regression check: no new play affordance was added to card decks. Video overlays remain guarded behind non-card deck checks.

### DASH-1 / STUDY-1 / STUDY-4 / SPEAK-3 / SHARE-2: Long-copy wrapping

- Verified code changes: `frontend/src/index.css`, `frontend/src/components/dashboard/WordDetailModal.tsx`, `frontend/src/components/WordInfoPanel.tsx`, `frontend/src/pages/Study.tsx`, `frontend/src/pages/StudyPG.tsx`, `frontend/src/pages/StudyFlashcard.tsx`, `frontend/src/pages/SharePage.tsx`, `frontend/src/components/speak/SpeakHistoryPanel.tsx`.
- Result: fixed for the Phase M1 surfaces. `.long-copy` uses `overflow-wrap: anywhere` with `word-break: normal`, which handles long German/French/CJK/no-space terms without forcing global aggressive word breaking.
- Layout risk check: usage is inside existing constrained containers. I did not find a source-level horizontal blowout introduced by the utility.

### NAV-3 / NAV-4: Mobile close and touch targets

- Verified code changes: `frontend/src/components/ProfileModal.tsx`, `frontend/src/components/ui/dialog.tsx`, `frontend/src/components/ui/sheet.tsx`.
- Result: fixed where small and safe. Close/touch targets were moved to 44px sizing without broad modal redesign.
- Residual note: `DialogContent` close position uses safe-area within the modal content coordinate space, not as a viewport-fixed close control. This is acceptable for M1 but should be revisited during the M2 modal/safe-area cleanup.

## Regressions Found

No P0/P1 regressions found.

Minor advisory notes:

- The custom `.min-h-dvh` utility has no explicit `vh` fallback for older browser engines. Modern mobile Safari/Chrome support `dvh`, so this is not a Phase M1 blocker.
- `WordInfoPanel` long metadata can wrap instead of truncating after the M1 long-copy change. That improves mobile readability but may look less compact in desktop side panels with unusually long generated metadata.
- DecksPG horizontal stack drag needs real device confirmation after `touchAction: 'pan-y'`; source review indicates it should still work because horizontal Framer drag remains configured.

## Viewport Notes

The review used source inspection against the requested viewport classes rather than live production data. Authenticated route browser testing was not performed because the review scope prohibited relying on live data or provider calls.

- `360x800`: safe-area variables and footer reserve prevent the main M1 top/bottom overlap risks. Long-copy is applied to modal, study, share, and speak message surfaces.
- `375x667`: VideoPlayer uses a scrollable main region, which is the key small-phone fix for close/video/info/action reachability.
- `390x844`: Glassy header offset and bottom recording/footer reserves should preserve normal portrait layout without desktop double-padding.
- `430x932`: card art `object-contain` changes preserve generated image aspect ratio in deck-detail surfaces.
- `844x390` landscape: VideoPlayer now has top/bottom safe-area padding plus `overflow-y-auto`; controls should remain reachable instead of being clipped by a fixed full-height shell.
- `768x1024`: breakpoint values keep the previous desktop/tablet header and footer scale, with safe-area values defaulting to zero on non-notched desktop/tablet contexts.

## Checks Run

- `git checkout main`
- `git pull --ff-only origin main`
- `git status --short`
- `cd frontend && npm run build`
  - Passed.
  - Existing Vite warnings: dynamic/static Supabase import chunking warning; bundle size warning.
- `cd frontend && npm run test:regressions`
  - Passed: `admin/deck regression checks passed`.
- Targeted ESLint for changed frontend files:
  - Passed with 0 errors.
  - Existing warnings remain:
    - `Dashboard.tsx`: missing `user` dependency warnings.
    - `DashboardPG.tsx`: missing `user` dependency warnings.
    - `DecksPG.tsx`: missing `t` and `user` dependency warnings.
- `git diff --check`
  - Passed.

## Remaining M2/M3 Recommendations

- M2: centralize modal safe-area behavior so dialog/sheet close controls are viewport-safe as well as 44px touch-safe.
- M2: manually verify DecksPG stack drag on iOS Safari and Android Chrome after the `pan-y` change.
- M2: add a small visual regression or Playwright-authenticated fixture for VideoPlayer landscape reachability.
- M3: keep the generation wizard redesign deferred; the M1 patch intentionally did not change wizard layout or product-choice architecture.
- M4: revisit Speak mobile audio permission and recording states with real-device Safari/Chrome testing, without changing provider logic.

## Scope Confirmed

This review confirms the M1 patch did not intentionally or materially change backend logic, Supabase migrations, storage/RLS, generation/provider logic, prompt architecture, credits/pricing logic, or paid provider call behavior.
