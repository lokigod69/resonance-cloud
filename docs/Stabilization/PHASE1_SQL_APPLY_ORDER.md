# Phase 1 SQL Apply Order

Date: 2026-04-29

Run these from the canonical Supabase folder:

```powershell
cd D:\CODING\ResonanceTEST\orchestrator\frontend
```

If using the current `main` worktree from this pass, the equivalent path is:

```powershell
cd D:\CODING\ResonanceTEST\watery-main\frontend
```

## Required Order

| Order | Migration | Required Before Production Testing | Purpose |
|---:|---|---|---|
| 1 | `frontend/supabase/migrations/20260428090000_pre_bootstrap_stage.sql` | Yes, if not already applied | Adds `pre_bootstrap`, the stage written by Phase 1B submit before worker bootstrap exposes words as pending. |
| 2 | `frontend/supabase/migrations/20260428120000_phase1a_db_rls_auth_hardening.sql` | Yes | Hardens profile role/credit, admin authority, invite-code visibility, invite redemption, and refund grants. |
| 3 | `frontend/supabase/migrations/20260428130000_phase1b_atomic_generation_retry.sql` | Yes | Adds `submit_generation` and `request_word_retry` RPCs that replace browser-side credit mutation. |

## Commands

Review the dry run first:

```powershell
supabase db push --dry-run
```

If the dry run is correct and you are intentionally applying to the selected Supabase project:

```powershell
supabase db push
```

## Notes

- Do not apply production SQL from automation unless explicitly requested.
- Phase 1A should not be applied without Phase 1B.
- Phase 1B depends on `pre_bootstrap` because `submit_generation` writes new words with `current_stage = 'pre_bootstrap'`.
