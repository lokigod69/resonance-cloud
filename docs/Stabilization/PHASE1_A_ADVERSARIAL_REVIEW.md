# Phase 1A Adversarial Review

Date: 2026-04-29

## Scope

Reviewed `frontend/supabase/migrations/20260428120000_phase1a_db_rls_auth_hardening.sql` and the Phase 1A invite-code frontend cleanup now present on `main`.

## Findings

| Question | Result | Notes |
|---|---|---|
| Can normal users still update safe profile fields? | Yes by design | The trigger allows own-profile updates for `display_name`, `base_language`, `theme`, `skin`, onboarding fields, and `updated_at`. |
| Can normal users update `profiles.role`? | Expected no | `role` is not in the safe update list, so `protect_profile_privileged_fields()` rejects it for untrusted users. |
| Can normal users update `profiles.credits`? | Expected no | `credits` is not in the safe update list, so direct client credit edits are rejected. |
| Can normal users insert/update/delete `admin_roles`? | Expected no | Admin role writes require `public.is_admin()`. Normal users do not satisfy it. |
| Is `admin_roles` the real admin authority? | Yes | `public.is_admin()` checks only `public.admin_roles`. |
| Does `is_admin()` ignore user-editable profile fields? | Yes | It does not read `profiles.role`. |
| Does `redeem_invite_code` work atomically? | Yes by design | It locks the invite-code row, checks duplicate/max use, inserts redemption, and credits the user in one transaction. |
| Can normal users read `invite_codes`? | Expected no | The authenticated read policy is dropped; only admin management remains. |
| Does `refund_credit` still work for service role? | Yes by design | Execute is granted to `service_role`; ordinary authenticated users are revoked. |
| Is `app.allow_profile_privileged_update` impossible for normal users to abuse? | Expected yes through Supabase client APIs | The setting is only set inside trusted `SECURITY DEFINER` functions. Normal browser clients cannot set arbitrary transaction-local Postgres settings through table APIs. |
| Does Phase 1A alone break old generation credit deduction? | Yes | Old generation/retry flows directly updated `profiles.credits`. Phase 1B is required before Phase 1A is production-safe. |

## Review Conclusion

Phase 1A is directionally correct but should be applied together with Phase 1B. Applying Phase 1A alone is expected to break old browser-side generation/retry credit debits.

Do not broadly lock `decks`, `words`, or `generation_jobs` yet. Those policies still support existing move/delete/rating/admin/worker-adjacent flows and need a separate follow-up pass.
