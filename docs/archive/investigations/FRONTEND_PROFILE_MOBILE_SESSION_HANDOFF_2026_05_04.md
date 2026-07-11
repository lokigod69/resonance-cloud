# Frontend/Profile/Mobile Session Handoff - 2026-05-04

Canonical repo: `D:\CODING\ResonanceTEST\orchestrator`
Branch: `main`

## 1. Summary Of Completed Work

- Card deck viewer now opens the card-word modal instead of routing card decks into the Study route.
- Glassy card deck image swipe/drag behavior was fixed as part of the card deck viewer work.
- Generated card image aspect ratio is preserved in detail, modal, and deck preview contexts.
- Dashboard video return context now restores the dashboard word modal after closing a video.
- Profile avatar upload, replace, and remove are implemented.
- Avatar SQL repair migration was added for Phase 1F trigger hardening.
- Sir Robert applied the avatar repair SQL manually.
- Avatar live smoke passed.
- Mobile Phase M1 safety patches were implemented and reviewed clean.

## 2. Important Commits

- `f241166` - Add card deck viewer modal; card decks open `CardWordViewerModal` instead of Study and include the Glassy drag/swipe fix.
- `13923a5` - Preserve generated card image aspect ratio in card presentation, modal, and deck preview surfaces.
- `7530a8d` - Restore dashboard word modal after video close by preserving return context through `VideoPlayer`.
- `59d7d0f` - Add profile avatar upload with a private bucket, fixed object path, signed URL display, Classic/Glassy header support, and static regression coverage.
- `75ec376855231a110d3bee058fafe2833f9e1799` - Fix profile avatar trigger hardening; corrects the avatar migration for fresh environments and adds the Phase 1F repair migration.
- `feb70fe0b62124d92a778b644d3a9a672342c883` - `fix(frontend): apply M1 mobile safety patches`.
- `45cd32f8f5adec59b1247194d3f869e48d32ef3a` - Add clean advisory review for the M1 mobile safety patch batch.

## 3. SQL/Migration Status

- Avatar migration `frontend/supabase/migrations/20260504000000_profile_avatar_upload.sql` adds:
  - `profiles.avatar_path`
  - `profiles.avatar_updated_at`
  - private `profile-avatars` bucket
  - fixed-path storage RLS policies for `<user_id>/avatar.jpg`
  - profile trigger safe-update support for avatar fields
- Repair migration `frontend/supabase/migrations/20260504010000_profile_avatar_phase1f_trigger_fix.sql` reasserts the Phase 1F trust model for `protect_profile_privileged_fields()`:
  - trusted profile privileged updates remain limited to `service_role` or the transaction-local `app.allow_profile_privileged_update` flag
  - direct `public.is_admin()` trust is not restored
- Sir Robert applied the repair SQL manually to the live database.
- No further avatar SQL is required unless migration history is not repaired.
- Supabase CLI migration history may still need repair if either migration was applied manually outside the CLI:
  - `20260504000000` - verify with Supabase migration history; mark as applied if the schema exists but CLI history is missing it.
  - `20260504010000` - verify with Supabase migration history; mark as applied if the repair SQL was run manually but CLI history is missing it.
- Do not rerun old Phase 1 migrations. Do not rerun avatar SQL unless migration history/repair status requires it.

## 4. Avatar Status

- Bucket: `profile-avatars`.
- Bucket visibility: private.
- Canonical object path: `<user_id>/avatar.jpg`.
- Display model: signed URL from `profile-avatars`, with cache busting from `avatar_updated_at`.
- Upload works.
- Replace works and overwrites the same fixed object path.
- Remove works and clears the profile avatar pointer.
- Classic header shows the avatar when available and falls back to initials.
- Glassy mobile and desktop profile buttons show the avatar when available and fall back to the existing user icon.
- Live smoke passed with Classic, Glassy, and narrow/mobile profile modal coverage.
- No orphaned avatar objects remained after replace/remove in the live smoke.
- Normal authenticated users cannot update `profiles.role` or `profiles.credits`.

## 5. Mobile M1 Status

- Safe-area-aware header offsets were added for Glassy shells and sticky route content.
- `DeckViewPG` reserves footer space for the fixed footer plus safe-area bottom.
- `VideoPlayer` has safe-area top/bottom padding and landscape-safe scroll behavior.
- Speak fixed shells and bottom recording/chat bars now account for safe-area top/bottom.
- `DecksPG` Stack mode changed from scroll-trapping `touchAction: 'none'` to vertical-pan-preserving `touchAction: 'pan-y'`.
- Card-art surfaces use `object-contain` where intended, while tiny avatars and decorative video previews keep `object-cover`.
- `.long-copy` utility was added and applied to high-risk long text surfaces.
- Close and touch targets were improved where the patch was small and safe.
- Advisory review verdict: clean.

## 6. Checks Run

Reported checks across the completed work:

- `npm run build`
  - Passed in avatar implementation, avatar smoke, M1 implementation, and M1 advisory review.
  - Vite still reports existing dynamic import/chunk-size warnings.
- `npm run test:regressions`
  - Passed after avatar implementation.
  - Passed after M1 mobile patches.
  - Passed in M1 advisory review with `admin/deck regression checks passed`.
- Targeted ESLint
  - Avatar implementation targeted lint was clean for new/changed non-ProfileModal files.
  - `ProfileModal.tsx` had existing lint issues during avatar work.
  - M1 targeted lint had 0 errors and existing hook dependency warnings in dashboard/decks files.
- `git diff --check`
  - Passed for avatar implementation/review, avatar live smoke, M1 implementation/review, and this handoff.
- Avatar live Playwright smoke
  - Passed using bundled Playwright runtime.
  - In-app browser automation was unavailable at that time because its configured Node runtime was below the required version.
- Caveat: the workspace still contains unrelated dirty/untracked files that were not touched by these frontend/profile/mobile commits.

## 7. Remaining Non-Blocking Risks

- Existing ESLint warnings remain in dashboard/decks files:
  - `Dashboard.tsx` missing `user` dependency warnings.
  - `DashboardPG.tsx` missing `user` dependency warnings.
  - `DecksPG.tsx` missing `t` and `user` dependency warnings.
- `ProfileModal.tsx` had existing lint issues during avatar work and should be cleaned separately if they still reproduce.
- Real-device QA is still recommended for `DecksPG` Stack drag after the `pan-y` touch-action change.
- M2 modal/safe-area cleanup can happen later; M1 intentionally avoided broad modal redesign.
- Generation wizard mobile layout remains deferred to M3.
- Speak audio permission UX remains later work.
- Music mobile touch targets remain P2 mobile polish.

## 8. Recommended Next Work

### Frontend/Product Lane

- Generation frontend lane redesign:
  - Video and Music
  - Standard Card
  - GPT Image-2 / Premium Card
- Clean wizard copy.
- Clean card tier selection.
- Separate visual style selection by product lane.
- Clean confirm payload and cost display.
- Keep this separate from backend provider, prompt architecture, and pricing changes.

### Stabilization/Security Lane

- Phase 1C paid API hardening:
  - `frontend/api/voice-chat.ts`
  - `frontend/api/suggest-words.ts`
  - `frontend/api/grok-token.ts`
- Auth checks.
- Quota checks.
- Rate limits.
- Request validation.
- API typecheck.

## 9. Do Not Forget

- Do not rerun old Phase 1 migrations.
- Do not rerun avatar SQL unless migration history/repair requires it.
- Do not mix wizard redesign with backend provider or prompt changes.
- Do not touch unrelated dirty files.
- Do not use `git add -A`.
