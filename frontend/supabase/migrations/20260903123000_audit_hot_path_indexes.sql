-- Platform hardening audit 2026-09-03, finding B-10 (Medium): indexes for the
-- query shapes the client and the runner actually issue, plus the unindexed
-- foreign keys that make deletes cascade through sequential scans.
--
-- All plain `create index if not exists` (tables are small enough today; if
-- one ever grows large, re-run the statement as `create index concurrently`
-- outside a transaction from the SQL editor).

begin;

-- FK had no index; latest-job-per-deck lookup (GenerateGO/GeneratePG polling,
-- feeder same-deck lock) and the deck delete cascade.
create index if not exists idx_generation_jobs_deck_created
  on public.generation_jobs (deck_id, created_at desc);

-- FK had no index; every word delete cascaded through a full scan.
create index if not exists idx_recall_attempts_word_id
  on public.recall_attempts (word_id);

-- Per-user time-range reads (streak, new-today window).
create index if not exists idx_recall_attempts_user_created
  on public.recall_attempts (user_id, created_at desc);

-- Study / game loads filter on both.
create index if not exists idx_words_user_status
  on public.words (user_id, status);

-- Music page filters; FK user_id had no index.
create index if not exists idx_music_jobs_user_scope_status
  on public.music_generation_jobs (user_id, scope, status);

create index if not exists idx_music_jobs_word_status
  on public.music_generation_jobs (word_id, status);

-- FK `on delete set null` scans.
create index if not exists idx_music_jobs_deck
  on public.music_generation_jobs (deck_id);

create index if not exists idx_music_lyrics_deck
  on public.music_lyrics (deck_id);

-- unique (user_id, word_id) cannot serve word_id alone (archive cascade).
create index if not exists idx_shared_words_word
  on public.shared_words (word_id);

-- Storage cleanup worker poll.
create index if not exists idx_storage_cleanup_pending
  on public.storage_cleanup_queue (created_at)
  where status = 'pending';

commit;
