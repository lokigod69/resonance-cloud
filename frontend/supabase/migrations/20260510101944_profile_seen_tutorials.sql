-- Run manually in Supabase SQL Editor after this migration is committed.
-- Adds JSONB column tracking which tutorials each account has seen.
-- Versioned keys (e.g. "generate.v1") allow re-firing tutorials after structural redesigns
-- by bumping the version suffix.

alter table public.profiles
  add column if not exists seen_tutorials jsonb not null default '{}'::jsonb;

comment on column public.profiles.seen_tutorials is
  'Map of versioned tutorial keys (e.g. "generate.v1") to ISO 8601 timestamps of first dismissal/completion. Empty object {} means no tutorials seen.';
