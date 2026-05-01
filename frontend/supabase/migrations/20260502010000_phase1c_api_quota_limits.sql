-- Phase 1C paid API quota/rate tracking.
--
-- Default mode is monitor-only: usage is recorded, but over-limit requests are
-- not blocked until enforcement is enabled by an admin RPC.

begin;

create table if not exists public.api_quota_settings (
  id boolean primary key default true,
  enforcement_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint api_quota_settings_singleton check (id)
);

create table if not exists public.api_quota_config (
  action text primary key,
  per_minute integer not null,
  per_day integer not null,
  hard_max_per_minute integer not null,
  hard_max_per_day integer not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint api_quota_config_action_check check (action in ('voice_chat', 'suggest_words', 'grok_token')),
  constraint api_quota_config_positive_check check (
    per_minute > 0
    and per_day > 0
    and hard_max_per_minute > 0
    and hard_max_per_day > 0
  ),
  constraint api_quota_config_hard_max_check check (
    per_minute <= hard_max_per_minute
    and per_day <= hard_max_per_day
  )
);

create table if not exists public.api_quota_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  window_type text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, action, window_type, window_start),
  constraint api_quota_usage_action_check check (action in ('voice_chat', 'suggest_words', 'grok_token')),
  constraint api_quota_usage_window_type_check check (window_type in ('minute', 'day')),
  constraint api_quota_usage_count_check check (count >= 0)
);

create table if not exists public.api_quota_audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  action text,
  details jsonb not null default '{}'::jsonb
);

insert into public.api_quota_settings (id, enforcement_enabled)
values (true, false)
on conflict (id) do nothing;

insert into public.api_quota_config (
  action,
  per_minute,
  per_day,
  hard_max_per_minute,
  hard_max_per_day
) values
  ('suggest_words', 10, 200, 30, 1000),
  ('voice_chat', 6, 120, 15, 500),
  ('grok_token', 3, 40, 10, 150)
on conflict (action) do update
set
  per_minute = excluded.per_minute,
  per_day = excluded.per_day,
  hard_max_per_minute = excluded.hard_max_per_minute,
  hard_max_per_day = excluded.hard_max_per_day,
  updated_at = now();

create index if not exists idx_api_quota_usage_action_window
  on public.api_quota_usage (action, window_type, window_start desc);

create index if not exists idx_api_quota_audit_created_at
  on public.api_quota_audit_events (created_at desc);

alter table public.api_quota_settings enable row level security;
alter table public.api_quota_config enable row level security;
alter table public.api_quota_usage enable row level security;
alter table public.api_quota_audit_events enable row level security;

drop policy if exists "Admins read api quota settings" on public.api_quota_settings;
create policy "Admins read api quota settings"
  on public.api_quota_settings for select
  using (public.is_admin());

drop policy if exists "Admins read api quota config" on public.api_quota_config;
create policy "Admins read api quota config"
  on public.api_quota_config for select
  using (public.is_admin());

drop policy if exists "Users read own api quota usage" on public.api_quota_usage;
create policy "Users read own api quota usage"
  on public.api_quota_usage for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins read api quota audit" on public.api_quota_audit_events;
create policy "Admins read api quota audit"
  on public.api_quota_audit_events for select
  using (public.is_admin());

create or replace function public.consume_api_quota(
  p_user_id uuid,
  p_action text,
  p_request_fingerprint text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.api_quota_config%rowtype;
  v_enforcement_enabled boolean;
  v_mode text;
  v_now timestamptz := now();
  v_minute_start timestamptz := date_trunc('minute', v_now);
  v_day_start timestamptz := date_trunc('day', v_now at time zone 'utc') at time zone 'utc';
  v_minute_count integer;
  v_day_count integer;
  v_allowed boolean;
  v_reason text := null;
  v_retry_after integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'consume_api_quota is restricted to trusted server paths'
      using errcode = '42501';
  end if;

  select *
  into v_config
  from public.api_quota_config
  where action = p_action;

  if not found then
    return jsonb_build_object(
      'allowed', false,
      'mode', 'enforced',
      'action', p_action,
      'limit_per_minute', 0,
      'limit_per_day', 0,
      'remaining_minute', 0,
      'remaining_day', 0,
      'retry_after_seconds', 60,
      'reason', 'unknown_action'
    );
  end if;

  select enforcement_enabled
  into v_enforcement_enabled
  from public.api_quota_settings
  where id = true;

  v_enforcement_enabled := coalesce(v_enforcement_enabled, false);
  v_mode := case when v_enforcement_enabled then 'enforced' else 'monitor_only' end;

  insert into public.api_quota_usage (user_id, action, window_type, window_start, count)
  values (p_user_id, p_action, 'minute', v_minute_start, 1)
  on conflict (user_id, action, window_type, window_start)
  do update set
    count = public.api_quota_usage.count + 1,
    last_seen_at = now()
  returning count into v_minute_count;

  insert into public.api_quota_usage (user_id, action, window_type, window_start, count)
  values (p_user_id, p_action, 'day', v_day_start, 1)
  on conflict (user_id, action, window_type, window_start)
  do update set
    count = public.api_quota_usage.count + 1,
    last_seen_at = now()
  returning count into v_day_count;

  if v_minute_count > v_config.per_minute then
    v_reason := 'minute_limit_exceeded';
    v_retry_after := greatest(1, ceil(extract(epoch from (v_minute_start + interval '1 minute' - v_now)))::integer);
  elsif v_day_count > v_config.per_day then
    v_reason := 'daily_limit_exceeded';
    v_retry_after := greatest(1, ceil(extract(epoch from (v_day_start + interval '1 day' - v_now)))::integer);
  end if;

  v_allowed := (not v_enforcement_enabled) or v_reason is null;

  if not v_allowed then
    insert into public.api_quota_audit_events (actor_user_id, event_type, action, details)
    values (
      p_user_id,
      'quota_denied',
      p_action,
      jsonb_build_object(
        'reason', v_reason,
        'minute_count', v_minute_count,
        'day_count', v_day_count,
        'request_fingerprint', p_request_fingerprint
      )
    );
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'mode', v_mode,
    'action', p_action,
    'limit_per_minute', v_config.per_minute,
    'limit_per_day', v_config.per_day,
    'remaining_minute', greatest(v_config.per_minute - v_minute_count, 0),
    'remaining_day', greatest(v_config.per_day - v_day_count, 0),
    'retry_after_seconds', case when v_allowed then 0 else v_retry_after end,
    'reason', v_reason
  );
end;
$$;

create or replace function public.get_api_quota_admin_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'settings', (
      select to_jsonb(s)
      from public.api_quota_settings s
      where s.id = true
    ),
    'config', (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.action), '[]'::jsonb)
      from public.api_quota_config c
    ),
    'usage_last_24h', (
      select coalesce(jsonb_agg(row_to_json(u) order by u.action), '[]'::jsonb)
      from (
        select action, sum(count)::integer as total
        from public.api_quota_usage
        where window_type = 'day'
          and window_start >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'
        group by action
      ) u
    )
  );
end;
$$;

create or replace function public.set_api_quota_enforcement(p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  update public.api_quota_settings
  set enforcement_enabled = p_enabled,
      updated_at = now(),
      updated_by = v_user_id
  where id = true;

  insert into public.api_quota_audit_events (actor_user_id, event_type, details)
  values (v_user_id, 'quota_enforcement_updated', jsonb_build_object('enabled', p_enabled));

  return public.get_api_quota_admin_snapshot();
end;
$$;

create or replace function public.update_api_quota_config(
  p_action text,
  p_per_minute integer,
  p_per_day integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_config public.api_quota_config%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select *
  into v_config
  from public.api_quota_config
  where action = p_action;

  if not found then
    raise exception 'Unknown API quota action' using errcode = '22023';
  end if;

  if p_per_minute < 1
     or p_per_day < 1
     or p_per_minute > v_config.hard_max_per_minute
     or p_per_day > v_config.hard_max_per_day then
    raise exception 'Quota values exceed hard maximums' using errcode = '22023';
  end if;

  update public.api_quota_config
  set per_minute = p_per_minute,
      per_day = p_per_day,
      updated_at = now(),
      updated_by = v_user_id
  where action = p_action;

  insert into public.api_quota_audit_events (actor_user_id, event_type, action, details)
  values (
    v_user_id,
    'quota_config_updated',
    p_action,
    jsonb_build_object('per_minute', p_per_minute, 'per_day', p_per_day)
  );

  return public.get_api_quota_admin_snapshot();
end;
$$;

revoke all on function public.consume_api_quota(uuid, text, text) from public, anon, authenticated;
grant execute on function public.consume_api_quota(uuid, text, text) to service_role;

revoke all on function public.get_api_quota_admin_snapshot() from public, anon;
revoke all on function public.set_api_quota_enforcement(boolean) from public, anon;
revoke all on function public.update_api_quota_config(text, integer, integer) from public, anon;
grant execute on function public.get_api_quota_admin_snapshot() to authenticated, service_role;
grant execute on function public.set_api_quota_enforcement(boolean) to authenticated, service_role;
grant execute on function public.update_api_quota_config(text, integer, integer) to authenticated, service_role;

commit;
