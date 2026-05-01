-- DOCUMENTING-ONLY MIGRATION
-- The deck_type column was added to decks via Supabase SQL Editor pre-Phase 1
-- (origin pre-dates current repo migrations; column is referenced by feeder
-- routing logic to dispatch words to upstream_queue or card_queue).
-- This migration captures the current state for future replay consistency.
-- DO NOT RUN against production manually. Confirmed present 2026-05-01:
-- column_name: deck_type, data_type: text, column_default: 'video'::text

alter table decks add column if not exists deck_type text not null default 'video';
