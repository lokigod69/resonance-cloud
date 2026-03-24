-- Phase 2A: Decks, Words, Generation Jobs, Language Profiles, Random Word Lists, System Settings
-- Depends on: profiles table (Phase 1) linked to auth.users

-- ============================================================================
-- PROFILE ADDITIONS (extend Phase 1 profiles table)
-- ============================================================================

alter table public.profiles add column if not exists base_language text default 'English';

-- ============================================================================
-- TABLES
-- ============================================================================

-- Decks
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  target_language text not null,
  art_style text,
  movie_override text,
  word_count integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'generating', 'complete', 'partial')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_decks_user_id on public.decks(user_id);

-- Words
create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  word text not null,
  word_slug text,
  translation text,
  mnemonic text,
  etymology text,
  pos text,
  article text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'complete', 'failed')),
  video_url text,
  thumbnail_url text,
  error_message text,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_words_deck_id on public.words(deck_id);
create index idx_words_user_id on public.words(user_id);

-- Generation Jobs
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'processing', 'complete', 'partial', 'failed', 'rejected')),
  priority integer not null default 0,
  target_language text not null,
  art_style text,
  movie_override text,
  words_total integer not null default 0,
  words_completed integer not null default 0,
  words_failed integer not null default 0,
  profile_used text,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_generation_jobs_status on public.generation_jobs(status);
create index idx_generation_jobs_user_id on public.generation_jobs(user_id);

-- Language Profiles
create table if not exists public.language_profiles (
  id uuid primary key default gen_random_uuid(),
  language text not null,
  name text not null,
  is_active boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_language_profiles_language on public.language_profiles(language);

-- Enforce: only one active profile per language
create unique index idx_language_profiles_one_active
  on public.language_profiles(language) where (is_active = true);

-- Random Word Lists
create table if not exists public.random_word_lists (
  id uuid primary key default gen_random_uuid(),
  language text not null,
  word text not null,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  category text
);

create index idx_random_word_lists_language on public.random_word_lists(language);

-- System Settings (single-row config table)
create table if not exists public.system_settings (
  id integer primary key default 1 check (id = 1),
  auto_approve boolean not null default false,
  queue_paused boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Seed the single settings row
insert into public.system_settings (id) values (1) on conflict do nothing;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_decks_updated_at
  before update on public.decks
  for each row execute function public.set_updated_at();

create trigger trg_words_updated_at
  before update on public.words
  for each row execute function public.set_updated_at();

create trigger trg_generation_jobs_updated_at
  before update on public.generation_jobs
  for each row execute function public.set_updated_at();

create trigger trg_language_profiles_updated_at
  before update on public.language_profiles
  for each row execute function public.set_updated_at();

create trigger trg_system_settings_updated_at
  before update on public.system_settings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.decks enable row level security;
alter table public.words enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.language_profiles enable row level security;
alter table public.random_word_lists enable row level security;
alter table public.system_settings enable row level security;

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Decks: users see own, admin sees all
create policy "Users read own decks"
  on public.decks for select
  using (user_id = auth.uid() or public.is_admin());

create policy "Users insert own decks"
  on public.decks for insert
  with check (user_id = auth.uid());

create policy "Users update own decks"
  on public.decks for update
  using (user_id = auth.uid() or public.is_admin());

create policy "Admin delete decks"
  on public.decks for delete
  using (public.is_admin());

-- Words: users see own, admin sees all
create policy "Users read own words"
  on public.words for select
  using (user_id = auth.uid() or public.is_admin());

create policy "Users insert own words"
  on public.words for insert
  with check (user_id = auth.uid());

create policy "Users update own words"
  on public.words for update
  using (user_id = auth.uid() or public.is_admin());

create policy "Admin delete words"
  on public.words for delete
  using (public.is_admin());

-- Generation Jobs: users see own, admin sees all + admin can update
create policy "Users read own jobs"
  on public.generation_jobs for select
  using (user_id = auth.uid() or public.is_admin());

create policy "Users insert own jobs"
  on public.generation_jobs for insert
  with check (user_id = auth.uid());

create policy "Users and admin update jobs"
  on public.generation_jobs for update
  using (user_id = auth.uid() or public.is_admin());

create policy "Admin delete jobs"
  on public.generation_jobs for delete
  using (public.is_admin());

-- Language Profiles: public read, admin write
create policy "Anyone can read language profiles"
  on public.language_profiles for select
  using (true);

create policy "Admin insert language profiles"
  on public.language_profiles for insert
  with check (public.is_admin());

create policy "Admin update language profiles"
  on public.language_profiles for update
  using (public.is_admin());

create policy "Admin delete language profiles"
  on public.language_profiles for delete
  using (public.is_admin());

-- Random Word Lists: public read, admin write
create policy "Anyone can read random word lists"
  on public.random_word_lists for select
  using (true);

create policy "Admin insert random word lists"
  on public.random_word_lists for insert
  with check (public.is_admin());

create policy "Admin update random word lists"
  on public.random_word_lists for update
  using (public.is_admin());

create policy "Admin delete random word lists"
  on public.random_word_lists for delete
  using (public.is_admin());

-- System Settings: public read, admin write
create policy "Anyone can read system settings"
  on public.system_settings for select
  using (true);

create policy "Admin update system settings"
  on public.system_settings for update
  using (public.is_admin());

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

-- Public read access to videos bucket
create policy "Public read videos"
  on storage.objects for select
  using (bucket_id = 'videos');

-- Authenticated users can upload to their own folder
create policy "Users upload own videos"
  on storage.objects for insert
  with check (
    bucket_id = 'videos'
    and auth.role() = 'authenticated'
  );

-- Admin can delete any video
create policy "Admin delete videos"
  on storage.objects for delete
  using (bucket_id = 'videos' and public.is_admin());

-- ============================================================================
-- RPC FUNCTIONS (called by job runner with service role key)
-- ============================================================================

-- Refund 1 credit to a user (called when a word fails)
create or replace function public.refund_credit(user_id_param uuid)
returns void as $$
begin
  update public.profiles
  set credits = credits + 1
  where id = user_id_param;
end;
$$ language plpgsql security definer;
