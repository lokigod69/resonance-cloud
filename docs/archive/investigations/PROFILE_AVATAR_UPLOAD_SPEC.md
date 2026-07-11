# Profile Avatar Upload Spec

Date: 2026-05-04
Author: Profile avatar feature investigation
Scope: Add a single per-user profile avatar that surfaces in `ProfileModal`,
`AppHeader` (classic), and `PolishGlassLayout` (glassy). Docs-only audit;
no code changes in this pass.

## 1. Current profile/header flow

### `profiles` table

Phase 1A defines `protect_profile_privileged_fields` ([20260428120000_phase1a_db_rls_auth_hardening.sql:51-114](../../frontend/supabase/migrations/20260428120000_phase1a_db_rls_auth_hardening.sql#L51-L114))
with a hard-coded safe-update column list:

```
display_name, base_language, theme, skin,
onboarding_complete, onboarding_completed, onboarding_preferences, updated_at
```

Any UPDATE by a non-trusted role that touches a column outside this list raises
`42501 Users can only update safe profile preference fields`. The RLS policies
"Users can update own profile" and "Users can insert own profile safety net"
gate by `id = auth.uid()`. Phase 1A also ensures only `service_role`, callers
that have set `app.allow_profile_privileged_update = on`, or admins can bypass
the trigger.

### `useAuth` profile fetch

`useAuth.fetchProfile` ([frontend/src/hooks/useAuth.ts:131-138](../../frontend/src/hooks/useAuth.ts#L131-L138))
selects only:

```
display_name, credits, base_language, role
```

`AuthProfile` is a `Pick<Profile, 'display_name' | 'base_language' | 'role' | 'credits'>`
([frontend/src/lib/supabase.ts:23](../../frontend/src/lib/supabase.ts#L23)).
The cached profile in `localStorage` mirrors this shape. There is no avatar
field anywhere.

### Header rendering

- Classic header `AppHeader.tsx`
  ([frontend/src/components/layout/AppHeader.tsx:197-202](../../frontend/src/components/layout/AppHeader.tsx#L197-L202))
  renders an `Avatar` with only an `AvatarFallback` showing initials computed
  from `display_name` or the email local-part.
- Glassy layout `PolishGlassLayout.tsx`
  ([frontend/src/components/layout/PolishGlassLayout.tsx:69-75,117-123](../../frontend/src/components/layout/PolishGlassLayout.tsx#L69-L123))
  renders a generic Lucide `User` icon for both the mobile and desktop
  profile buttons. There is no `Avatar` primitive used here yet.
- The shared `Avatar` primitive ([frontend/src/components/ui/avatar.tsx](../../frontend/src/components/ui/avatar.tsx))
  already exposes `Avatar`, `AvatarImage`, `AvatarFallback` from
  `radix-ui`. `AvatarImage` expects a `src` prop.

### Profile modal

`ProfileModal.tsx` ([frontend/src/components/ProfileModal.tsx](../../frontend/src/components/ProfileModal.tsx))
shows skin/theme pickers, display name, base language, email, sign-out — no
avatar block at all.

### Existing storage buckets

Three public buckets exist today: `videos`, `voice-samples`, `pipeline-events`.
All three are public-read. No private bucket pattern exists yet, but the
Supabase JS client already supports `createSignedUrl` and `upload(... { upsert: true })`
out of the box.

## 2. Proposed storage/database model

### Table fields

Two columns added to `public.profiles`:

| Column | Type | Notes |
|---|---|---|
| `avatar_path` | `text` | Object key inside the `profile-avatars` bucket. Always either `<user_id>/avatar.jpg` or `null`. Never a public URL. |
| `avatar_updated_at` | `timestamptz` | Set whenever the object is uploaded, replaced, or removed. Used both as a cache-buster and as a UI cue. |

No history table. No previous-avatars row. The single object at the canonical
path is the only persisted blob.

### Storage layout

- Bucket: `profile-avatars`, **private**.
- One object per user: `<user_id>/avatar.jpg`.
- `image/jpeg` only (enforced by the client and, where available, by the
  bucket's `allowed_mime_types`).
- Object size cap: ≤ ~1 MB after client-side resize (bucket
  `file_size_limit` set conservatively, e.g. 2 MiB to leave headroom for
  EXIF / colour-profile overhead).
- Re-upload uses `upsert: true` so the object key never changes. There is
  no "stale" object to clean up — the new bytes overwrite the old bytes
  in place.

### Why not store a public URL

Storing the resolved public URL on `profiles` would:

- couple the row to bucket visibility decisions;
- block migration from public → private (or vice versa) without a backfill;
- bypass the cache-busting we want from `avatar_updated_at`.

Instead, the path + timestamp pair is stored. The frontend mints a fresh
signed URL on demand and appends `?v=<unix-seconds>` to break browser caches
when the user replaces the avatar.

## 3. Public bucket vs private bucket recommendation

**Recommendation: private bucket with signed URLs.**

| Criterion | Public | Private |
|---|---|---|
| Object discoverability | URL leaks → permanent global read; predictable `<uid>/avatar.jpg` paths are guessable from any leaked uid | Each session asks for a TTL-bounded URL |
| Removal semantics | Object stays cached on CDNs and shared links until TTL elapses | Removed object becomes unreachable on next signing failure |
| Consistency with existing buckets | Matches `videos`, `voice-samples`, `pipeline-events` | New pattern |
| Roadmap alignment | Re-introduces a leak surface roadmap H10 wants to close ([POST_GPT_CARD_BACKEND_HARDENING_ROADMAP.md G10](POST_GPT_CARD_BACKEND_HARDENING_ROADMAP.md#g10-videos-bucket-is-fully-public-read)) | Sets the precedent the roadmap recommends |
| Sharing | Free-of-cost | Frontend pays a small `createSignedUrl` round-trip on first render |

The `videos` bucket is public for sharing. Profile avatars are not a
sharing surface; they belong to the owning user. Going private is both
safer today and consistent with the direction the storage hardening
roadmap calls out.

The signed-URL TTL should be long enough to amortise across a normal
session — recommend **3600 seconds**. The header will mint a URL on
mount and replace it on `avatar_updated_at` change.

## 4. Exact SQL migration plan

New file:
`frontend/supabase/migrations/20260504000000_profile_avatar_upload.sql`

The migration must do four things atomically:

1. Add the two profile columns.
2. Replace `protect_profile_privileged_fields` so the safe-update list
   includes `avatar_path` and `avatar_updated_at`. Do **not** add `role`,
   `credits`, `email`, or any other privileged field.
3. Create the private `profile-avatars` bucket (with allowed mime types
   and size limit, where the Supabase storage schema supports them;
   degrade gracefully if a column is missing).
4. Create RLS policies on `storage.objects` scoped to that bucket.

Sketch (full text written verbatim in the migration):

```sql
begin;

-- 1. Profile columns
alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists avatar_updated_at timestamptz;

comment on column public.profiles.avatar_path is
  'Object key inside the profile-avatars bucket. Format: <user_id>/avatar.jpg, or null.';
comment on column public.profiles.avatar_updated_at is
  'Set whenever the avatar object is created, replaced, or removed. Used for cache busting.';

-- 2. Replace privileged-field protection trigger to allow these two columns.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_safe_update_columns text[] := array[
    'display_name',
    'base_language',
    'theme',
    'skin',
    'onboarding_complete',
    'onboarding_completed',
    'onboarding_preferences',
    'updated_at',
    'avatar_path',
    'avatar_updated_at'
  ];
  v_blocked_columns text;
  v_is_trusted boolean;
begin
  -- (body identical to Phase 1A; only the column list changes)
  ...
end;
$$;

-- 3. Bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  false,
  2097152,
  array['image/jpeg']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 4. RLS: own-path-only, fixed filename
create policy "Users read own avatar"
  on storage.objects for select
  using (
    bucket_id = 'profile-avatars'
    and auth.role() = 'authenticated'
    and name = auth.uid()::text || '/avatar.jpg'
  );

create policy "Users insert own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-avatars'
    and auth.role() = 'authenticated'
    and name = auth.uid()::text || '/avatar.jpg'
  );

create policy "Users update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'profile-avatars'
    and auth.role() = 'authenticated'
    and name = auth.uid()::text || '/avatar.jpg'
  )
  with check (
    bucket_id = 'profile-avatars'
    and auth.role() = 'authenticated'
    and name = auth.uid()::text || '/avatar.jpg'
  );

create policy "Users delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'profile-avatars'
    and auth.role() = 'authenticated'
    and name = auth.uid()::text || '/avatar.jpg'
  );

commit;
```

### Phase-1 hardening compatibility check

- `role`, `credits`, `email`, `is_admin` are **not** added to the safe-update
  list. The Phase 1A guarantees that ordinary users cannot self-admin or
  self-credit are preserved unchanged.
- The trigger body is copied verbatim except for the column array. The
  `INSERT` branch (`new.role <> 'learner'` / `new.credits <> 0` block)
  remains identical.
- Existing RLS policies on `profiles` are untouched.
- Existing storage policies on `videos`, `voice-samples`, `pipeline-events`
  are untouched. The new policies only match `bucket_id = 'profile-avatars'`.

## 5. RLS policy design

The four policies above all gate by:

```
bucket_id = 'profile-avatars'
and auth.role() = 'authenticated'
and name = auth.uid()::text || '/avatar.jpg'
```

This means:

- Anonymous callers cannot read, write, or delete in this bucket.
- An authenticated user can only address the single object at their own
  canonical path. They cannot put a second file alongside it
  (`avatar.png`, `headshot.jpg`, `nested/foo.jpg`) — RLS denies the insert.
- They cannot enumerate or read another user's avatar — `name` must equal
  their own `auth.uid()::text || '/avatar.jpg'`. (Note: signed URLs minted
  by another user with their own session do not leak; signing only works
  for objects you can `select`.)
- `service_role` is unaffected: it bypasses RLS by design, which is
  desirable for any future admin moderation tooling.

Mime-type and size are also enforced at the bucket level when those
columns are honoured by the running storage version; the client enforces
both regardless.

### Why fixed filename instead of timestamped paths

A timestamp-suffixed object would let a misbehaving or buggy client
accumulate orphan files inside their own folder, even though they cannot
escape the folder. That undermines the "only one avatar per user" goal
and would force us to either trust client-side delete or build another
storage_cleanup-style worker just for avatars (re-introducing roadmap
G1). The fixed name is the simplest design that makes "only the latest
avatar exists" structurally true.

## 6. Frontend component changes

### `frontend/src/lib/supabase.ts`

Extend `Profile` and `AuthProfile`:

```ts
export type Profile = {
  id: string
  email?: string | null
  display_name: string | null
  base_language: string | null
  role: 'learner' | 'admin'
  credits: number
  theme?: string
  avatar_path?: string | null
  avatar_updated_at?: string | null
  created_at: string
}

export type AuthProfile = Pick<
  Profile,
  'display_name' | 'base_language' | 'role' | 'credits' | 'avatar_path' | 'avatar_updated_at'
>
```

### `frontend/src/hooks/useAuth.ts`

`fetchProfile` selects the two new columns:

```ts
.select('display_name, credits, base_language, role, avatar_path, avatar_updated_at')
```

`writeCachedProfile` automatically picks up the wider shape because it
serialises whatever object it is given. The cache key already namespaces
by user, so old cache entries simply lack the avatar fields — they round
to `undefined`/`null` until the next fetch.

### New file: `frontend/src/hooks/useProfileAvatarUrl.ts`

```ts
export function useProfileAvatarUrl(
  avatarPath: string | null | undefined,
  avatarUpdatedAt: string | null | undefined
): string | null
```

Behaviour:

- Returns `null` when `avatarPath` is empty.
- Calls `supabase.storage.from('profile-avatars').createSignedUrl(avatarPath, 3600)`.
- Memoises by `[avatarPath, avatarUpdatedAt]` so the signed URL is only
  re-minted when the row actually changes.
- Appends `?v=<unix-seconds-from-avatar_updated_at>` to bust the
  browser's `<img>` cache without re-signing.
- Never logs the URL or token.
- On failure (network, expired session) returns `null` and lets the
  fallback render. No retry storm.

### `frontend/src/components/ProfileModal.tsx`

A new section at the top of the modal, above Skin:

- Square `Avatar` ~`88px` showing either the resolved signed URL via
  `AvatarImage` or initials via `AvatarFallback`.
- One primary button: `Upload` if no avatar, `Replace` if one exists.
- One destructive secondary button: `Remove` (only when an avatar
  exists).
- Hidden `<input type="file" accept="image/jpeg,image/png,image/webp">`
  triggered by the primary button.
- Inline state: `idle | validating | resizing | uploading | success | error`.
- Error text inherits the existing dialog style.

The existing skin/theme/display-name/language/email/sign-out layout
stays unchanged below the new block.

### `frontend/src/components/layout/AppHeader.tsx`

Use the existing `Avatar` primitive with both `AvatarImage` and
`AvatarFallback`:

```tsx
<Avatar className="h-7 w-7">
  {avatarUrl && <AvatarImage src={avatarUrl} alt="" draggable={false} />}
  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
</Avatar>
```

`AvatarImage` already silently falls back to `AvatarFallback` while it
loads or if the image errors, so the initials remain a stable fallback
without extra plumbing.

### `frontend/src/components/layout/PolishGlassLayout.tsx`

Replace the two `User` icon usages (mobile and desktop profile button)
with the `Avatar` primitive:

- When `avatarUrl` exists, render `AvatarImage` inside a small `Avatar`.
- When it does not, render the existing `User` Lucide icon as the
  fallback (preserve the glassy aesthetic).

Both header changes:

- `draggable={false}` on the `<img>` to suppress native drag.
- `onDragStart={(e) => e.preventDefault()}` for the Safari/iOS edge case.
- `select-none` Tailwind class on the wrapper.

## 7. Upload/replace/remove behaviour

### Upload (no avatar yet)

1. User clicks `Upload Avatar`. Hidden file input opens.
2. Client validates: type ∈ `{image/jpeg, image/png, image/webp}`, size ≤ 5 MB.
3. Decode to `HTMLImageElement` via `URL.createObjectURL`.
4. Crop centre square; downscale to **512×512** on a `<canvas>`.
5. `canvas.toBlob('image/jpeg', 0.9)`.
6. `supabase.storage.from('profile-avatars').upload(<uid>/avatar.jpg, blob, { upsert: true, contentType: 'image/jpeg' })`.
7. `supabase.from('profiles').update({ avatar_path: '<uid>/avatar.jpg', avatar_updated_at: new Date().toISOString() }).eq('id', uid)`.
8. `refreshProfile()`.
9. `URL.revokeObjectURL` for the temporary preview blob URL.
10. UI flips to success state for ~2 s, then back to idle showing `Replace` and `Remove`.

### Replace

Identical to upload. `upsert: true` means the same RLS-allowed object key is overwritten — no second object is created, no orphan exists.

### Remove

1. User clicks `Remove`.
2. `supabase.storage.from('profile-avatars').remove(['<uid>/avatar.jpg'])`.
3. `supabase.from('profiles').update({ avatar_path: null, avatar_updated_at: new Date().toISOString() })`.
4. `refreshProfile()`.

### Failure handling

- Validation failure → show error, do nothing else, keep existing avatar.
- Storage upload failure → do **not** update `profiles`. The DB row
  continues to point at whatever it pointed at before. Show error.
- Profile update failure after a successful upload → show a recoverable
  error and best-effort delete the freshly-uploaded object so the row
  and the bucket stay in sync. (The next attempt will overwrite anyway,
  so this is belt-and-suspenders.)

## 8. Cache-busting behaviour

Two layers:

- **Signed-URL freshness**: the helper memoises by `[avatar_path, avatar_updated_at]`,
  so a replace mints a new signed URL.
- **`<img>` cache**: the helper appends `?v=<epoch-from-avatar_updated_at>`
  so even if the same signed URL got cached by the browser somehow, the
  `<img>` request URL changes when the user replaces their avatar.

Crucially, when the user **removes** their avatar, the helper returns
`null` — the `AvatarFallback` (initials/icon) is rendered without any
cached image leakage.

## 9. Mobile behaviour

- `<input type="file">` with `accept="image/jpeg,image/png,image/webp"`
  surfaces the native picker. iOS/Android default to camera/gallery.
- Resize/encode happens entirely in the browser via `<canvas>`. No
  permissions beyond the file picker are requested.
- The mobile top bar (`PolishGlassLayout` mobile `User` button at
  [PolishGlassLayout.tsx:69-75](../../frontend/src/components/layout/PolishGlassLayout.tsx#L69-L75))
  reuses the same `Avatar` element so the visual treatment stays
  identical to desktop. Sizes stay at the existing `h-4 w-4` icon
  footprint via the `Avatar size="sm"` variant — the avatar must not
  bleed into the credits chip on small viewports.
- Buttons in the modal stack vertically on the existing `sm:max-w-md`
  dialog already; no new layout work needed for narrow widths.
- `select-none` and `draggable={false}` defuse the iOS long-press image
  context menu and Android image drag.

## 10. Tests needed

### Static checks (`scripts/verify-admin-deck-regressions.mjs` style)

Add a new asserts file or extend the existing harness so the build
catches regressions:

- `ProfileModal.tsx` includes `Upload`, `Replace`, `Remove` translation
  keys and a hidden file input with the expected `accept` attribute.
- `ProfileModal.tsx` posts to the `profile-avatars` bucket at
  `<user_id>/avatar.jpg` and never to a timestamp-suffixed path.
- `ProfileModal.tsx` sets `avatar_path` and `avatar_updated_at` on the
  profile row only after a successful upload.
- `AppHeader.tsx` renders both `AvatarImage` and `AvatarFallback`.
- `PolishGlassLayout.tsx` falls back to the existing `User` icon when
  no avatar URL resolves and renders `AvatarImage` when one does.
- `useAuth.ts` selects `avatar_path` and `avatar_updated_at`.
- `lib/supabase.ts` `Profile` type includes the two new fields.

### Migration regression test

A small Node/TS script under `frontend/scripts/test-profile-avatar-rls.ts`,
matching the Phase 1E pattern, that:

- Connects with two anonymous-tier sessions.
- Asserts user A can upload `<A>/avatar.jpg`.
- Asserts user A cannot upload `<B>/avatar.jpg`.
- Asserts user A cannot upload `<A>/something-else.jpg`.
- Asserts user A cannot read `<B>/avatar.jpg`.
- Asserts user A can update only `avatar_path` and `avatar_updated_at`
  on their own profile row, and is still blocked from `role` and
  `credits`.
- Asserts the `profile-avatars` bucket is `public = false`.

This sits alongside the existing `test:phase1e:rls` harness; the same
script can be wired into `npm run test:phase1g:storage-cleanup` style
naming if desired.

### Manual smoke

Documented in the implementation report: upload, header refresh, modal
re-open, page reload, replace, remove, classic header, glassy header,
mobile.

## 11. Risks and rollout notes

### Risks

- **Server-side mime/size enforcement varies by Supabase storage version**: some
  hosted versions ignore `allowed_mime_types`. Mitigation: client always
  enforces both regardless, and the bucket settings only tighten the
  surface where supported.
- **Signed-URL TTL races**: a tab open longer than 3600 s may show a broken
  image because the URL has expired. Mitigation: the helper re-mints on
  every `[avatar_path, avatar_updated_at]` change; for very long-lived
  tabs we accept the broken image until the next mount or refresh — the
  fallback initials render again.
- **Bucket creation idempotency**: re-running the migration must not
  reset `public` to `true` on an already-private bucket. The proposed
  `on conflict do update` writes `public = false` explicitly, so reruns
  are safe.
- **Phase 1A trigger replacement**: `create or replace function` on
  `protect_profile_privileged_fields` is a hot path. Apply during low
  traffic and verify the body is byte-identical to Phase 1A except for
  the array. A test that asserts non-admin updates to `role` or
  `credits` are rejected with 42501 must run post-migration.
- **`videos` bucket pattern divergence**: this migration introduces the
  first private bucket. Other code that assumes "all buckets are
  public" (none found, but worth re-verifying) would need updating.
- **Roadmap G1 (storage cleanup queue) does not apply**: avatars are
  fixed-path overwrites, not enqueue-then-drain artefacts. We do not
  add anything to `storage_cleanup_queue` for avatars and the existing
  cleanup worker is unaffected.

### Rollout notes

- Order: migration first (manual `supabase db push` or Vercel-managed),
  then ship the frontend code. The frontend tolerates missing fields
  (selects them as null) so a gap of minutes is fine.
- No feature flag necessary. The UI degrades to the existing initials
  view when `avatar_path` is null, which is the state for every user
  on day one.
- No backfill. Existing users have `avatar_path = null` and will see
  exactly the current header until they upload.
- No interaction with credits, generation, prompts, paid APIs, or any
  worker. This is fully isolated to profile rows and a new bucket.
