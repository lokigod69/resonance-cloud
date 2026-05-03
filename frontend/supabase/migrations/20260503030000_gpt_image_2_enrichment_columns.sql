-- Adds three enrichment columns for GPT Image-2 visual production brief.
alter table public.words add column if not exists dominant_emotional_reading text;
alter table public.words add column if not exists composition_hint text;
alter table public.words add column if not exists treatment_hint text;

-- Enum constraint on composition_hint (nullable).
alter table public.words drop constraint if exists words_composition_hint_check;
alter table public.words add constraint words_composition_hint_check
  check (composition_hint is null or composition_hint in
    ('single', 'multi_panel', 'split', 'embodied'));

-- Enum constraint on treatment_hint (nullable).
alter table public.words drop constraint if exists words_treatment_hint_check;
alter table public.words add constraint words_treatment_hint_check
  check (treatment_hint is null or treatment_hint in
    ('literal', 'absurd', 'mnemonic', 'etymological', 'contrast', 'embodied'));
