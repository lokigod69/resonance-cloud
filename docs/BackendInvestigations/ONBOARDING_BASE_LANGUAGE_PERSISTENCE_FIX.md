# Onboarding Base Language Persistence Fix

Date: 2026-05-06

## Issue

`frontend/src/pages/Onboarding.tsx` updated `public.profiles.base_language` but only logged Supabase errors before continuing to the invite-code step. A new user could choose a non-English base language, the database could remain `English`, and onboarding would still appear successful.

That stale profile value later caused lyrics translation to skip with `target_equals_base` when generated lyrics were also English.

## Fix

Onboarding now uses the same verified update/readback pattern as ProfileModal:

```ts
supabase
  .from('profiles')
  .update({ base_language: selectedLanguage })
  .eq('id', user.id)
  .select('base_language')
  .single()
```

Onboarding treats these as failures:

- Supabase update error
- no returned row
- returned `base_language` does not match the selected language
- thrown exception

On failure it keeps the user on step 1, shows a visible error, clears saving state, and does not write `resonance_onboarding_done`.

On success it refreshes the profile and only then advances to step 2.

## Settings Follow-Up

`frontend/src/pages/Settings.tsx` now uses `t('profile.saveFailed')` instead of hardcoded English error copy.

## SQL

No SQL migration was required. The existing profile trigger already allows `base_language` as a safe profile preference and continues to block privileged fields like `role` and `credits`.

## Verification

After onboarding or changing profile language, verify:

```sql
select id, email, base_language
from public.profiles
where id = '<USER_ID>';
```

For the lyrics translation path, generate a fresh song and verify:

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
