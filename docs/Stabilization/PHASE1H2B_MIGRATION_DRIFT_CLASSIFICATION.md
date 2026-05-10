# Phase 1H.2B Migration Drift Classification

Date: 2026-05-11

## Scope

This phase is investigation and documentation only.

- No SQL was applied.
- No migration repair was run.
- No migration files were moved or deleted.
- No broad `supabase db push` was run.
- Quota enforcement was checked and remains off.
- Image-2 / infographic related migrations were classified only.

Current checked-out branch: `main`

Current inventory HEAD at start of this phase:

```text
060eda85d2effde55e64bfba81d9e9c7f153a3df
```

Note: the Phase 1H.2A handoff named `97ac4ab`, but `main` had advanced with Slicer commits before this investigation. No rewind was performed.

## Inventory Evidence

`git status --short` was clean at the start of Phase 1H.2B.

`supabase migration list --linked` showed no remote-only migrations.

Quota enforcement read:

```text
api_quota_settings.enforcement_enabled = false
```

Read-only live evidence was collected from the linked remote through direct catalog SELECTs using the Supabase CLI dry-run connection recipe plus `psql`. This was read-only catalog inspection.

Live catalog checks included:

- public table columns
- public functions from `pg_get_functiondef`
- public and storage policies
- public constraints
- public indexes
- selected storage buckets
- quota setting row

## Aligned Migrations

The following versions are Local + Remote:

```text
20260322210000
20260324000000
20260325000000
20260326000000
20260327000000
20260329000000
20260329100000
20260329200000
20260330000000
20260331000000
20260331000001
20260428090000
20260428120000
20260428130000
20260502010000
20260502160000
20260502170000
20260502180000
20260502190000
20260502220000
20260502230000
20260503010000
20260503020000
20260510101944
20260510110000
20260510120000
```

## Remote-Only Migrations

None found.

## Category Definitions

- A: already live exact match. Candidate for one-by-one migration repair later.
- B: already live but different. Related live object exists, but the migration is not an exact match or is incomplete against current live state.
- C: stale/superseded. Applying it now would overwrite or weaken newer live behavior, or reintroduce an obsolete contract.
- D: future feature. Not live and not currently needed.
- E: unknown. Not enough evidence for a repair or archival decision.

## Classification Table

| Version | File | Category | Evidence | Recommended action | Broad db push risk | SQL in recommended action? | Feature work? |
|---|---|---:|---|---|---|---|---|
| 20260404000000 | `20260404000000_suno_retry_job_type.sql` | B | `generation_jobs.job_type` and `target_word_id` are live, but live `job_type` is nullable and live `target_word_id` FK lacks `ON DELETE SET NULL` from the migration. | Do not repair yet. Decide whether to create a canonical correction or accept live as canonical. | Could attempt a stricter NOT NULL/add-FK contract that does not match live history. | No, investigation only. Future action likely repair or canonical SQL. | No. |
| 20260406200000 | `20260406200000_speak_history.sql` | A | `speak_conversations`, `speak_messages`, policies, and `increment_speak_message_count` are live. | Candidate for one-by-one repair after a final body/policy hash check. | Low to medium. Applying now would recreate existing tables/policies/functions and may fail on duplicate policy if not fully idempotent. | No. Future repair only. | No. |
| 20260406210000 | `20260406210000_shared_words.sql` | C | `shared_words` and `get_shared_word` are live, but Phase 1E later replaced direct update behavior with denial/trigger hardening. | Do not apply. Candidate for removal from active migration flow after approval. | High. Would add the old permissive `"Public update view count"` policy beside newer denial hardening. | No. Future archival only. | No. |
| 20260407000000 | `20260407000000_speak_character.sql` | A | `speak_conversations.character_id` is live. | Candidate for one-by-one repair. | Low. Additive column already exists. | No. Future repair only. | No. |
| 20260408000000 | `20260408000000_speak_history_user_delete.sql` | A | `"Users delete own speak conversations"` policy is live. | Candidate for one-by-one repair after confirming policy text. | Low to medium. Non-idempotent `create policy` would fail if applied instead of repaired. | No. Future repair only. | No. |
| 20260409000000 | `20260409000000_speak_corrections.sql` | A | `speak_conversations.corrections` and `"Users update own speak conversations"` are live. | Candidate for one-by-one repair after confirming policy text. | Medium. Non-idempotent `create policy` would fail if applied instead of repaired. | No. Future repair only. | No. |
| 20260409100000 | `20260409100000_speak_roleplay.sql` | A | `mode`, `scenario_id`, `npc_name`, and `context_variant` are live on `speak_conversations`. | Candidate for one-by-one repair. | Low. Additive columns already exist. | No. Future repair only. | No. |
| 20260416004500 | `20260416004500_admin_roles_rls_fix.sql` | B | `admin_roles`, `is_admin`, `sync_admin_role_from_profile`, and trigger support are live, but live also has `"Admins manage admin roles"` and has since received Phase 1F/H admin hardening. | Do not repair until live function/policy definitions are compared against all later admin migrations. | High. Function/trigger replacement could affect admin authorization. | No. Future action may be repair or archival. | No. |
| 20260418000000 | `20260418000000_voice_samples_table.sql` | A | `voice-samples` bucket, `voice_samples` table, accent-aware PK state, and voice sample policies are live. | Candidate for one-by-one repair after confirming accent follow-up ordering. | Medium. Policies are non-idempotent and broad push could fail if it tries to create existing policies. | No. Future repair only. | No. |
| 20260418000100 | `20260418000100_gemini_speak_columns.sql` | A | `provider`, `gemini_character_mode_id`, and `gemini_voice_name` are live on `speak_conversations`. | Candidate for one-by-one repair. | Low. Additive columns already exist. | No. Future repair only. | No. |
| 20260418 | `20260418_pipeline_state.sql` | B | Pipeline columns/indexes are live, but live `words_current_stage_check` is wider and live `current_stage` default is from a later migration. | Do not repair until split into exact live state or documented as superseded by later constraints/defaults. | High. Contains data backfills and narrower historical constraints. | No. Future action likely archival or canonical superseding migration. | No. |
| 20260418 | `20260418_transition_rpc.sql` | C | `transition_word_stage` and `claim_retry_word` are live, but this file defines obsolete two-argument `mark_word_failed`; live has three-argument `mark_word_failed(..., p_error_message text)`. | Do not apply. Archive or supersede after preserving the later three-argument function history. | High. Could reintroduce obsolete failure RPC shape and confuse retry/failure callers. | No. Future archival only. | No. |
| 20260420000000 | `20260420000000_gemini_accents.sql` | A | `voice_samples.accent_id`, accent-aware PK/index state, and `speak_conversations.gemini_accent_id` are live. | Candidate for one-by-one repair after checking the voice sample PK/index definition. | Medium. Alters PK/indexes; broad push failure could affect voice sample admin workflows. | No. Future repair only. | No. |
| 20260420191500 | `20260420191500_queue_position_rpc.sql` | E | `get_my_queue_position` is live, and queue indexes are present, but exact body/index ordering was not fully diffed in this phase. | Deeper review before repair. Compare live `pg_get_functiondef` and indexes against the migration. | High. Redefines queue-position RPC and drops a queue index. | No. Future action unknown. | No. |
| 20260420 | `20260420_current_stage_default.sql` | A | `words.current_stage` live default is `'pending'::text`. | Candidate for one-by-one repair. | Low. Idempotent default setting already matches live. | No. Future repair only. | No. |
| 20260421000000 | `20260421000000_pipeline_events.sql` | A | `pipeline-events` bucket, `pipeline_events` table, indexes, and admin read policy are live. | Candidate for one-by-one repair after final index/policy check. | Medium. Contains storage bucket/policy and table/index creation. | No. Future repair only. | No. |
| 20260422000000 | `20260422000000_pipeline_events_fk_set_null.sql` | A | Live `pipeline_events` FKs to words, decks, profiles, and generation_jobs all use `ON DELETE SET NULL`. | Candidate for one-by-one repair. | Medium. Constraint replacement can be disruptive if applied to a busy table. | No. Future repair only. | No. |
| 20260423000000 | `20260423000000_grok_speak_columns.sql` | A | `grok_voice` and `grok_category` are live on `speak_conversations`. | Candidate for one-by-one repair. | Low. Additive columns already exist. | No. Future repair only. | No. |
| 20260429090000 | `20260429090000_per_job_word_ownership.sql` | C | `words.generation_job_id` is live, but this file contains an older `submit_generation` body without Phase 1F.0 credit pricing, card deck type, Image-2 pricing, and `original_input`. | Do not apply. Archive or supersede after preserving the final `submit_generation`. | Critical. Would overwrite the current generation submit RPC with stale credit and word-insert behavior. | No. Future archival/superseding only. | No. |
| 20260501000000 | `20260501000000_document_existing_enrichment_columns.sql` | B | Enrichment columns are live, but live defaults for several text fields are `''::text` while the migration only adds nullable text columns. | Do not repair until deciding whether live defaults are canonical. | Medium. Applying the file would be mostly no-op but does not document exact live defaults. | No. Future action likely canonical doc migration or repair with explicit note. | No. |
| 20260501010000 | `20260501010000_document_bridge_visual_mnemonic_columns.sql` | A | `bridge_mnemonic` and `visual_mnemonic` are live on `words`. | Candidate for one-by-one repair. | Low. Additive columns already exist. | No. Future repair only. | No. |
| 20260501020000 | `20260501020000_document_pending_image_stage.sql` | A | Live `words_current_stage_check` includes `pending_image` and the full current value list. | Candidate for one-by-one repair only after confirming no concurrent check rewrite is needed. | Medium. Drops and recreates a central pipeline CHECK constraint. | No. Future repair only. | No. |
| 20260501030000 | `20260501030000_document_deck_type_column.sql` | A | `decks.deck_type text not null default 'video'` and `decks_deck_type_check` are live. | Candidate for one-by-one repair. | Low to medium. Additive column already exists, but deck type is part of pricing/routing. | No. Future repair only. | No. |
| 20260502000000 | `20260502000000_add_words_error_message.sql` | A | `words.error_message` is live and live `mark_word_failed(uuid,text,text)` includes error-message support. | Candidate for one-by-one repair after exact body hash check. | High if applied as SQL because it drops obsolete overload and redefines failure RPC. Repair-only is safer. | No. Future repair only. | No. |
| 20260503000000 | `20260503000000_get_user_words_for_language.sql` | A | `get_user_words_for_language(p_target_language text)` is live and used by paid API protection tests. | Candidate for one-by-one repair after exact body check. | Medium. Redefines an RPC used before provider calls. | No. Future repair only. | No. |
| 20260503030000 | `20260503030000_gpt_image_2_enrichment_columns.sql` | A | Image-2 enrichment columns and their CHECK constraints are live. | Defer repair until Image-2 scope approval, even though live appears matched. | Medium. Touches Image-2/card metadata constraints. | No. Future repair only, with explicit Image-2 approval. | Image-2 related. |
| 20260503120000 | `20260503120000_gpt_image_2_card_pricing.sql` | C | Live `submit_generation` includes Image-2 pricing plus later `original_input`; this migration is an older intermediate submit body. | Do not apply. Archive or supersede after preserving final submit RPC. | Critical. Would overwrite `submit_generation` and drop later `original_input` handling. | No. Future archival/superseding only. | Image-2 related. |
| 20260504000000 | `20260504000000_profile_avatar_upload.sql` | B | Avatar columns, `profile-avatars` bucket, and storage policies are live, but the trigger body was later repaired by `20260504010000`. | Do not repair independently. Treat with the Phase 1F trigger-fix migration as a pair. | High. Could temporarily downgrade the profile privilege trigger if applied without the repair. | No. Future repair only as a controlled pair. | No. |
| 20260504010000 | `20260504010000_profile_avatar_phase1f_trigger_fix.sql` | A | Live `protect_profile_privileged_fields` includes avatar safe fields and Phase 1F trusted-update hardening. | Candidate for one-by-one repair after `20260504000000` decision. | High if applied as SQL because it replaces profile privilege trigger. Repair-only is safer. | No. Future repair only. | No. |
| 20260505000000 | `20260505000000_canvas_study_mode.sql` | C | Live `recall_attempts` no longer has `recall_attempts_study_mode_check`; `20260510130000` intentionally dropped it for future games. | Do not apply. Archive after approval. | High. Would reintroduce a restrictive study-mode CHECK that later game work removed. | No. Future archival only. | Game study modes. |
| 20260506090000 | `20260506090000_song_only_audio_storage.sql` | B | `audio` bucket and word storage columns are live, but live bucket also has allowed MIME types not represented in the migration. | Do not repair until bucket metadata canonical state is documented. | Medium. Storage policy/bucket changes can affect audio availability. | No. Future action likely repair with explicit bucket metadata note. | Music/audio feature. |
| 20260506091000 | `20260506091000_music_generation_jobs.sql` | C | `music_generation_jobs` and functions are live, but `submit_music_only_job` was later changed by `20260506100000` to allow creative mode. | Do not apply as standalone SQL. Consider repair only as part of a paired music-job drift batch. | High. Would overwrite the current song-only submit RPC until the creative follow-up reapplies. | No. Future paired repair or archival. | Music/audio feature. |
| 20260506100000 | `20260506100000_music_generation_jobs_allow_creative.sql` | A | Live `submit_music_only_job` includes creative mode support. | Candidate for one-by-one repair only after deciding the base music-job migration path. | High if applied as SQL because it replaces a submit RPC. Repair-only is safer. | No. Future repair only. | Music/audio feature. |
| 20260506170000 | `20260506170000_music_lyrics.sql` | A | `music_lyrics` table, indexes, and RLS policies are live. | Candidate for one-by-one repair after final index/policy check. | Medium. Creates tables/indexes/policies. | No. Future repair only. | Music/audio feature. |
| 20260509030000 | `20260509030000_pronunciation_audio_v1.sql` | A | TTS word columns, `tts-pronunciations` bucket, `tts_assets`, `word_tts_assets`, indexes, and policies are live. | Candidate for one-by-one repair after final bucket/policy check. | Medium. Touches storage policies and pronunciation cache tables. | No. Future repair only. | Pronunciation audio feature. |
| 20260509101721 | `20260509101721_word_input_audit.sql` | A | `words.original_input` is live and not null; live `submit_generation` includes `original_input`, Image-2 pricing, and Phase 1E trusted update gating. | Candidate for one-by-one repair after exact body hash check. | Critical if applied as SQL because it replaces `submit_generation`; repair-only is safer. | No. Future repair only. | No. |
| 20260510130000 | `20260510130000_game_recall_attempts.sql` | A | `recall_attempts.metadata` is live and the old study-mode CHECK is absent. | Candidate for one-by-one repair after confirming game-mode policy. | Medium. Drops a constraint intentionally. Repair-only is safer. | No. Future repair only. | Game study modes. |

## Category Counts

```text
A: 24
B: 6
C: 6
D: 0
E: 1
Total: 37 active local-only SQL files classified.
```

The linked migration list has duplicate short-version rows that map to distinct files:

- `20260418` has `20260418_pipeline_state.sql` and `20260418_transition_rpc.sql`
- `20260420` has `20260420_current_stage_default.sql`, while nearby full-timestamp migrations also exist

The active local-only SQL file count classified here is 37.

## Highest-Risk Drift

The broad db push risk remains high because several local-only migrations redefine live RPCs or central policies:

- `20260406210000_shared_words.sql`: could reintroduce permissive direct shared-word update policy.
- `20260418_transition_rpc.sql`: contains obsolete two-argument `mark_word_failed`.
- `20260416004500_admin_roles_rls_fix.sql`: touches admin role functions, trigger, and RLS.
- `20260420191500_queue_position_rpc.sql`: redefines queue-position RPC and drops an index.
- `20260429090000_per_job_word_ownership.sql`: stale `submit_generation`.
- `20260502000000_add_words_error_message.sql`: redefines failure RPC.
- `20260503000000_get_user_words_for_language.sql`: redefines pre-provider avoid-list RPC.
- `20260503120000_gpt_image_2_card_pricing.sql`: stale `submit_generation` around Image-2 pricing.
- `20260504000000_profile_avatar_upload.sql` and `20260504010000_profile_avatar_phase1f_trigger_fix.sql`: profile privilege trigger replacement.
- `20260505000000_canvas_study_mode.sql`: would reintroduce a restrictive study-mode CHECK.
- `20260506091000_music_generation_jobs.sql` and `20260506100000_music_generation_jobs_allow_creative.sql`: song-only job submit RPC replacement.
- `20260509101721_word_input_audit.sql`: final known `submit_generation` body, critical to preserve.

## Broad `supabase db push` Decision

Broad `supabase db push` remains unsafe.

Reason: the local-only set mixes already-live objects, duplicate/non-idempotent policies, stale intermediate RPC bodies, storage policy changes, constraint rewrites, and Image-2/card pricing migrations. Applying all local-only files in timestamp order could fail midway or transiently replace current live functions with stale bodies.
