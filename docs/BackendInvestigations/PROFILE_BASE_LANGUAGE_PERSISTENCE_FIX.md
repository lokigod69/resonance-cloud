# Profile Base Language Persistence Fix

Date: 2026-05-06

## Root Cause

The profile UI optimistically changed the local Base Language / Muttersprache selector and showed `Saved` after calling:

```ts
supabase.from('profiles').update({ base_language: value }).eq('id', user.id)
```

It did not inspect the Supabase update result. If RLS, the hardening trigger, the session, or a no-row update prevented persistence, the UI could still show a successful save while `public.profiles.base_language` remained `English`.

That stale DB value was then read by the backend music worker. For English generated lyrics, the worker saw source language `English` and target/base language `English`, so translation correctly skipped with `target_equals_base`.

## DB Safety Check

No SQL migration was required for this fix.

The active profile hardening trigger in:

`frontend/supabase/migrations/20260504010000_profile_avatar_phase1f_trigger_fix.sql`

keeps `base_language` in `v_safe_update_columns`, while privileged fields such as `role` and `credits` are not user-safe. Existing RLS also allows authenticated users to update their own profile row with `id = auth.uid()`.

## Code Changes

- `frontend/src/components/ProfileModal.tsx`
  - Base language save now checks `update.error`.
  - The update reads back `base_language` with `.select('base_language').single()`.
  - Success is shown only when the returned DB value matches the requested value.
  - Failed saves revert the local selector to the current profile value and show an error.

- `frontend/src/pages/Settings.tsx`
  - Same verified persistence behavior for the Settings page Base Language selector.

- `frontend/src/lib/translations.ts`
  - Added `profile.saveFailed` copy for the profile modal.

- `tests/test_profile_base_language_persistence.py`
  - Locks the verified update flow.
  - Confirms `base_language` remains safe-editable in the profile trigger.
  - Confirms `role` and `credits` remain protected.
  - Confirms `refreshProfile()` forces a Supabase refetch and updates the local cache.

## Verification SQL

After changing Base Language in the profile modal:

```sql
select id, email, base_language
from public.profiles
where id = '<USER_ID>';
```

Expected: `base_language` changes to the selected value, for example `German` or `French`.

Then generate a fresh song and verify:

```sql
select
  w.word,
  p.base_language,
  ml.language,
  ml.translation_language,
  ml.translation_status,
  ml.translation_error,
  left(ml.translated_lyrics, 120) as translated
from public.music_lyrics ml
join public.words w on w.id = ml.word_id
join public.profiles p on p.id = ml.user_id
order by ml.created_at desc
limit 10;
```

Expected for English source lyrics and French base language:

- `p.base_language = French`
- `ml.language = English`
- `ml.translation_language = French`
- `translation_status` is `ok` or a provider-side `failed`
- `translation_error` is not `target_equals_base`

## Deployment

Redeploy the frontend after this commit. No new environment variables or SQL migration are needed.
