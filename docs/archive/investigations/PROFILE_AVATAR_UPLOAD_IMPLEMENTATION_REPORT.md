# Profile Avatar Upload — Implementation Report

Date: 2026-05-04
Spec: [PROFILE_AVATAR_UPLOAD_SPEC.md](PROFILE_AVATAR_UPLOAD_SPEC.md)

## Summary

Adds per-user profile avatar upload, replace, and remove. One image per user
at the canonical path `<user_id>/avatar.jpg` in a private storage bucket
(`profile-avatars`). Surfaced in `ProfileModal`, `AppHeader` (classic), and
`PolishGlassLayout` (glassy). No backend provider, generation, credit, or
paid-API code paths are touched. Phase 1A profile hardening is preserved
(role/credits remain protected; only `avatar_path` and `avatar_updated_at`
are added to the safe-update list).

## Files changed

### New files

- `frontend/supabase/migrations/20260504000000_profile_avatar_upload.sql`
  — adds `profiles.avatar_path` and `profiles.avatar_updated_at`, replaces
  `protect_profile_privileged_fields` with the same body plus those two
  columns added to the safe-update list, creates the private
  `profile-avatars` bucket (size cap 2 MiB, mime allowlist `image/jpeg`),
  and four RLS policies on `storage.objects` scoped to
  `name = auth.uid()::text || '/avatar.jpg'`.
- `frontend/src/hooks/useProfileAvatarUrl.ts` — hook that takes
  `(avatar_path, avatar_updated_at)`, calls
  `supabase.storage.from('profile-avatars').createSignedUrl(...)` with a
  3600 s TTL, and appends `?v=<epoch-from-avatar_updated_at>` for cache
  busting. Returns `null` when there is no avatar or signing fails.
- `docs/investigations/PROFILE_AVATAR_UPLOAD_SPEC.md` — design doc.
- `docs/investigations/PROFILE_AVATAR_UPLOAD_IMPLEMENTATION_REPORT.md` —
  this file.

### Modified files

- `frontend/src/lib/supabase.ts` — `Profile` and `AuthProfile` types now
  include `avatar_path?: string | null` and `avatar_updated_at?: string | null`.
- `frontend/src/hooks/useAuth.ts` — `fetchProfile` selects `avatar_path`
  and `avatar_updated_at` so cached profiles include them.
- `frontend/src/components/ProfileModal.tsx` — new avatar block at the
  top of the modal: 80 px square preview, Upload/Replace/Remove buttons,
  hidden file input limited to `image/jpeg,image/png,image/webp`, status
  line for working/success/error states. Client-side crop+resize to
  512×512 JPEG via `<canvas>` before upload. Upload uses
  `upsert: true` against the fixed path. Profile row is updated only
  after a successful upload; if the row update fails, the freshly
  uploaded object is best-effort removed.
- `frontend/src/components/layout/AppHeader.tsx` — `Avatar` now wraps
  `AvatarImage` (signed URL) with `AvatarFallback` (initials).
- `frontend/src/components/layout/PolishGlassLayout.tsx` — both the
  mobile and desktop profile buttons render an `Avatar` with the signed
  URL when present and fall back to the existing Lucide `User` icon
  otherwise.
- `frontend/src/lib/translations.ts` — adds 7 new keys per locale
  (`profile.avatar.upload`, `…replace`, `…remove`, `…saved`,
  `…uploadFailed`, `…invalid`, `…tooLarge`) for `en`, `de`, `fr`.
- `frontend/scripts/verify-admin-deck-regressions.mjs` — extended with
  ~30 new assertions covering ProfileModal upload controls, avatar URL
  hook, header rendering, type changes, migration policies, and
  Phase 1A protection guarantees.

## Migration added

`20260504000000_profile_avatar_upload.sql` — the migration is **not yet
applied to the live database**. It must be applied manually via the
project's standard Supabase migration flow before users can use the
upload UI. The frontend safely degrades to "no avatar" until the columns
exist (the select returns `null` for the new fields, which is the
unauthenticated-default state).

## SQL/bucket behavior

- `profiles.avatar_path text` and `profiles.avatar_updated_at timestamptz`
  are added with `if not exists` (idempotent).
- The Phase 1A `protect_profile_privileged_fields` trigger is replaced
  with a byte-identical body except its safe-update array now includes
  `avatar_path` and `avatar_updated_at`. `role`, `credits`, `email`, and
  `is_admin` remain unchanged.
- `storage.buckets` row for `profile-avatars` is upserted with
  `public = false`, `file_size_limit = 2097152` (2 MiB),
  `allowed_mime_types = array['image/jpeg']`. `on conflict do update`
  reasserts these on rerun.

## RLS behavior

All four policies on `storage.objects` for the new bucket gate by:

```
bucket_id = 'profile-avatars'
and auth.role() = 'authenticated'
and name = auth.uid()::text || '/avatar.jpg'
```

This means:

- Anonymous callers: no read, write, or delete in this bucket.
- Authenticated callers: can only read/insert/update/delete the single
  object at their own canonical path. They cannot create
  `<uid>/headshot.jpg` or any other key in their own folder, nor can
  they touch any object in another user's folder.
- `service_role` bypasses RLS as usual, leaving the door open for future
  admin moderation tooling without code changes here.

Other buckets (`videos`, `voice-samples`, `pipeline-events`) and their
policies are untouched.

## Upload/replace/remove behavior

### Upload

1. User clicks **Upload Avatar**, hidden `<input type="file">` opens.
2. Client validates: type ∈ `{image/jpeg, image/png, image/webp}`,
   size ≤ 5 MB (5 242 880 bytes). On failure, surfaces
   `profile.avatar.invalid` or `profile.avatar.tooLarge`.
3. Decode via `URL.createObjectURL` + `<img>`.
4. Centre-crop to a square, downscale to 512×512 on a `<canvas>`,
   `canvas.toBlob('image/jpeg', 0.9)`.
5. `supabase.storage.from('profile-avatars').upload('<uid>/avatar.jpg', blob, { upsert: true, contentType: 'image/jpeg' })`.
6. `supabase.from('profiles').update({ avatar_path, avatar_updated_at: now }).eq('id', uid)`.
7. `refreshProfile()`. Status flashes `profile.avatar.saved` for ~2 s.

### Replace

Identical to upload. `upsert: true` overwrites the same object — no
orphans, no cleanup.

### Remove

1. `supabase.storage.from('profile-avatars').remove(['<uid>/avatar.jpg'])`.
2. `update profiles set avatar_path = null, avatar_updated_at = now`.
3. `refreshProfile()`.

### Failure paths

- Validation fail → error toast, profile untouched, existing avatar
  preserved.
- Upload fail → error toast, profile untouched.
- Profile update fail post-upload → best-effort `remove` of the
  freshly-uploaded object so the row and bucket stay in sync, then
  error toast.

## Classic and glassy header behavior

- **Classic (`AppHeader.tsx`)**: profile button keeps its 28 px circle.
  When `avatar_path` exists and `createSignedUrl` succeeds, `<AvatarImage>`
  renders inside `<Avatar>`. If the signed URL is missing or the image
  errors, Radix's `<AvatarFallback>` renders the existing initials. The
  display-name span next to the avatar is preserved.
- **Glassy (`PolishGlassLayout.tsx`)**: both the mobile (`<sm`) and
  desktop (`>=sm`) profile buttons now render `<Avatar>` with the signed
  URL when present, falling back to the existing Lucide `User` icon when
  not. The button hit area, padding, and hover state are preserved.
- Both surfaces apply `draggable={false}` and `onDragStart=preventDefault`
  to the `<img>` so iOS long-press and desktop drag don't pop a context
  menu or initiate a native image drag.

## Tests/checks run

Working directory: `d:\CODING\ResonanceTEST\orchestrator\frontend`.

| Command | Result |
|---|---|
| `npm run test:regressions` | passed (`admin/deck regression checks passed`) including the new ~30 avatar assertions |
| `npm run build` (`tsc -b && vite build`) | passed (2477 modules, 643 ms; pre-existing chunk-size warning unrelated) |
| `npx eslint` on the new/changed files (`useProfileAvatarUrl.ts`, `AppHeader.tsx`, `PolishGlassLayout.tsx`, `useAuth.ts`, `supabase.ts`, `translations.ts`) | clean |
| `npx eslint src/components/ProfileModal.tsx` | 2 errors, both pre-existing (verified by stashing changes and re-running on clean main): the existing `useEffect` at the original line 53 and the existing `as any` at the original line 100. No new lint errors introduced by this change. |
| `git diff --check` | clean (no whitespace issues) |

No provider calls were made.

## Manual verification steps

These need to be exercised against a live deploy after the migration
lands:

1. Open the profile modal from the classic header. The avatar block
   should render with initials fallback.
2. Upload a JPEG > 1024 px on each side. The square 80 px preview should
   replace the initials within ~1 s; the classic header avatar should
   show the same image.
3. Close and reopen the modal. The image should persist.
4. Reload the page. Same.
5. Click **Replace**, pick a different image. The avatar everywhere
   should swap immediately (cache buster `?v=<epoch>` is appended).
6. Click **Remove**. The image should disappear from both the modal
   and the header; the initials/icon fallback should return.
7. Switch to the glassy skin. Repeat upload/replace/remove and confirm
   both the desktop and mobile profile buttons show the new avatar.
8. On a phone (or a narrow window simulating mobile): open the glassy
   layout, hit the small profile button in the top-right, exercise
   upload/remove. Confirm no overflow into the credits chip and no
   long-press context menu.
9. Try uploading an oversize file (>5 MB) — the modal should show
   `Image too large (max 5 MB)` and not call storage.
10. Try uploading a non-image file — the modal should show
    `Invalid image` and not call storage.

## Remaining risks

- **Server-side mime/size enforcement varies by Supabase storage version.**
  The bucket settings are honoured on recent versions; on older versions
  they are ignored. The client always enforces both regardless. Worst
  case: a misbehaving client could upload a non-JPEG payload that the
  client-side resize converted to JPEG (so the bytes are JPEG anyway) —
  no real exposure.
- **Signed URL TTL of 3600 s.** A tab open longer than an hour may show
  a broken image until the next mount or `avatar_updated_at` change.
  Acceptable for this surface.
- **Migration application.** The migration must be applied before users
  can upload. The UI degrades safely (no avatar block usage breaks)
  until then — Profile select silently treats missing columns as null.
- **Pre-existing ProfileModal lint warnings remain.** Not introduced by
  this change; flagged here for transparency. The 2 errors are an
  existing `useEffect` that calls `setState` directly (matching the
  pattern used in `Quotas.tsx` and `PolishGlassLayout.tsx`, both of
  which explicitly disable that rule) and an existing
  `update({ skin: id } as any)` cast in `handleSkinChange`. Cleaning
  these up is out of scope for the avatar feature.
- **No interaction with credits, generation, prompts, paid APIs, or
  Phase 1A protections** — all of those code paths are untouched.
