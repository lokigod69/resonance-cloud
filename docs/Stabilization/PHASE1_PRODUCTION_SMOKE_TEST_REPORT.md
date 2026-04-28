# Phase 1 Production Smoke Test Report

Date: 2026-04-29

## Summary

Smoke testing is not fully passed yet.

Verified:

- Production Supabase project link is correct.
- Phase 1 migration history has been repaired.
- Production Vercel frontend is deployed from `main` commit `256a17c`.
- Production frontend bundle contains `submit_generation` and `request_word_retry`.
- Frontend source no longer directly updates `profiles.credits` for generation or retry.
- A concrete worker compatibility bug was found and fixed locally: `pre_bootstrap` was not accepted by bootstrap.

Not fully verified:

- Authenticated user UI flows.
- Production worker deployed commit.
- End-to-end generation/retry after the worker fix.

## Smoke Checklist

| Check | Result | Notes |
| --- | --- | --- |
| Login works | Not run | No production test credentials/session were provided. |
| Profile loads | Not run | Requires authenticated browser session. |
| Credits display | Not run | Requires authenticated browser session. |
| Invite redemption still works | Not run | Requires valid/throwaway invite code and authenticated session. |
| Generation with enough credits works | Blocked | Worker must be redeployed from the `pre_bootstrap` compatibility fix first. |
| Generation with insufficient credits returns clean error | Not run | Requires authenticated account with insufficient credits. |
| Credits deduct exactly once | Not run | Requires authenticated end-to-end generation test. |
| Retry failed word works | Blocked | Worker deployment status not verified. |
| Duplicate retry does not double-charge | Not run | Requires authenticated retry test. |
| Music retry works if available | Not run | Requires an eligible completed/post-video word with music retry available. |
| Normal user cannot update `profiles.credits` manually | Not run | Requires authenticated normal-user JWT or SQL test harness. |
| Normal user cannot update `profiles.role` manually | Not run | Requires authenticated normal-user JWT or SQL test harness. |
| Admin access still works | Not run | Requires admin test account/session. |

## Production Checks Actually Run

### Frontend production deployment

```powershell
vercel inspect https://frontend-mcg9a6b12-lokigod69s-projects.vercel.app --logs
```

Result:

```text
Cloning github.com/lokigod69/resonance-cloud (Branch: main, Commit: 256a17c)
Deployment completed
status Ready
```

### Production bundle RPC calls

Fetched:

```text
https://resonanz.pro/assets/index-DIDHZNmn.js
```

Result:

```text
contains_submit_generation=True
contains_request_word_retry=True
contains_profiles_dot_credits=False
```

### Anonymous protected RPC checks

Result:

```text
rpc.is_admin.http=401 permission denied for function is_admin
rpc.submit_generation.http=404
rpc.request_word_retry.http=404
rpc.redeem_invite_code.http=401
```

Interpretation:

- Anonymous callers cannot use the protected RPCs.
- This does not prove normal authenticated-user behavior.

### Worker compatibility test

Before fix:

- Phase 1B SQL inserts words with `current_stage = 'pre_bootstrap'`.
- Worker bootstrap only accepted `pending`.

Fix:

- Accept `pre_bootstrap` and `pending` as bootstrap prior states.
- Map `pre_bootstrap` to status `pending`.

Test:

```powershell
.venv\Scripts\python.exe -m pytest tests/test_orchestration_feeder.py tests/test_orchestration_state.py tests/test_phase1b_atomic_generation_retry.py
```

Result:

```text
43 passed in 0.16s
```

## Required Production Smoke After Worker Redeploy

After deploying the worker from the fixed main commit:

1. Login as a normal test user.
2. Confirm profile and credits load.
3. If a disposable code exists, redeem it once and confirm credits increment through `redeem_invite_code`.
4. Submit generation with enough credits.
5. Confirm one `generation_jobs` row is created.
6. Confirm inserted words move from `pre_bootstrap` through bootstrap and into normal processing.
7. Confirm credits are deducted exactly once.
8. Submit generation with insufficient credits and confirm a clean error with no deck/job/word side effects.
9. Retry one failed word and confirm exactly one credit debit.
10. Double-click retry or repeat the same retry request and confirm it does not double-charge.
11. If music retry is available, retry a completed/post-video word and confirm exactly one credit debit.
12. Confirm a normal user cannot update `profiles.credits` or `profiles.role` manually.
13. Confirm admin pages still load for an admin account.

## Conclusion

Phase 1 is not ready to move to the next stabilization phase until the worker is deployed from commit `256a17c` or later and the authenticated generation/retry smoke tests pass.
