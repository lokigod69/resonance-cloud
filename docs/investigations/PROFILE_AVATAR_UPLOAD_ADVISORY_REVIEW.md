# Profile Avatar Upload Advisory Review

Date: 2026-05-04
Branch reviewed: `main`

## Verdict

**Needs small fixes.**

The avatar storage model and frontend implementation are generally correct: private bucket, fixed per-user object path, signed URL rendering, client-side resize to JPEG, and header/modal refresh behavior all match the spec.

One SQL hardening regression was found in the original avatar migration: it restored `public.is_admin()` as a direct bypass inside `protect_profile_privileged_fields()`, while `20260503020000_phase1f_admin_command_rpcs.sql` had deliberately narrowed that trust path to `service_role` or the transaction-local `app.allow_profile_privileged_update` flag. I patched the repo with:

- `frontend/supabase/migrations/20260504000000_profile_avatar_upload.sql` corrected for fresh environments.
- `frontend/supabase/migrations/20260504010000_profile_avatar_phase1f_trigger_fix.sql` added as a repair migration for environments where the first avatar migration was already applied manually.

Live SQL/storage still needs manual verification because this review did not connect to the Supabase project.

## Files Reviewed

- `frontend/supabase/migrations/20260504000000_profile_avatar_upload.sql`
- `frontend/supabase/migrations/20260504010000_profile_avatar_phase1f_trigger_fix.sql`
- `frontend/src/hooks/useProfileAvatarUrl.ts`
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/lib/supabase.ts`
- `frontend/src/components/ProfileModal.tsx`
- `frontend/src/components/layout/AppHeader.tsx`
- `frontend/src/components/layout/PolishGlassLayout.tsx`
- `frontend/src/components/ui/avatar.tsx`
- `frontend/src/lib/translations.ts`
- `frontend/scripts/verify-admin-deck-regressions.mjs`
- `docs/investigations/PROFILE_AVATAR_UPLOAD_SPEC.md`
- `docs/investigations/PROFILE_AVATAR_UPLOAD_IMPLEMENTATION_REPORT.md`

## SQL, Storage, And RLS Findings

### P1 - Fixed in repo: avatar migration regressed Phase 1F profile hardening

Before patch, `20260504000000_profile_avatar_upload.sql` extended the profile safe-update list from the older Phase 1A trigger body and included:

```sql
or public.is_admin();
```

That conflicts with Phase 1F, which moved privileged admin browser mutations behind audited RPCs and removed direct admin trust from `protect_profile_privileged_fields()`. If the original avatar migration was applied live before this review, the live function should be repaired by applying `20260504010000_profile_avatar_phase1f_trigger_fix.sql` or by running its `create or replace function` body manually.

After patch, the trusted condition is back to:

```sql
coalesce(auth.role(), '') = 'service_role'
or coalesce(current_setting('app.allow_profile_privileged_update', true), '') = 'on'
```

### Storage/RLS review

- `profiles.avatar_path` and `profiles.avatar_updated_at` are added.
- `profile-avatars` is created/upserted as `public = false`.
- Bucket limits are set where supported: `file_size_limit = 2097152`, `allowed_mime_types = array['image/jpeg']`.
- All storage policies are bucket-scoped to `bucket_id = 'profile-avatars'`.
- Select, insert, update, and delete policies all require `auth.role() = 'authenticated'` and the exact object name `auth.uid()::text || '/avatar.jpg'`.
- That exact-name condition blocks another user's path, `<uid>/avatar.png`, `<uid>/anything-else.jpg`, and nested files.
- The safe profile update list only adds `avatar_path` and `avatar_updated_at`; `role` and `credits` remain outside the safe list.

## Frontend Findings

- `useAuth` selects `avatar_path` and `avatar_updated_at`.
- `Profile` and `AuthProfile` include both avatar fields as optional nullable fields, so old cached profiles without these keys degrade to `undefined` and render fallback avatars.
- `refreshProfile()` is called after upload and remove, so the modal and headers receive the updated profile state.
- `useProfileAvatarUrl` returns `null` for missing path, uses `createSignedUrl` against `profile-avatars`, appends a cache buster from `avatar_updated_at`, does not log signed URLs, and cleans up stale async results with a cancellation flag.
- `ProfileModal` accepts JPEG/PNG/WebP input, rejects files over 5 MB, center-crops to a square, resizes to 512x512, encodes as `image/jpeg`, uploads only `${user.id}/avatar.jpg` with `upsert: true`, and updates `profiles` only after a successful upload.
- If profile update fails after upload, the freshly uploaded fixed object is best-effort removed.
- Remove targets only `${user.id}/avatar.jpg` and clears profile avatar fields. Storage delete errors are swallowed, so a failed delete could leave a private fixed-path object with no profile pointer; next upload overwrites it.

## Header And Mobile Findings

- Classic `AppHeader` renders `AvatarImage` when a signed URL exists and keeps initials in `AvatarFallback`.
- Glassy `PolishGlassLayout` renders avatars in both mobile and desktop profile buttons when available and preserves the Lucide `User` fallback when unavailable.
- Avatar images use `draggable={false}` and `onDragStart={preventDefault}`.
- The modal avatar block uses wrapping button layout and should tolerate narrow widths, but this was a static review only. Small mobile behavior still needs live/browser verification.
- Close button accessibility depends on the existing `DialogContent` primitive; no avatar-specific overlap issue was found statically.

## Localization

All new `profile.avatar.*` keys exist in `en`, `de`, and `fr`:

- `upload`
- `replace`
- `remove`
- `saved`
- `uploadFailed`
- `invalid`
- `tooLarge`

No avatar-specific hard-coded user-visible English was found in the reviewed UI paths.

## Static Tests Review

`frontend/scripts/verify-admin-deck-regressions.mjs` is meaningful for broad static coverage, but it missed the Phase 1F trigger trust regression. Recommended follow-up coverage:

- fixed avatar path and no timestamp/date strings in `avatarObjectPath`
- JPEG output dimension/content type behavior
- private bucket with size and MIME constraints
- own-path RLS policies
- avatar fields in types and `useAuth`
- header `AvatarImage` rendering
- upload type/size validation
- no direct `public.is_admin()` trust in the avatar profile trigger
- repair migration preserves avatar fields and Phase 1F trust model

The script is still string-based and therefore not a substitute for live RLS tests.

## Checks Run

Working directory: `D:\CODING\ResonanceTEST\orchestrator\frontend`

| Command | Result |
|---|---|
| `npm run test:regressions` | Passed earlier during avatar review. Final rerun against the dirty worktree failed on unrelated DeckViewPG/mobile assertion: `DeckViewPG card thumbnails must not block carousel gestures` |
| `npm run build` | Passed; Vite emitted existing dynamic-import/chunk-size warnings |
| `npx eslint src/hooks/useProfileAvatarUrl.ts src/hooks/useAuth.ts src/lib/supabase.ts src/components/ProfileModal.tsx src/components/layout/AppHeader.tsx src/components/layout/PolishGlassLayout.tsx src/lib/translations.ts` | Failed on two existing `ProfileModal.tsx` lint errors: `react-hooks/set-state-in-effect` at line 115 and `@typescript-eslint/no-explicit-any` at line 262 |
| `npx eslint scripts/verify-admin-deck-regressions.mjs` | Passed |
| `git diff --check` | Passed |

No paid providers were called.

## Manual Verification Checklist

### Live SQL/storage checks

- Confirm `public.profiles` has `avatar_path text` and `avatar_updated_at timestamptz`.
- Confirm bucket `profile-avatars` exists.
- Confirm `profile-avatars.public = false`.
- Confirm bucket size and MIME settings are present where supported.
- Confirm policies exist for select, insert, update, and delete on `storage.objects`.
- Confirm every policy is scoped to `bucket_id = 'profile-avatars'`.
- Confirm every policy uses the exact path predicate `name = auth.uid()::text || '/avatar.jpg'`.
- Confirm non-service authenticated users cannot upload:
  - another user's `<uid>/avatar.jpg`
  - own `<uid>/avatar.png`
  - own `<uid>/anything-else.jpg`
  - own nested paths such as `<uid>/nested/avatar.jpg`
- Confirm the live `protect_profile_privileged_fields()` body does not include `public.is_admin()` in `v_is_trusted`.
- Confirm normal users and admins using direct table updates cannot update `profiles.role` or `profiles.credits`; audited RPCs should remain the privileged path.

### Product smoke checks

- Upload avatar in Classic.
- Confirm Classic header updates.
- Reload page and confirm avatar persists.
- Replace avatar and confirm the image changes without stale cache.
- Remove avatar and confirm fallback initials return.
- Switch to Glassy and repeat upload, replace, and remove.
- Test narrow/mobile viewport in both Classic modal and Glassy header.
- Try invalid file type and confirm understandable error.
- Try file larger than 5 MB and confirm rejection.
- Confirm storage contains at most one object for the user at `<uid>/avatar.jpg`.
- After remove, confirm either no object remains or document the private fixed-path residual if storage deletion failed.

## Recommended Fix Patch

### P1 - Applied in repo

- Correct `20260504000000_profile_avatar_upload.sql` to preserve Phase 1F trigger trust semantics.
- Add `20260504010000_profile_avatar_phase1f_trigger_fix.sql` so already-applied environments can repair the live function.

### P2 - Manual/live follow-up

- Apply the repair migration to the live database if Sir Robert applied the pre-review avatar migration.
- Run the live SQL/storage checks above before declaring the SQL fully verified.
- Strengthen static regression coverage for admin-bypass drift and avatar storage/path regressions.

### P3 - Optional

- Consider surfacing storage delete failures on avatar remove if the product requires guaranteed immediate object deletion. Current behavior is private and fixed-path, but it can leave a residual object if delete fails after the profile pointer is cleared.
