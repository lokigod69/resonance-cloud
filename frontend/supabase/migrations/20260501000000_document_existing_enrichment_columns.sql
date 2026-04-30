-- DOCUMENTING-ONLY MIGRATION
-- These columns exist in production but were added directly via Supabase SQL Editor
-- without a tracked migration file. This migration captures the current state for
-- future replay consistency. It is a no-op against current production.
-- DO NOT RUN against production manually. Confirmed present 2026-05-01.

alter table public.words add column if not exists ipa text;
alter table public.words add column if not exists example text;
alter table public.words add column if not exists example_gloss text;
alter table public.words add column if not exists synonyms text;
alter table public.words add column if not exists tags text;
