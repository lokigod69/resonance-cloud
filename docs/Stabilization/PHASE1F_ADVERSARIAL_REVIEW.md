# Phase 1F Adversarial Review

Date: 2026-05-04

Scope: live verification of Phase 1F audited admin command RPCs after commit `631562c94ba85688db11dd501b7e3fe64d92694f`. Current `main` HEAD is `211b564c03fa7c94acdd2f6eef713ed4d3927f43`; the Phase 1F commit is an ancestor of HEAD.

## Result

No Phase 1F blocker found.

Quota enforcement remains monitor-only/off. No broad `supabase db push` was run. No old Phase SQL was rerun. `npm run test:api:paid` uses mocked fetch/provider hosts from `frontend/scripts/test-paid-api-protection.ts`; no real paid provider call was made.

## Migration State

Command:

```powershell
supabase migration list --linked
```

Confirmed Local and Remote:

- `20260503010000_phase1f0_credit_pricing_canonical.sql`
- `20260503020000_phase1f_admin_command_rpcs.sql`

Unrelated local-only migrations observed and not applied:

- `20260404000000_suno_retry_job_type.sql`
- `20260406200000_speak_history.sql`
- `20260406210000_shared_words.sql`
- `20260407000000_speak_character.sql`
- `20260408000000_speak_history_user_delete.sql`
- `20260409000000_speak_corrections.sql`
- `20260409100000_speak_roleplay.sql`
- `20260416004500_admin_roles_rls_fix.sql`
- `20260418000000_voice_samples_table.sql`
- `20260418000100_gemini_speak_columns.sql`
- `20260418_pipeline_state.sql`
- `20260418_transition_rpc.sql`
- `20260420000000_gemini_accents.sql`
- `20260420191500_queue_position_rpc.sql`
- `20260420_current_stage_default.sql`
- `20260421000000_pipeline_events.sql`
- `20260422000000_pipeline_events_fk_set_null.sql`
- `20260423000000_grok_speak_columns.sql`
- `20260429090000_per_job_word_ownership.sql`
- `20260501000000_document_existing_enrichment_columns.sql`
- `20260501010000_document_bridge_visual_mnemonic_columns.sql`
- `20260501020000_document_pending_image_stage.sql`
- `20260501030000_document_deck_type_column.sql`
- `20260502000000_add_words_error_message.sql`
- `20260503000000_get_user_words_for_language.sql`
- `20260503030000_gpt_image_2_enrichment_columns.sql`
- `20260503120000_gpt_image_2_card_pricing.sql`

## Admin RPC Security

`npm run test:phase1f:admin` passed and verified:

- non-admin users cannot call the Phase 1F admin RPCs:
  `admin_adjust_user_credits`, `admin_set_user_role`, `admin_create_invite_code`, `admin_toggle_invite_code`, `admin_update_system_setting`, `admin_approve_generation_job`, `admin_reject_generation_job`, and `admin_archive_content`
- admin users can call each valid RPC
- quota enforcement remains off
- `admin_archive_content` queues storage cleanup instead of deleting storage directly

Additional live direct-mutation probe passed. Authenticated admin browser-style writes were blocked with `403`, and service-role reads confirmed rows stayed unchanged:

- `profiles.credits`
- `profiles.role`
- `admin_roles`
- `invite_codes`
- `system_settings`
- `generation_jobs.status`
- direct `words` delete
- direct `decks` delete

## Refund Correctness

Additional live refund/audit probe passed:

- reject with refund used `generation_jobs.credits_charged`
- repeat reject/refund returned `refund_amount: 0` and did not credit again
- reject without refund did not credit the user
- `admin_audit_events` recorded actor, reason, target job, original status, refund amount, refund request, and refunded flag

## Frontend Check

Static inspection:

- `frontend/src/pages/admin/Queue.tsx`
  - uses `admin_update_system_setting`, `admin_approve_generation_job`, and `admin_reject_generation_job`
  - does not compute browser-side refund amount from profile credits
  - displays `credits_charged` in queue rows and expanded job details
- `frontend/src/pages/admin/Users.tsx`
  - uses `admin_adjust_user_credits`, `admin_set_user_role`, `admin_create_invite_code`, and `admin_toggle_invite_code`
  - no direct `profiles.role` or `profiles.credits` update path remains
- `frontend/src/pages/admin/Content.tsx`
  - uses `admin_archive_content`
  - no direct `supabase.storage.from(...).remove`, `words.delete`, `decks.delete`, or `generation_jobs.delete` path remains

## Verification Commands

Passed:

```powershell
npm run test:phase1f:admin
npm run test:phase1f0:credits
npm run test:phase1e:rls
npm run test:api:paid
npm run typecheck:api
```

Deferred until after Phase 1G document/implementation edits:

```powershell
git diff --check
targeted ESLint if files are touched
```
