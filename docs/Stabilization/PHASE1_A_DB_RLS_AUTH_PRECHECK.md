# Phase 1A DB/RLS/Auth Precheck

Date: 2026-04-28

## Git State

- Branch: `stabilization/phase1-db-rls-auth`
- Starting state: repository was on detached `HEAD`; a new branch was created without resetting or discarding existing work.
- Status summary after branch creation:
  - Existing modified files not owned by this pass: `frontend/src/components/generate/submitGeneration.ts`, `src/orchestration/feeder.py`, `tests/test_orchestration_feeder.py`.
  - Existing untracked files/folders include `.superpowers/`, several investigation reports, `docs/Stabilization/`, character assets, `frontend/supabase/migrations/20260428090000_pre_bootstrap_stage.sql`, and validation outputs.
- Handling: this pass will not revert or overwrite those existing changes.

## Canonical Migration Folder

Canonical app migration folder appears to be:

`frontend/supabase/migrations`

Evidence:

- It contains the main application schema history for `profiles`, `decks`, `words`, `generation_jobs`, `admin_roles`, invite codes, pipeline state, and RPCs.
- `frontend/supabase/.temp` exists, indicating Supabase CLI/project state under the frontend app.
- The parent workspace also has `../supabase/migrations`, but it only contains isolated study/cost-tracking migrations and does not contain the main app schema objects.

Uncertainty:

- `frontend/supabase` does not currently include a visible `config.toml`; only `.temp` and `migrations` were present during inspection.
- `frontend/supabase/migrations/20260428090000_pre_bootstrap_stage.sql` was already untracked before this pass and was not edited.

## Current Migration Object Check

Found in current canonical migrations:

- `profiles`: referenced and extended in `20260322210000_phase2a_tables.sql`, `20260324000000_schema_fixes.sql`, and `20260329100000_phase1_foundation.sql`.
- `admin_roles`: created in `20260416004500_admin_roles_rls_fix.sql`.
- `invite_codes`: created in `20260329100000_phase1_foundation.sql`.
- `invite_code_redemptions`: created in `20260329100000_phase1_foundation.sql`.
- `redeem_invite_code`: created in `20260329100000_phase1_foundation.sql`.
- `is_admin`: initially profile-role based in `20260322210000_phase2a_tables.sql`, then moved to `admin_roles` in `20260416004500_admin_roles_rls_fix.sql`.
- `refund_credit`: created in `20260322210000_phase2a_tables.sql`.

## Confirmed Risks

- `profiles` has a broad user self-update policy: `"Users can update own profile" FOR UPDATE USING (id = auth.uid())`.
- `profiles.role` changes currently trigger `sync_admin_role_from_profile`, which can mirror `profiles.role = 'admin'` into `admin_roles`.
- `profiles.credits` is directly writable by current profile update permissions.
- `invite_codes` has `"Authenticated users can read codes"`, allowing ordinary authenticated users to list/read invite codes.
- `redeem_invite_code` is `SECURITY DEFINER` but lacks explicit `search_path`, explicit execute grants, and row locking around `max_uses`.
- `refund_credit` is `SECURITY DEFINER` and lacked explicit execute revokes/grants in the inspected migrations.

## Invite-Code Frontend Fallback Logic

Fallback code still existed in:

- `frontend/src/components/RedeemCodeDialog.tsx`
- `frontend/src/pages/Onboarding.tsx`

Both files tried `supabase.rpc('redeem_invite_code', ...)` first, then fell back to direct `invite_codes` reads/updates and direct `profiles.credits` updates.

## Frontend Auth/Admin Dependencies

- `frontend/src/hooks/useAuth.ts` loads `display_name`, `credits`, `base_language`, and `role` from `profiles`.
- `frontend/src/components/AdminRoute.tsx` uses `supabase.rpc('is_admin')` for route authorization.
- Layout/admin navigation visibility still uses `profile?.role === 'admin'` in:
  - `frontend/src/components/layout/AppHeader.tsx`
  - `frontend/src/components/layout/AppSidebar.tsx`
  - `frontend/src/components/layout/PolishGlassLayout.tsx`
- Admin user management still updates `profiles.role` and `profiles.credits` directly in `frontend/src/pages/admin/Users.tsx`; this depends on admin RLS/trigger approval rather than normal user permissions.

Conclusion: security authority should be `admin_roles` via `is_admin()`. `profiles.role` remains a compatibility/display mirror and must not be user-editable.

## Generation/Retry Policy Follow-Up

The following broad policies remain intentionally unchanged in this pass:

- `words`: `"Users update own words"` allows owners to update broad worker-owned fields.
- `generation_jobs`: `"Users and admin update jobs"` allows owners to update broad job fields.
- `decks`: `"Users update own decks"` allows owner status/word count changes used by current generation/retry flows.

Frontend dependencies that would break if these were broadly locked without replacement RPCs:

- `frontend/src/components/generate/submitGeneration.ts`: inserts words/jobs, updates deck status/word count, and debits credits.
- `frontend/src/pages/DeckView.tsx` and `frontend/src/pages/DeckViewPG.tsx`: set retry flags, update deck status, and debit/rollback credits.
- `frontend/src/pages/Music.tsx`: sets retry flags for music-related retry flow.
- `frontend/src/hooks/useMoveWords.ts`: moves words between decks and recomputes deck counts/status.

These should be replaced in the next phase with atomic generation/retry/move RPCs before tightening pipeline-field RLS.
