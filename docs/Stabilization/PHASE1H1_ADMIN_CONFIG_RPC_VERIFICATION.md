# Phase 1H.1 Admin Config RPC Verification

Date: 2026-05-10

## Red Test

`npm run test:phase1h1:admin-config`

Observed pre-implementation failure:

PostgREST returned `PGRST202` because `public.admin_set_word_review_flag` did not exist. This confirmed the new test was exercising missing Phase 1H.1 behavior before implementation.

## Expected Coverage

`frontend/scripts/test-phase1h1-admin-config-rpcs.ts` supports two rollout modes.

RPC-only mode:

```bash
npm run test:phase1h1:admin-config
```

Guard mode:

```bash
npm run test:phase1h1:admin-config:guards
```

RPC-only mode covers:

- non-admin cannot call `admin_set_word_review_flag`
- admin can set `words.needs_review`
- audit row exists for review flag update
- non-admin cannot call language profile RPCs
- admin can create/update/activate/delete language profiles
- activation deactivates other active profiles for the same language
- language profile audit rows exist
- non-admin cannot call voice RPCs
- admin can create/update/delete voices
- voice audit rows exist
- quota enforcement remains false

Guard mode adds:

- direct admin/browser-style `words.needs_review` update is blocked
- direct admin/browser-style language profile writes are blocked
- direct admin/browser-style voice writes are blocked

## Live Application Status

Not applied from this shell. The linked Supabase pooler URL requires a database password, and no direct SQL execution credential is available in local env or `frontend/supabase/.temp`.

Live probes now pass for both RPC mode and guard mode, so the SQL appears to have been applied outside this shell. `supabase migration list --linked` still shows both `20260510110000` and `20260510120000` as local-only.

Do not run `supabase migration repair` for `20260510110000` or `20260510120000` unless you intentionally choose to record the already-applied live SQL in migration history.

## Required Final Verification After Applying SQL

Run from `frontend/`:

```bash
npm run build
npm run typecheck:api
npm run test:api:paid
npm run test:regressions
npm run test:phase1e:rls
npm run test:phase1f0:credits
npm run test:phase1f:admin
npm run test:phase1g:storage-cleanup
npm run test:phase1h1:admin-config
npm run test:phase1h1:admin-config:guards
npx eslint src/pages/admin/Content.tsx src/pages/admin/Profiles.tsx src/pages/admin/Voices.tsx scripts/test-phase1h1-admin-config-rpcs.ts
git diff --check
```

No paid providers are called by these tests.

## Checks Run In This Shell

Passed:

- `npm run build`
- `npm run typecheck:api`
- `npx eslint src/pages/admin/Content.tsx src/pages/admin/Profiles.tsx src/pages/admin/Voices.tsx scripts/test-phase1h1-admin-config-rpcs.ts`
- `git diff --check`
- `npm run test:api:paid`
- `npm run test:regressions`
- `npm run test:phase1g:storage-cleanup`

Phase 1H.1 live probes:

- `npm run test:phase1h1:admin-config` passed after the RPCs appeared live.
- `npm run test:phase1h1:admin-config:guards` passed after the guard triggers appeared live.

Previously stale test drift fixed locally:

- `test-phase1e-rpc-rls.ts` now includes required `words.original_input` in word fixtures.
- `test-phase1f-admin-rpcs.ts` now includes required `words.original_input` in word fixtures.
- `test-phase1f0-credit-pricing.ts` now uses the current lane-based `computeCreditCost` API and still verifies video = 10 credits/word and standard card = 1 credit/word.
