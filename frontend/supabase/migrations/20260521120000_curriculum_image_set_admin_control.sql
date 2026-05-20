-- Curriculum image set admin control.
--
-- Adds two tables that let an admin choose which curriculum image set
-- learners see when they browse curriculum categories:
--
--   public.curriculum_image_sets          - registry of available image sets
--                                           per language (e.g. en/A, en/C)
--   public.curriculum_image_set_selections - the language default active set
--                                           and any per-category overrides
--
-- These tables control CURRICULUM PREVIEW/RENDERING ONLY. They are NOT
-- a deck identity dimension. They are NOT a learner preference. Switching
-- the active image set does NOT create new decks, does NOT rewrite stored
-- card thumbnail_url values, and does NOT call any generation provider.
--
-- Read by all authenticated users (so the resolver can render). Mutated
-- only by admins via standard RLS using public.is_admin().

begin;

-- ============================================================================
-- TABLES
-- ============================================================================

create table if not exists public.curriculum_image_sets (
  language_iso text not null,
  set_key text not null,
  label text not null,
  description text,
  public_base_path text not null,
  manifest_path text not null,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (language_iso, set_key)
);

comment on table public.curriculum_image_sets is
  'Registry of curriculum image sets available per language. Controls preview/rendering only; never deck identity.';

comment on column public.curriculum_image_sets.public_base_path is
  'Base public URL path for set assets (e.g. /curriculum/en/set-a).';
comment on column public.curriculum_image_sets.manifest_path is
  'Public URL path to the static set manifest JSON (e.g. /curriculum/en/manifests/set-a.json).';
comment on column public.curriculum_image_sets.is_enabled is
  'If false, the set is hidden from the admin selector and ignored at resolve time.';

create table if not exists public.curriculum_image_set_selections (
  id uuid primary key default gen_random_uuid(),
  language_iso text not null,
  category_slug text null,
  active_set_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curriculum_image_set_selections_set_fk
    foreign key (language_iso, active_set_key)
    references public.curriculum_image_sets (language_iso, set_key)
);

comment on table public.curriculum_image_set_selections is
  'Active curriculum image set selections. One row per language is the language default (category_slug is null). Additional rows per category act as overrides.';

-- One default per language (category_slug is null).
create unique index if not exists curriculum_image_set_selections_lang_default_idx
  on public.curriculum_image_set_selections (language_iso)
  where category_slug is null;

-- One override per (language, category_slug) when category_slug is set.
create unique index if not exists curriculum_image_set_selections_lang_category_idx
  on public.curriculum_image_set_selections (language_iso, category_slug)
  where category_slug is not null;

create index if not exists curriculum_image_set_selections_language_iso_idx
  on public.curriculum_image_set_selections (language_iso);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

drop trigger if exists trg_curriculum_image_sets_updated_at on public.curriculum_image_sets;
create trigger trg_curriculum_image_sets_updated_at
  before update on public.curriculum_image_sets
  for each row execute function public.set_updated_at();

drop trigger if exists trg_curriculum_image_set_selections_updated_at on public.curriculum_image_set_selections;
create trigger trg_curriculum_image_set_selections_updated_at
  before update on public.curriculum_image_set_selections
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.curriculum_image_sets enable row level security;
alter table public.curriculum_image_set_selections enable row level security;

-- Read: any authenticated user can read enabled sets and selections so the
-- frontend resolver can render images. Selection of enabled-only is enforced
-- in the SELECT policy below for image sets.
drop policy if exists "image_sets_read" on public.curriculum_image_sets;
create policy "image_sets_read"
  on public.curriculum_image_sets for select
  to authenticated
  using (is_enabled = true or public.is_admin());

drop policy if exists "image_sets_admin_insert" on public.curriculum_image_sets;
create policy "image_sets_admin_insert"
  on public.curriculum_image_sets for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "image_sets_admin_update" on public.curriculum_image_sets;
create policy "image_sets_admin_update"
  on public.curriculum_image_sets for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "image_sets_admin_delete" on public.curriculum_image_sets;
create policy "image_sets_admin_delete"
  on public.curriculum_image_sets for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "image_set_selections_read" on public.curriculum_image_set_selections;
create policy "image_set_selections_read"
  on public.curriculum_image_set_selections for select
  to authenticated
  using (true);

drop policy if exists "image_set_selections_admin_insert" on public.curriculum_image_set_selections;
create policy "image_set_selections_admin_insert"
  on public.curriculum_image_set_selections for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "image_set_selections_admin_update" on public.curriculum_image_set_selections;
create policy "image_set_selections_admin_update"
  on public.curriculum_image_set_selections for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "image_set_selections_admin_delete" on public.curriculum_image_set_selections;
create policy "image_set_selections_admin_delete"
  on public.curriculum_image_set_selections for delete
  to authenticated
  using (public.is_admin());

-- ============================================================================
-- SEED
-- ============================================================================

insert into public.curriculum_image_sets
  (language_iso, set_key, label, description, public_base_path, manifest_path, is_enabled, sort_order)
values
  ('en', 'A', 'Set A · Minimal',
   'Minimal photoreal baseline curriculum imagery.',
   '/curriculum/en/set-a',
   '/curriculum/en/manifests/set-a.json',
   true, 10),
  ('en', 'C', 'Set C · Symbolic',
   'Symbolic cinematic curriculum imagery. Partial coverage; falls back to Set A for missing terms.',
   '/curriculum/en/set-c',
   '/curriculum/en/manifests/set-c.json',
   true, 20)
on conflict (language_iso, set_key) do nothing;

-- Default English active set is Set A.
insert into public.curriculum_image_set_selections
  (language_iso, category_slug, active_set_key)
values
  ('en', null, 'A')
on conflict do nothing;

commit;
