# Phase 1H.1 Migration Drift Plan

Date: 2026-05-10
Branch: `main`
HEAD at inventory: `7a6d1c68063128dd6bdbbafc4363634cf553bdda`

## Current Migration Status

`supabase migration list --linked` was run from `frontend/`.

Phase 1F.0 and Phase 1F are aligned:

| Migration | Local | Remote | Status |
|---|---:|---:|---|
| `20260503010000_phase1f0_credit_pricing_canonical.sql` | yes | yes | aligned |
| `20260503020000_phase1f_admin_command_rpcs.sql` | yes | yes | aligned |

GPT Image-2/card and later work remains local-only in migration history:

| Migration | Status |
|---|---|
| `20260503030000_gpt_image_2_enrichment_columns.sql` | local-only in history; live schema previously observed with these columns |
| `20260503120000_gpt_image_2_card_pricing.sql` | local-only |
| `20260505000000_canvas_study_mode.sql` | local-only |
| `20260509030000_pronunciation_audio_v1.sql` | local-only |
| `20260509101721_word_input_audit.sql` | local-only |
| `20260510101944_profile_seen_tutorials.sql` | local-only |
| `20260510110000_phase1h1_admin_config_rpcs.sql` | new Phase 1H.1 RPC-only local migration; live probes pass, but migration history is not repaired |
| `20260510120000_phase1h1_admin_config_guards.sql` | new Phase 1H.1 guard-only local migration; live probes pass, but migration history is not repaired |

There are no remote-only migrations in the CLI output.

## Warning

Broad `supabase db push` remains unsafe. The remote project has many gaps relative to the local migration directory. Pushing all pending local migrations could reapply stale, superseded, or already-manual schema changes and overwrite current function definitions.

Until this list is resolved, only targeted SQL reviewed for the current phase should be applied.

## Local-Only Migration Classification

| Migration | Classification | Recommended action | Risk if broad-pushed |
|---|---|---|---|
| `20260404000000_suno_retry_job_type.sql` | unknown / needs investigation | Compare live `generation_jobs.job_type` constraints and Suno retry behavior; supersede if already present. | May alter old job type assumptions. |
| `20260406200000_speak_history.sql` | unknown / needs investigation | Confirm live speak tables before deciding whether to repair or supersede. | Could conflict with later speak table shape. |
| `20260406210000_shared_words.sql` | already-live/manual likely | Shared-word RPCs exist live; repair only after exact object comparison. | Could regress later Phase 1E share hardening. |
| `20260407000000_speak_character.sql` | unknown / needs investigation | Compare live speak schema and current API usage. | Could add stale columns or policies. |
| `20260408000000_speak_history_user_delete.sql` | unknown / needs investigation | Verify live policy state; supersede if needed. | Could weaken or duplicate RLS policies. |
| `20260409000000_speak_corrections.sql` | unknown / needs investigation | Compare API contract and live columns. | Could add stale fields used differently now. |
| `20260409100000_speak_roleplay.sql` | unknown / needs investigation | Compare live schema and roleplay API. | Could drift speak feature policies. |
| `20260416004500_admin_roles_rls_fix.sql` | already-live/manual likely | Live Phase 1F depends on admin roles; compare policies/triggers before repair. | Could duplicate or replace admin role sync behavior. |
| `20260418000000_voice_samples_table.sql` | unknown / needs investigation | Compare live voice sample table. | Could conflict with current sample cache behavior. |
| `20260418000100_gemini_speak_columns.sql` | unknown / needs investigation | Compare live speak columns. | Could add stale Gemini columns. |
| `20260418_pipeline_state.sql` | stale/superseded likely | Supersede with current canonical pipeline schema if needed. | Non-14-digit duplicate timestamp and old pipeline state may confuse ordering. |
| `20260418_transition_rpc.sql` | stale/superseded likely | Supersede; do not repair until function body is compared. | Could replace newer transition logic. |
| `20260420000000_gemini_accents.sql` | unknown / needs investigation | Compare current voice mode data. | Could alter current Gemini accent assumptions. |
| `20260420191500_queue_position_rpc.sql` | already-live/manual likely | Live `get_my_queue_position` exists; compare body, then repair or supersede. | Could regress queue position output. |
| `20260420_current_stage_default.sql` | stale/superseded likely | Supersede if current default differs. | Duplicate nonstandard timestamp and old defaults. |
| `20260421000000_pipeline_events.sql` | already-live/manual likely | Live `pipeline_events` table exists; compare before repair. | Could conflict with current observability shape. |
| `20260422000000_pipeline_events_fk_set_null.sql` | already-live/manual likely | Compare live FK behavior. | Could alter delete behavior for events. |
| `20260423000000_grok_speak_columns.sql` | unknown / needs investigation | Compare live speak columns/API. | Could add stale Grok fields. |
| `20260429090000_per_job_word_ownership.sql` | already-live/manual likely | Live `words.generation_job_id` exists; repair only after exact comparison. | Could replace `submit_generation` with stale function body. |
| `20260501000000_document_existing_enrichment_columns.sql` | unknown / needs investigation | Compare live `words` columns. | Could add stale document fields. |
| `20260501010000_document_bridge_visual_mnemonic_columns.sql` | already-live/manual likely | `bridge_mnemonic` and `visual_mnemonic` exist live; compare before repair. | Low column risk, but broad push order still unsafe. |
| `20260501020000_document_pending_image_stage.sql` | unknown / needs investigation | Compare current stage contract. | Could alter stage checks/defaults. |
| `20260501030000_document_deck_type_column.sql` | already-live/manual likely | Live `decks.deck_type` exists; compare constraints/defaults. | Could regress deck type routing. |
| `20260502000000_add_words_error_message.sql` | already-live/manual likely | Live `words.error_message` exists; repair only after comparison. | Low column risk, but function order remains unsafe. |
| `20260503000000_get_user_words_for_language.sql` | already-live/manual likely | Live function exists; compare function body. | Could replace current language lookup behavior. |
| `20260503030000_gpt_image_2_enrichment_columns.sql` | already-live/manual but not recorded | Do not repair until Image-2 schema audit finishes; likely record or supersede later. | Could reapply constraints unexpectedly or hide drift. |
| `20260503120000_gpt_image_2_card_pricing.sql` | stale/superseded likely | Superseded by `20260509101721_word_input_audit.sql` function body locally; do not apply alone. | Could replace current `submit_generation` with older no-`original_input` body. |
| `20260504000000_profile_avatar_upload.sql` | unknown / needs investigation | Compare live profile avatar columns/storage policies. | Could alter profile trigger behavior. |
| `20260504010000_profile_avatar_phase1f_trigger_fix.sql` | unknown / needs investigation | Compare live `protect_profile_privileged_fields`. | Could replace safe profile fields with stale allow-list. |
| `20260505000000_canvas_study_mode.sql` | future feature / unknown | Verify live before applying. | Could add unlaunched study-mode state. |
| `20260506090000_song_only_audio_storage.sql` | future feature / unknown | Verify song-only feature state and storage policies. | Could alter storage assumptions. |
| `20260506091000_music_generation_jobs.sql` | future feature / unknown | Compare live music job tables/RPCs. | Could create/replace music job functions. |
| `20260506100000_music_generation_jobs_allow_creative.sql` | future feature / unknown | Apply only with current music feature rollout. | Could replace music job RPC body. |
| `20260506170000_music_lyrics.sql` | future feature / unknown | Verify live table/function state. | Could add unreviewed lyrics persistence. |
| `20260509030000_pronunciation_audio_v1.sql` | future feature / unknown | Compare live TTS asset tables. | Could alter storage/RLS for pronunciation assets. |
| `20260509101721_word_input_audit.sql` | future canonical candidate | Likely should become part of a canonical reconciliation because live `words.original_input` exists; compare function body before repair. | Replaces `submit_generation`; broad push risk is high. |
| `20260510101944_profile_seen_tutorials.sql` | future feature | Apply manually only with tutorial feature release, then repair that version. | Low column risk, but still unsafe as part of broad push. |
| `20260510110000_phase1h1_admin_config_rpcs.sql` | current phase / additive / already-live unrecorded | Since live RPC probe passes, compare/confirm exact SQL body and repair only this version if accepting the live state. | Intended current change; broad push still unsafe. |
| `20260510120000_phase1h1_admin_config_guards.sql` | current phase / enforcement / already-live unrecorded | Since guard probe passes, compare/confirm exact SQL body and repair only this version if accepting the live state. | Applying before frontend deploy breaks old admin direct writes; broad push still unsafe. |

## Phase 1H.1 Manual Apply Order

1. Apply `20260510110000_phase1h1_admin_config_rpcs.sql`.
2. Deploy frontend changes that call the new RPCs.
3. Run `npm run test:phase1h1:admin-config`.
4. Repair/record only `20260510110000` after confirming the SQL actually ran.
5. Apply `20260510120000_phase1h1_admin_config_guards.sql`.
6. Run `npm run test:phase1h1:admin-config:guards`.
7. Repair/record only `20260510120000` after confirming the SQL actually ran.

Current live probes indicate both SQL files have already been applied outside this shell, but migration history still needs deliberate repair if that live state is accepted.

## Recommended Reconciliation Path

1. Export or inspect live schema/function definitions using a direct DB connection.
2. For each local-only migration, decide whether the exact SQL is already live.
3. For exact matches, repair migration history one version at a time.
4. For stale/superseded migrations, move them out of active migration flow or replace them with a new canonical reconciliation migration.
5. For future features, leave unapplied until that feature is intentionally released.
6. Do not run broad `supabase db push` until every local-only row above has an explicit resolution.
