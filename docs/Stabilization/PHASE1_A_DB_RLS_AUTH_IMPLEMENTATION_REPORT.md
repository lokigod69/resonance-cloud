# Phase 1A DB/RLS/Auth Implementation Report

Date: 2026-04-28

## Files Changed By This Pass

- `docs/Stabilization/PHASE1_A_DB_RLS_AUTH_PRECHECK.md`
- `docs/Stabilization/PRODUCTION_BOUNDARY.md`
- `docs/Stabilization/PHASE1_A_DB_RLS_AUTH_SQL_VERIFICATION.md`
- `docs/Stabilization/PHASE1_A_DB_RLS_AUTH_IMPLEMENTATION_REPORT.md`
- `frontend/supabase/migrations/20260428120000_phase1a_db_rls_auth_hardening.sql`
- `frontend/src/components/RedeemCodeDialog.tsx`
- `frontend/src/pages/Onboarding.tsx`

Pre-existing modified files not owned by this pass remained untouched:

- `frontend/src/components/generate/submitGeneration.ts`
- `src/orchestration/feeder.py`
- `tests/test_orchestration_feeder.py`

## Migration Added

`frontend/supabase/migrations/20260428120000_phase1a_db_rls_auth_hardening.sql`

This is in the verified canonical migration folder: `frontend/supabase/migrations`.

## Policies and Functions Changed

- Replaced `public.is_admin()` so it uses `public.admin_roles` with `SECURITY DEFINER SET search_path = public`.
- Documented `admin_roles` as the admin authority and `profiles.role` as a compatibility mirror.
- Added admin management policy for `admin_roles`; non-admins still cannot insert/update/delete admin roles.
- Added `public.protect_profile_privileged_fields()` trigger:
  - Non-admin users can update only safe profile preference fields: `display_name`, `base_language`, `theme`, `skin`, onboarding fields, and `updated_at`.
  - Non-admin users cannot update `profiles.role`, `profiles.credits`, or other non-safe profile fields.
  - Trusted server/admin paths can update privileged fields.
- Replaced profile update/insert policies with own-profile checks and admin checks.
- Recreated `public.handle_new_user()` with `SECURITY DEFINER SET search_path = public` and a trusted local update marker so signup profile creation still works.
- Recreated `public.refund_credit(uuid)` with `SECURITY DEFINER SET search_path = public`, a service/trusted-path check, and explicit execute grants only to `service_role`.
- Removed authenticated direct read policy on `invite_codes`.
- Replaced invite-code policies with admin-only management.
- Recreated `public.redeem_invite_code(text)` with:
  - `SECURITY DEFINER SET search_path = public`
  - authenticated-user requirement
  - row lock on the invite code row
  - duplicate redemption check
  - serialized `max_uses` check
  - trusted credit update path
- Added explicit execute grants:
  - `is_admin()` to `authenticated`, `service_role`
  - `redeem_invite_code(text)` to `authenticated`
  - `refund_credit(uuid)` to `service_role` only

## Frontend Fallback Code Removed

Removed legacy fallback logic from:

- `frontend/src/components/RedeemCodeDialog.tsx`
- `frontend/src/pages/Onboarding.tsx`

Both now use only:

```ts
supabase.rpc('redeem_invite_code', { code_text: code })
```

RPC failures now show an error; the browser no longer reads `invite_codes` or directly updates `profiles.credits` for invite redemption.

## Generation/Retry Scope

This pass did not lock broad `words`, `decks`, or `generation_jobs` update policies because current generation/retry flows still depend on direct table writes.

Documented follow-up dependencies in `PHASE1_A_DB_RLS_AUTH_PRECHECK.md`:

- `frontend/src/components/generate/submitGeneration.ts`
- `frontend/src/pages/DeckView.tsx`
- `frontend/src/pages/DeckViewPG.tsx`
- `frontend/src/pages/Music.tsx`
- `frontend/src/hooks/useMoveWords.ts`

## Tests and Checks Run

- `npm run build` in `frontend`: passed.
  - Existing Vite warnings remained: dynamic import chunk warning and chunk-size warning.
- `npx eslint src/components/RedeemCodeDialog.tsx src/pages/Onboarding.tsx`: passed.
- `git diff --check`: passed.
- Invite fallback scan against the two changed frontend files: no `invite_codes`, `redeemed_by`, legacy fallback, or `profiles.credits` update remained.
- `supabase --version`: available, version `2.53.6`.
- `supabase db lint --local`: not completed because no local Supabase Postgres was running at `127.0.0.1:54322`.

Additional check:

- `npm run lint` repo-wide was run and failed on pre-existing unrelated lint issues: 104 errors and 17 warnings across many files. The changed frontend files pass targeted lint.

## Not Run

- No production migrations were applied.
- No production Supabase checks were run.
- No paid provider calls were run.
- No live job runner or GPU worker was run.
- No local SQL/RLS execution test was run because local Supabase Postgres was not running.

## Remaining Risks

- Existing `admin_roles` rows should be audited before private beta. If a user self-promoted before this migration, that row may already exist.
- The parent workspace `../supabase/migrations/20260416000002_cost_rls_admin_read.sql` still references `profiles.role = 'admin'`, but it is outside the verified canonical app migration folder for this pass.
- Broad pipeline policies on `words`, `decks`, and `generation_jobs` remain intentionally open until atomic generation/retry/move RPCs replace direct frontend table writes.
- SQL verification is documented but not executed locally in this pass due missing local Supabase DB.
- Direct admin UI updates to `profiles.role` and `profiles.credits` remain supported for admins through RLS plus trigger authorization; ordinary users are blocked.

## Next Recommended Phase

Implement the atomic generation/retry command phase:

- Add `submit_generation` RPC/API command for deck/word/job creation plus credit debit in one transaction.
- Add `request_word_retry` RPC/API command for retry flagging plus credit debit in one transaction.
- Update generation and retry frontend flows to use those commands.
- Then tighten `words`, `decks`, `generation_jobs`, and worker-owned pipeline fields without breaking current submission/retry behavior.
