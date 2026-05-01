-- DOCUMENTING-ONLY MIGRATION
-- These columns were added via Supabase SQL Editor as part of P1 manual schema migrations.
-- This migration captures their current state for future replay consistency.
-- It is a no-op against current production. DO NOT RUN against production manually.
-- Confirmed present 2026-05-01 (Robert verified via SQL Editor).

alter table words add column if not exists bridge_mnemonic text;
alter table words add column if not exists visual_mnemonic text;
