# Guided Today STT Dedicated Quota Action

## Verdict

Pass with implementation. `/api/guided-transcribe` now consumes a dedicated `guided_transcribe` quota action instead of sharing `voice_chat`.

Quota enforcement was intentionally left off. The live `public.api_quota_settings.enforcement_enabled` value remains `false`.

## Why This Was Added

Guided Today speech-to-text was previously recorded under `voice_chat`. That protected the endpoint once global enforcement is enabled, but it made STT usage indistinguishable from spoken conversation usage in quota monitoring and incident review.

The new `guided_transcribe` action gives Guided Today STT separate monitoring, tuning, admin display, and future enforcement control while preserving the same initial limits as `voice_chat`.

## Limits

The dedicated action uses these Phase 1C limits:

| action | per_minute | per_day | hard_max_per_minute | hard_max_per_day |
| --- | ---: | ---: | ---: | ---: |
| guided_transcribe | 6 | 120 | 15 | 500 |

## Endpoint Change

`frontend/api/guided-transcribe.ts` now calls:

```ts
await consumeApiQuota(user.id, 'guided_transcribe')
```

The endpoint behavior remains otherwise unchanged:

- Request body validation happens before auth/quota/provider work.
- Supabase auth is required.
- Quota is consumed before the Groq Whisper STT provider call.
- Over-quota responses return before the provider call when enforcement is enabled.
- The response remains only `{ transcript }`.
- No LLM, TTS, corrections, conversations, or persistence were added.

## Migration

Added migration:

`frontend/supabase/migrations/20260516010000_guided_transcribe_quota_action.sql`

The migration is idempotent. It updates the quota action check constraints for `api_quota_config` and `api_quota_usage`, then inserts or updates the `guided_transcribe` config row.

It does not call `public.set_api_quota_enforcement(true)` and does not otherwise change global enforcement.

## Admin Visibility

`frontend/src/pages/admin/Quotas.tsx` now includes `guided_transcribe` in the fixed quota action list with display label:

`Guided Today STT`

The admin quota snapshot can therefore show Guided Today STT separately from `voice_chat` once usage exists.

## Live Verification

The migration was applied to the linked live Supabase project as a direct SQL patch because `supabase db push` would attempt unrelated pending local migrations.

Verification SQL:

```sql
select action, per_minute, per_day, hard_max_per_minute, hard_max_per_day
from public.api_quota_config
where action = 'guided_transcribe';

select id, enforcement_enabled, updated_at, updated_by
from public.api_quota_settings;

select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conname in ('api_quota_config_action_check', 'api_quota_usage_action_check')
order by conname;
```

Live result:

- `guided_transcribe` exists with limits `6 / 120 / 15 / 500`.
- `api_quota_config_action_check` allows `voice_chat`, `guided_transcribe`, `suggest_words`, and `grok_token`.
- `api_quota_usage_action_check` allows `voice_chat`, `guided_transcribe`, `suggest_words`, and `grok_token`.
- `api_quota_settings.enforcement_enabled = false`.

## Tests Added

`frontend/scripts/test-paid-api-protection.ts` now verifies:

- `/api/guided-transcribe` consumes `guided_transcribe`, not `voice_chat`.
- Invalid guided-transcribe bodies reject before auth/quota/provider.
- Successful mocked guided-transcribe requests consume quota before the provider call.
- Mocked over-quota `guided_transcribe` returns `429` before any provider call.
- Existing `voice_chat`, `suggest_words`, and `grok_token` quota actions still pass.

## Checks Run

Passed:

- `npm run typecheck:api`
- `npx tsx scripts/test-paid-api-protection.ts`
- `npx tsx scripts/test-guided-speech-check.ts`
- `npx tsx scripts/test-guided-today-data.ts`
- `npm run build`
- `npx eslint api/guided-transcribe.ts api/_shared/quota.ts src/pages/admin/Quotas.tsx scripts/test-paid-api-protection.ts`
- `git diff --check`
- `git diff --cached --check`

## When To Enable Enforcement Later

Enable enforcement only in a separate, explicit operations pass after manual STT smoke testing and admin monitoring review. The required command is intentionally not part of this change.

Before enabling enforcement later:

- Confirm Guided Today STT traffic is appearing under `guided_transcribe`.
- Confirm the limits are acceptable for expected manual and classroom use.
- Confirm admin users can see quota usage and denied events clearly.
- Run a mocked or staging over-quota test with enforcement enabled outside production, if possible.
