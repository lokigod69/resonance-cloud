# Phase 1F Admin RPC Verification

Date: 2026-05-03

## Migration History

`supabase migration list --linked` was run after applying and repairing the Phase 1F migration.

Confirmed aligned:

- `20260503010000` Local and Remote
- `20260503020000` Local and Remote

Unrelated local-only migrations remain unresolved and were not applied. No broad `supabase db push` was run.

## Live Quota Setting

Verified through Supabase REST with the service role key:

- `public.api_quota_settings.enforcement_enabled = false`

Quota enforcement remains monitor-only/off.

## Focused Phase 1F Test

Command:

```powershell
npm run test:phase1f:admin
```

Result:

```text
Phase 1F admin RPC tests passed
```

Coverage included:

- non-admin denial for admin RPCs
- audited admin credit adjustment
- negative credit prevention
- audited role changes
- last-admin protection
- invite code create/toggle audit
- system setting update audit
- queue approve through RPC
- reject without refund
- reject with refund exactly equal to `generation_jobs.credits_charged`
- repeated reject/refund does not double-refund
- content delete/archive queues storage cleanup
- browser admin queue no longer directly writes `profiles.credits`
- browser admin queue no longer directly writes `generation_jobs.status`
- browser admin users page no longer directly writes `profiles.role` or `profiles.credits`
- browser admin content page no longer directly removes storage or deletes content rows
- quota enforcement remains off

## Final Check Set

Commands run:

```powershell
npm run build
npm run typecheck:api
npm run test:api:paid
npm run test:regressions
npm run test:phase1e:rls
npm run test:phase1f0:credits
npm run test:phase1f:admin
npx eslint src/pages/admin/Queue.tsx src/pages/admin/Users.tsx src/pages/admin/Content.tsx scripts/test-phase1f-admin-rpcs.ts scripts/test-paid-api-protection.ts
git diff --check
```

Results:

- build passed with existing Vite chunk/dynamic import warnings
- API typecheck passed
- paid API protection passed with mocked provider responses
- admin/deck regressions passed
- Phase 1E RPC/RLS tests passed
- Phase 1F.0 credit pricing tests passed
- Phase 1F admin RPC tests passed
- targeted ESLint passed
- `git diff --check` passed

`test:api:paid` is the repository's paid-provider protection test and uses mocked/fake-provider checks; no paid provider calls were made by Phase 1F.

## Residual Risks

- The content RPC currently deletes rows and queues cleanup instead of physically removing storage objects in the browser. A separate cleanup worker remains required.
- The admin UI currently supplies fixed reason strings. The RPC layer records reasons, but richer operator-entered reason prompts remain a follow-up.
- Several unrelated local-only migrations remain in the repository; future migration work must continue avoiding broad `db push` until that history is reconciled.
