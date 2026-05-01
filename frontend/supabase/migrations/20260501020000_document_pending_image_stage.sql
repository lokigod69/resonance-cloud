-- DOCUMENTING-ONLY MIGRATION
-- The pending_image value was added to words_current_stage_check via Supabase
-- SQL Editor as part of the P3.5 stage rename. This migration captures the
-- current state for future replay consistency.
-- DO NOT RUN against production manually. Confirmed present 2026-05-01
-- via: select pg_get_constraintdef(oid) from pg_constraint
--      where conname = 'words_current_stage_check';
--
-- An earlier version of this migration had a stale narrow value list and
-- would have corrupted the constraint if replayed. P4c repaired it.

alter table words drop constraint if exists words_current_stage_check;

alter table words add constraint words_current_stage_check
  check (current_stage = ANY (ARRAY[
    'pre_bootstrap'::text,
    'pending'::text,
    'enrichment'::text,
    'enriching'::text,
    'images'::text,
    'pending_image'::text,
    'concept'::text,
    'song'::text,
    'songs'::text,
    'video_queued'::text,
    'video'::text,
    'post_video_queued'::text,
    'assembly'::text,
    'bookend'::text,
    'suno_bake'::text,
    'uploading'::text,
    'complete'::text,
    'failed'::text,
    'cancelling'::text,
    'cancelled'::text
  ]));
