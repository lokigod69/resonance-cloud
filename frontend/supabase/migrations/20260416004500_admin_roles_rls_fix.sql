-- Break profiles/is_admin recursion by moving admin membership to public.admin_roles.
create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create or replace function public.touch_admin_roles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists admin_roles_set_updated_at on public.admin_roles;
create trigger admin_roles_set_updated_at
before update on public.admin_roles
for each row
execute function public.touch_admin_roles_updated_at();

alter table public.admin_roles enable row level security;

drop policy if exists "Users read own admin role" on public.admin_roles;
create policy "Users read own admin role"
  on public.admin_roles for select
  using (user_id = auth.uid());

create or replace function public.sync_admin_role_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.admin_roles where user_id = old.id;
    return old;
  end if;

  if new.role = 'admin' then
    insert into public.admin_roles (user_id)
    values (new.id)
    on conflict (user_id)
    do update set updated_at = timezone('utc'::text, now());
  else
    delete from public.admin_roles where user_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_admin_role_from_profile on public.profiles;
create trigger sync_admin_role_from_profile
after insert or update of role or delete on public.profiles
for each row
execute function public.sync_admin_role_from_profile();

insert into public.admin_roles (user_id)
select id
from public.profiles
where role = 'admin'
on conflict (user_id) do nothing;

delete from public.admin_roles
where user_id in (
  select id
  from public.profiles
  where role is distinct from 'admin'
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_roles
    where user_id = auth.uid()
  );
$$;
