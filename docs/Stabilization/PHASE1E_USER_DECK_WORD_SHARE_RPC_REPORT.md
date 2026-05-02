# Phase 1E User Deck/Word/Share RPC Report

Date: 2026-05-02

## Summary

Phase 1E moved normal-user deck, word, and share mutations behind narrow RPCs before tightening the first set of pipeline-owned fields. The browser no longer directly moves words, recalculates deck counters/status, deletes user words/decks, creates share IDs, sets public share view counts, or rates words with raw table updates.

Quota enforcement remained monitor-only/off. No paid providers were called by the Phase 1E live probe or checks.

## Migrations

- `frontend/supabase/migrations/20260502160000_phase1e_user_deck_word_share_rpcs.sql`
- `frontend/supabase/migrations/20260502170000_phase1e_trusted_rpc_guard_fix.sql`
- `frontend/supabase/migrations/20260502180000_phase1e_recompute_archive_guard_fix.sql`
- `frontend/supabase/migrations/20260502190000_phase1e_share_id_entropy_schema_fix.sql`

`20260502170000`, `20260502180000`, and `20260502190000` are narrow follow-ups from live probe findings:

- remove unsafe `current_user` trust from the Phase 1E guard helper
- mark trusted `submit_generation`, `request_word_retry`, deck recomputation, and archive paths with a transaction-local flag
- qualify pgcrypto randomness for share IDs because Phase 1E functions pin `search_path` to `public`

## RPCs Added

- `public.rate_word(p_word_id uuid, p_rating int)`
- `public.update_deck_metadata(p_deck_id uuid, p_name text)`
- `public.move_words_to_deck(p_word_ids uuid[], p_target_deck_id uuid)`
- `public.archive_word(p_word_id uuid)`
- `public.archive_deck(p_deck_id uuid)`
- `public.create_or_get_share_link(p_word_id uuid)`
- `public.increment_shared_word_view(p_share_id text)`

## Frontend Callers Migrated

- `frontend/src/hooks/useMoveWords.ts`
- `frontend/src/pages/DeckView.tsx`
- `frontend/src/pages/DeckViewPG.tsx`
- `frontend/src/pages/VideoPlayer.tsx`
- `frontend/src/lib/shareWord.ts`
- `frontend/api/share.ts`
- `frontend/src/components/speak/SpeakHistoryPanel.tsx`

`SpeakHistoryPanel` now sends `Authorization: Bearer <access_token>` when requesting `/api/voice-chat` corrections and shows a session-expired/auth error if no session token is available.

## Direct Browser Writes Removed

- `words.deck_id` move writes from `useMoveWords`
- `decks.word_count` and `decks.status` browser recomputation
- user `words.delete` from DeckView and DeckViewPG
- user `decks.delete` from DeckView and DeckViewPG
- user direct `words.rating` / `rated_at` updates
- browser-generated `shared_words.id` inserts
- public direct `shared_words.view_count` updates from `frontend/api/share.ts`
- browser storage deletion tied to user word deletion

## RLS/Trigger Restrictions Added

Normal authenticated users are blocked from directly changing:

- `words.status`
- `words.current_stage`
- `words.video_url`
- `words.thumbnail_url`
- `words.video_url_b`
- `words.thumbnail_url_b`
- `words.music_state`
- `words.retry_requested`
- `words.failed_stage`
- `words.stage_attempts`
- `words.total_stage_attempts`
- `words.stage_started_at`
- `generation_jobs.status`
- `generation_jobs.priority`
- `generation_jobs.words_completed`
- `generation_jobs.started_at`
- `generation_jobs.completed_at`
- `decks.word_count`
- `decks.status`

Direct normal-user deletes for `words` and `decks` are also blocked by trigger and replaced by `archive_word` / `archive_deck`.

Public clients can no longer set/reset `shared_words.view_count`; they can only call `increment_shared_word_view`, which increments by exactly one for an existing share ID.

## Storage Cleanup

`archive_word` derives expected video/thumb paths from owned database rows and enqueues them in `public.storage_cleanup_queue`. It does not trust browser-supplied storage paths.

Actual storage object deletion remains a follow-up cleanup worker/service task for Phase 1G. This avoids granting broad browser delete rights on the `videos` bucket.

## Admin Direct Writes Remaining For Phase 1F

The remaining direct word/deck/storage writes found by grep are in `frontend/src/pages/admin/Content.tsx`:

- content review flag update
- word delete and storage remove
- deck delete and storage remove

These should move to audited admin RPCs in Phase 1F. Admin queue/user credit/role command hardening also remains Phase 1F scope.

## Rollout Notes

- Do not enable API quota enforcement as part of Phase 1E.
- Do not rerun Phase 1A/1B/1C SQL.
- Apply only the Phase 1E migrations that are not already recorded as remote.
- If any Phase 1E migration is applied manually, repair migration history before `supabase db push`.
