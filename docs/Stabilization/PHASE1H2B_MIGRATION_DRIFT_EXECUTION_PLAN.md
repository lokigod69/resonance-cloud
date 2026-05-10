# Phase 1H.2B Migration Drift Execution Plan

Date: 2026-05-11

## Guardrails

Until the batches below are completed, broad `supabase db push` remains unsafe.

Do not:

- run broad `supabase db push`
- apply local-only migrations blindly
- repair migrations without a fresh live-object comparison
- enable quota enforcement
- call paid providers
- modify Image-2 / infographic columns outside an explicitly scoped phase

Recommended execution style:

1. Work one migration version at a time.
2. Use read-only catalog comparison first.
3. If live exactly matches the migration, use `supabase migration repair --linked --status applied <version>`.
4. If live differs, write a superseding decision doc or migration before any repair.
5. Commit docs/metadata decisions separately from any SQL application.

## Batch 1 - Low-Risk Already-Live Repair Candidates

These are the safest first repairs because they are already live and either additive schema or documented live constraints. Run no SQL. Repair only after a fresh live check for each row.

| Version | File | Classification | Evidence | Recommended action | Broad db push risk | SQL involved? | Feature work? |
|---|---|---:|---|---|---|---|---|
| 20260407000000 | `20260407000000_speak_character.sql` | A | `speak_conversations.character_id` is live. | Repair one-by-one after fresh column check. | Low. | No, repair only. | No. |
| 20260409100000 | `20260409100000_speak_roleplay.sql` | A | `mode`, `scenario_id`, `npc_name`, `context_variant` are live. | Repair one-by-one after fresh column check. | Low. | No, repair only. | No. |
| 20260418000100 | `20260418000100_gemini_speak_columns.sql` | A | Gemini speak columns are live. | Repair one-by-one after fresh column check. | Low. | No, repair only. | No. |
| 20260420 | `20260420_current_stage_default.sql` | A | `words.current_stage` default is `'pending'::text`. | Repair one-by-one after fresh default check. | Low. | No, repair only. | No. |
| 20260423000000 | `20260423000000_grok_speak_columns.sql` | A | Grok speak columns are live. | Repair one-by-one after fresh column check. | Low. | No, repair only. | No. |
| 20260501010000 | `20260501010000_document_bridge_visual_mnemonic_columns.sql` | A | `bridge_mnemonic` and `visual_mnemonic` are live. | Repair one-by-one after fresh column check. | Low. | No, repair only. | No. |
| 20260501030000 | `20260501030000_document_deck_type_column.sql` | A | `decks.deck_type` is live with default/check. | Repair one-by-one after fresh column/constraint check. | Low to medium. | No, repair only. | No. |
| 20260408000000 | `20260408000000_speak_history_user_delete.sql` | A | Delete policy is live. | Repair after fresh policy check. | Medium because `CREATE POLICY` is not idempotent. | No, repair only. | No. |
| 20260409000000 | `20260409000000_speak_corrections.sql` | A | Corrections column/update policy are live. | Repair after fresh column/policy check. | Medium because policy creation would fail if applied. | No, repair only. | No. |
| 20260406200000 | `20260406200000_speak_history.sql` | A | Speak history tables, policies, and count RPC are live. | Repair after table/policy/function body check. | Medium because policies/functions are involved. | No, repair only. | No. |
| 20260418000000 | `20260418000000_voice_samples_table.sql` | A | Voice sample table/bucket/policies are live. | Repair after bucket/table/policy check. | Medium because storage policies are involved. | No, repair only. | Voice samples. |
| 20260420000000 | `20260420000000_gemini_accents.sql` | A | Accent columns and voice sample key/index state are live. | Repair after PK/index check. | Medium because PK/index state is involved. | No, repair only. | Voice samples. |
| 20260421000000 | `20260421000000_pipeline_events.sql` | A | Pipeline events table, bucket, indexes, policy are live. | Repair after table/index/policy check. | Medium because storage and audit table objects are involved. | No, repair only. | Pipeline observability. |
| 20260422000000 | `20260422000000_pipeline_events_fk_set_null.sql` | A | Pipeline event FKs all use `ON DELETE SET NULL`. | Repair after FK check. | Medium because constraints are involved. | No, repair only. | Pipeline observability. |
| 20260501020000 | `20260501020000_document_pending_image_stage.sql` | A | Live stage CHECK includes `pending_image` and current full value list. | Repair after constraint check. | Medium because it represents a central state-machine constraint. | No, repair only. | Pipeline stage routing. |
| 20260506170000 | `20260506170000_music_lyrics.sql` | A | `music_lyrics` table, indexes, and RLS policies are live. | Repair after table/index/policy check. | Medium. | No, repair only. | Music/audio. |
| 20260509030000 | `20260509030000_pronunciation_audio_v1.sql` | A | TTS columns, buckets, tables, indexes, and policies are live. | Repair after bucket/table/policy check. | Medium. | No, repair only. | Pronunciation audio. |
| 20260510130000 | `20260510130000_game_recall_attempts.sql` | A | `recall_attempts.metadata` is live and the old study-mode CHECK is absent. | Repair after recall constraint/column check. | Medium because it documents dropping a constraint. | No, repair only. | Game study modes. |

Recommended next batch: start with the low-risk additive rows at the top of Batch 1, then continue into medium-risk table/policy rows only after each fresh catalog check is recorded.

## Batch 2 - Stale or Superseded Migrations To Remove From Active Flow After Approval

These should not be applied as SQL. They are candidates for archival or replacement by a canonical superseding migration plan.

| Version | File | Classification | Evidence | Recommended action | Broad db push risk | SQL involved? | Feature work? |
|---|---|---:|---|---|---|---|---|
| 20260406210000 | `20260406210000_shared_words.sql` | C | Live shared-word path has Phase 1E direct-update denial; this migration adds old permissive update policy. | Move out of active migrations after approval, preserving history in docs. | High. Weakens share-view RLS. | No. Future archival only. | No. |
| 20260418 | `20260418_transition_rpc.sql` | C | Contains obsolete two-argument `mark_word_failed`; live uses three arguments with `error_message`. | Archive/supersede; never apply directly. | High. Obsolete failure RPC shape. | No. Future archival only. | No. |
| 20260429090000 | `20260429090000_per_job_word_ownership.sql` | C | Stale `submit_generation` without pricing/deck-type/original-input behavior. | Archive/supersede; preserve final submit RPC separately. | Critical. Would overwrite generation submit logic. | No. Future archival only. | No. |
| 20260503120000 | `20260503120000_gpt_image_2_card_pricing.sql` | C | Intermediate `submit_generation`; live final also records `original_input`. | Archive/supersede inside Image-2 approved scope. | Critical. Would overwrite final submit RPC. | No. Future archival only. | Image-2/card pricing. |
| 20260505000000 | `20260505000000_canvas_study_mode.sql` | C | Later game migration intentionally removed the restrictive study-mode CHECK. | Archive after approval. | High. Would reintroduce obsolete game-mode constraint. | No. Future archival only. | Game study modes. |
| 20260506091000 | `20260506091000_music_generation_jobs.sql` | C | Base song-only submit function was superseded by creative-mode migration. | Do not apply standalone. Archive or repair only as a controlled pair with `20260506100000`. | High. Would overwrite song-only submit RPC. | No. Future paired decision only. | Music/audio. |

## Batch 3 - Future Feature Migrations To Leave Alone

No remaining local-only migration was classified as D in this pass. The live catalog showed the objects already present or superseded; no not-live, not-needed future feature migration was identified.

Image-2 / infographic related rows are not D because their live schema or related final submit behavior already exists. They still require explicit Image-2 scope approval before repair or archival:

| Version | File | Classification | Evidence | Recommended action | Broad db push risk | SQL involved? | Feature work? |
|---|---|---:|---|---|---|---|---|
| 20260503030000 | `20260503030000_gpt_image_2_enrichment_columns.sql` | A | Image-2 enrichment columns and checks are live. | Defer repair until Image-2 approval. | Medium. Touches Image-2/card constraints. | No. Future repair only. | Image-2. |
| 20260503120000 | `20260503120000_gpt_image_2_card_pricing.sql` | C | Stale intermediate submit RPC. | Archive/supersede under Image-2 approval. | Critical. | No. Future archival only. | Image-2/card pricing. |

## Batch 4 - Unknown, Different, Or High-Risk Migrations Needing Deeper Review

These need more careful live definition diffs, paired decisions, or canonical superseding migrations before any repair.

| Version | File | Classification | Evidence | Recommended action | Broad db push risk | SQL involved? | Feature work? |
|---|---|---:|---|---|---|---|---|
| 20260404000000 | `20260404000000_suno_retry_job_type.sql` | B | Live columns exist, but nullability/FK delete behavior differs from the migration. | Decide live canonical state, then repair or write a corrective migration. | High if blindly applied because schema contract differs. | No now. Future may need SQL. | Suno retry. |
| 20260416004500 | `20260416004500_admin_roles_rls_fix.sql` | B | Admin role objects are live, but later admin hardening adds policy/function expectations. | Diff function/policy bodies against Phase 1F/H before deciding. | High. Admin auth/RLS surface. | No now. Future repair or archival. | Admin roles. |
| 20260418 | `20260418_pipeline_state.sql` | B | Pipeline columns live, but current live constraint/default state is newer than this file. | Create a canonical state-machine schema snapshot or archive the historical migration. | High. Data backfills and state-machine constraints. | No now. Future canonical decision. | Pipeline state. |
| 20260420191500 | `20260420191500_queue_position_rpc.sql` | E | Queue RPC is live, but exact body/index comparison was not completed. | Run exact `pg_get_functiondef` and index diff before repair. | High. Queue position and index changes. | No now. Future repair if exact. | Queue UX. |
| 20260501000000 | `20260501000000_document_existing_enrichment_columns.sql` | B | Columns live, but live defaults differ from migration. | Decide whether defaults are canonical, then repair with note or supersede. | Medium. Enrichment defaults may affect inserts. | No now. Future repair or canonical doc. | Enrichment. |
| 20260502000000 | `20260502000000_add_words_error_message.sql` | A | Error column and final error-message RPC are live. | Treat as high-risk A: exact body diff before repair. | High if applied as SQL because function replacement is involved. | No now. Future repair only. | Pipeline failure handling. |
| 20260503000000 | `20260503000000_get_user_words_for_language.sql` | A | Avoid-list RPC is live. | Treat as high-risk A: exact body diff before repair. | Medium to high because it runs before provider calls. | No now. Future repair only. | Paid API protection path. |
| 20260504000000 | `20260504000000_profile_avatar_upload.sql` | B | Avatar columns/bucket/policies live, but trigger was repaired later. | Pair with `20260504010000`; never repair/apply independently. | High. Profile privilege trigger surface. | No now. Future paired repair. | Profile avatar. |
| 20260504010000 | `20260504010000_profile_avatar_phase1f_trigger_fix.sql` | A | Live trigger includes Phase 1F/avatar safe-update behavior. | Exact trigger-body diff before repair. | High if applied as SQL. | No now. Future repair only. | Profile avatar. |
| 20260506090000 | `20260506090000_song_only_audio_storage.sql` | B | Audio bucket/columns/policies live, but bucket metadata includes MIME restrictions not in migration. | Document bucket canonical metadata before repair. | Medium. Storage access surface. | No now. Future repair or canonical doc. | Music/audio. |
| 20260506100000 | `20260506100000_music_generation_jobs_allow_creative.sql` | A | Creative mode is live in song-only submit RPC. | Exact function-body diff after base migration decision. | High if applied as SQL. | No now. Future repair only. | Music/audio. |
| 20260509101721 | `20260509101721_word_input_audit.sql` | A | `original_input` is live and final submit RPC includes it. | Exact `submit_generation` body diff before repair. | Critical if applied as SQL. | No now. Future repair only. | Generation submit. |

## Recommended Immediate Next Step

Run a Phase 1H.2C repair-only batch for the lowest-risk Batch 1 rows:

```text
20260407000000_speak_character.sql
20260409100000_speak_roleplay.sql
20260418000100_gemini_speak_columns.sql
20260420_current_stage_default.sql
20260423000000_grok_speak_columns.sql
20260501010000_document_bridge_visual_mnemonic_columns.sql
20260501030000_document_deck_type_column.sql
```

For each row in that exact order:

1. Re-run `supabase migration list --linked`.
2. Run one read-only live check for the column/default/constraint.
3. If the live check matches, run only:

```text
supabase migration repair --linked --status applied <version>
```

4. Re-run `supabase migration list --linked`.
5. Stop immediately if any row does not match live state.

This batch has no SQL application and no feature work. It only reconciles migration history for simple already-live schema.
