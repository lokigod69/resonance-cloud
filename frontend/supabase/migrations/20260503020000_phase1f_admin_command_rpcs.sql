-- Phase 1F audited admin command RPCs.
--
-- Moves privileged admin browser mutations behind SECURITY DEFINER RPCs with
-- audit records. Read paths remain RLS-governed table reads.

begin;

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  reason text,
  before jsonb,
  after jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_admin_audit_events_created_at
  on public.admin_audit_events (created_at desc);

create index if not exists idx_admin_audit_events_action_target
  on public.admin_audit_events (action, target_table, target_id);

alter table public.admin_audit_events enable row level security;

drop policy if exists "Admins read admin audit events" on public.admin_audit_events;
create policy "Admins read admin audit events"
  on public.admin_audit_events for select
  using (public.is_admin());

alter table public.generation_jobs
  add column if not exists admin_rejected_at timestamptz,
  add column if not exists admin_refunded_at timestamptz,
  add column if not exists admin_refund_amount integer not null default 0;

alter table public.generation_jobs
  drop constraint if exists generation_jobs_admin_refund_amount_check;

alter table public.generation_jobs
  add constraint generation_jobs_admin_refund_amount_check
  check (admin_refund_amount >= 0);

create or replace function public.phase1f_require_admin()
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  return v_actor;
end;
$$;

create or replace function public.phase1f_audit_admin_action(
  p_actor_user_id uuid,
  p_action text,
  p_target_table text,
  p_target_id text,
  p_reason text,
  p_before jsonb,
  p_after jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.admin_audit_events (
    actor_user_id,
    action,
    target_table,
    target_id,
    reason,
    before,
    after,
    metadata
  )
  values (
    p_actor_user_id,
    p_action,
    p_target_table,
    p_target_id,
    nullif(btrim(coalesce(p_reason, '')), ''),
    p_before,
    p_after,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.phase1e_is_trusted_mutation()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.role(), '') = 'service_role'
    or coalesce(current_setting('app.allow_phase1e_pipeline_update', true), '') = 'on';
$$;

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_safe_update_columns text[] := array[
    'display_name',
    'base_language',
    'theme',
    'skin',
    'onboarding_complete',
    'onboarding_completed',
    'onboarding_preferences',
    'updated_at'
  ];
  v_blocked_columns text;
  v_is_trusted boolean;
begin
  v_is_trusted :=
    coalesce(auth.role(), '') = 'service_role'
    or coalesce(current_setting('app.allow_profile_privileged_update', true), '') = 'on';

  if tg_op = 'INSERT' then
    if not v_is_trusted then
      if new.id is distinct from auth.uid() then
        raise exception 'Users can only insert their own profile'
          using errcode = '42501';
      end if;

      if coalesce(new.role, 'learner') <> 'learner'
         or coalesce(new.credits, 0) <> 0 then
        raise exception 'Users cannot set privileged profile fields'
          using errcode = '42501';
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' and not v_is_trusted then
    select string_agg(changed.key, ', ' order by changed.key)
    into v_blocked_columns
    from (
      select n.key
      from jsonb_each(to_jsonb(new)) as n(key, value)
      join jsonb_each(to_jsonb(old)) as o(key, value)
        on o.key = n.key
      where n.value is distinct from o.value
        and not (n.key = any (v_safe_update_columns))
    ) as changed;

    if v_blocked_columns is not null then
      raise exception 'Users can only update safe profile preference fields. Blocked: %',
        v_blocked_columns
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.phase1f_is_trusted_admin_command(p_flag text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.role(), '') = 'service_role'
    or coalesce(current_setting(p_flag, true), '') = 'on';
$$;

create or replace function public.phase1f_protect_admin_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.phase1f_is_trusted_admin_command('app.allow_admin_role_update') then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  raise exception 'Admin role changes must use audited admin RPCs'
    using errcode = '42501';
end;
$$;

drop trigger if exists phase1f_protect_admin_roles on public.admin_roles;
create trigger phase1f_protect_admin_roles
before insert or update or delete on public.admin_roles
for each row
execute function public.phase1f_protect_admin_roles();

create or replace function public.phase1f_protect_invite_codes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.phase1f_is_trusted_admin_command('app.allow_admin_invite_code_update') then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  raise exception 'Invite code changes must use audited admin RPCs'
    using errcode = '42501';
end;
$$;

drop trigger if exists phase1f_protect_invite_codes on public.invite_codes;
create trigger phase1f_protect_invite_codes
before insert or update or delete on public.invite_codes
for each row
execute function public.phase1f_protect_invite_codes();

create or replace function public.phase1f_protect_system_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.phase1f_is_trusted_admin_command('app.allow_admin_system_setting_update') then
    return new;
  end if;

  raise exception 'System setting changes must use audited admin RPCs'
    using errcode = '42501';
end;
$$;

drop trigger if exists phase1f_protect_system_settings on public.system_settings;
create trigger phase1f_protect_system_settings
before update on public.system_settings
for each row
execute function public.phase1f_protect_system_settings();

create or replace function public.admin_adjust_user_credits(
  p_user_id uuid,
  p_delta int,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.phase1f_require_admin();
  v_before public.profiles%rowtype;
  v_after public.profiles%rowtype;
  v_new_balance integer;
begin
  if p_delta is null or p_delta = 0 then
    raise exception 'Credit delta must be non-zero' using errcode = '22023';
  end if;

  select *
    into v_before
    from public.profiles
   where id = p_user_id
   for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  v_new_balance := v_before.credits + p_delta;
  if v_new_balance < 0 then
    raise exception 'Credit adjustment would make balance negative' using errcode = '22023';
  end if;

  perform set_config('app.allow_profile_privileged_update', 'on', true);

  update public.profiles
     set credits = v_new_balance
   where id = p_user_id
   returning * into v_after;

  perform public.phase1f_audit_admin_action(
    v_actor,
    'admin_adjust_user_credits',
    'profiles',
    p_user_id::text,
    p_reason,
    to_jsonb(v_before),
    to_jsonb(v_after),
    jsonb_build_object('delta', p_delta)
  );

  return jsonb_build_object(
    'user_id', p_user_id,
    'new_balance', v_after.credits,
    'delta', p_delta
  );
end;
$$;

create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.phase1f_require_admin();
  v_role text := lower(nullif(btrim(coalesce(p_role, '')), ''));
  v_before_profile public.profiles%rowtype;
  v_after_profile public.profiles%rowtype;
  v_admin_count integer;
begin
  if v_role not in ('admin', 'learner') then
    raise exception 'Invalid role: %', p_role using errcode = '22023';
  end if;

  select *
    into v_before_profile
    from public.profiles
   where id = p_user_id
   for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if v_role = 'learner' then
    select count(*)::integer
      into v_admin_count
      from public.admin_roles
     where user_id <> p_user_id;

    if exists (select 1 from public.admin_roles where user_id = p_user_id)
       and v_admin_count = 0 then
      raise exception 'Cannot remove the last admin' using errcode = '22023';
    end if;
  end if;

  perform set_config('app.allow_admin_role_update', 'on', true);
  perform set_config('app.allow_profile_privileged_update', 'on', true);

  if v_role = 'admin' then
    insert into public.admin_roles (user_id)
    values (p_user_id)
    on conflict (user_id)
    do update set updated_at = timezone('utc'::text, now());
  else
    delete from public.admin_roles
    where user_id = p_user_id;
  end if;

  update public.profiles
     set role = v_role
   where id = p_user_id
   returning * into v_after_profile;

  perform public.phase1f_audit_admin_action(
    v_actor,
    'admin_set_user_role',
    'profiles',
    p_user_id::text,
    p_reason,
    jsonb_build_object(
      'profile', to_jsonb(v_before_profile),
      'was_admin', exists(select 1 from public.admin_roles where user_id = p_user_id and v_role <> 'admin')
    ),
    jsonb_build_object('profile', to_jsonb(v_after_profile), 'role', v_role),
    '{}'::jsonb
  );

  return jsonb_build_object(
    'user_id', p_user_id,
    'role', v_after_profile.role,
    'is_admin', exists(select 1 from public.admin_roles where user_id = p_user_id)
  );
end;
$$;

create or replace function public.admin_create_invite_code(
  p_code text,
  p_credits int,
  p_max_uses int default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.phase1f_require_admin();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_inserted public.invite_codes%rowtype;
begin
  if v_code = '' or length(v_code) > 80 then
    raise exception 'Invite code is required and must be 80 characters or fewer'
      using errcode = '22023';
  end if;

  if v_code !~ '^[A-Z0-9][A-Z0-9_-]*$' then
    raise exception 'Invite code may contain only letters, numbers, underscores, and dashes'
      using errcode = '22023';
  end if;

  if p_credits is null or p_credits < 1 then
    raise exception 'Invite code credits must be at least 1'
      using errcode = '22023';
  end if;

  if p_max_uses is not null and p_max_uses < 1 then
    raise exception 'Invite code max_uses must be null or at least 1'
      using errcode = '22023';
  end if;

  perform set_config('app.allow_admin_invite_code_update', 'on', true);

  insert into public.invite_codes (
    code,
    credits,
    max_uses,
    is_active,
    created_by
  )
  values (
    v_code,
    p_credits,
    p_max_uses,
    true,
    v_actor
  )
  returning * into v_inserted;

  perform public.phase1f_audit_admin_action(
    v_actor,
    'admin_create_invite_code',
    'invite_codes',
    v_inserted.id::text,
    p_reason,
    null,
    to_jsonb(v_inserted),
    '{}'::jsonb
  );

  return jsonb_build_object(
    'id', v_inserted.id,
    'code', v_inserted.code,
    'credits', v_inserted.credits,
    'max_uses', v_inserted.max_uses,
    'is_active', v_inserted.is_active
  );
end;
$$;

create or replace function public.admin_toggle_invite_code(
  p_code_id uuid,
  p_active boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.phase1f_require_admin();
  v_before public.invite_codes%rowtype;
  v_after public.invite_codes%rowtype;
begin
  if p_active is null then
    raise exception 'p_active is required' using errcode = '22023';
  end if;

  select *
    into v_before
    from public.invite_codes
   where id = p_code_id
   for update;

  if not found then
    raise exception 'Invite code not found' using errcode = 'P0002';
  end if;

  perform set_config('app.allow_admin_invite_code_update', 'on', true);

  update public.invite_codes
     set is_active = p_active
   where id = p_code_id
   returning * into v_after;

  perform public.phase1f_audit_admin_action(
    v_actor,
    'admin_toggle_invite_code',
    'invite_codes',
    p_code_id::text,
    p_reason,
    to_jsonb(v_before),
    to_jsonb(v_after),
    '{}'::jsonb
  );

  return jsonb_build_object(
    'id', v_after.id,
    'code', v_after.code,
    'is_active', v_after.is_active
  );
end;
$$;

create or replace function public.admin_update_system_setting(
  p_key text,
  p_value jsonb,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.phase1f_require_admin();
  v_key text := lower(nullif(btrim(coalesce(p_key, '')), ''));
  v_bool boolean;
  v_before public.system_settings%rowtype;
  v_after public.system_settings%rowtype;
begin
  if v_key not in ('auto_approve', 'queue_paused') then
    raise exception 'Unknown system setting: %', p_key using errcode = '22023';
  end if;

  if p_value is null or jsonb_typeof(p_value) <> 'boolean' then
    raise exception 'System setting value must be boolean' using errcode = '22023';
  end if;

  v_bool := (p_value::text)::boolean;

  select *
    into v_before
    from public.system_settings
   where id = 1
   for update;

  if not found then
    insert into public.system_settings (id)
    values (1)
    returning * into v_before;
  end if;

  perform set_config('app.allow_admin_system_setting_update', 'on', true);

  if v_key = 'auto_approve' then
    update public.system_settings
       set auto_approve = v_bool
     where id = 1
     returning * into v_after;
  else
    update public.system_settings
       set queue_paused = v_bool
     where id = 1
     returning * into v_after;
  end if;

  perform public.phase1f_audit_admin_action(
    v_actor,
    'admin_update_system_setting',
    'system_settings',
    v_key,
    p_reason,
    to_jsonb(v_before),
    to_jsonb(v_after),
    jsonb_build_object('key', v_key, 'value', v_bool)
  );

  return jsonb_build_object('key', v_key, 'value', v_bool);
end;
$$;

create or replace function public.admin_approve_generation_job(
  p_job_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.phase1f_require_admin();
  v_before public.generation_jobs%rowtype;
  v_after public.generation_jobs%rowtype;
begin
  select *
    into v_before
    from public.generation_jobs
   where id = p_job_id
   for update;

  if not found then
    raise exception 'Generation job not found' using errcode = 'P0002';
  end if;

  if v_before.status <> 'pending' then
    raise exception 'Only pending jobs can be approved' using errcode = '22023';
  end if;

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  update public.generation_jobs
     set status = 'approved',
         error_message = null
   where id = p_job_id
   returning * into v_after;

  perform public.phase1f_audit_admin_action(
    v_actor,
    'admin_approve_generation_job',
    'generation_jobs',
    p_job_id::text,
    p_reason,
    to_jsonb(v_before),
    to_jsonb(v_after),
    '{}'::jsonb
  );

  return jsonb_build_object(
    'job_id', v_after.id,
    'status', v_after.status
  );
end;
$$;

create or replace function public.admin_reject_generation_job(
  p_job_id uuid,
  p_refund boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.phase1f_require_admin();
  v_before public.generation_jobs%rowtype;
  v_after public.generation_jobs%rowtype;
  v_profile_before public.profiles%rowtype;
  v_profile_after public.profiles%rowtype;
  v_refund_requested boolean := coalesce(p_refund, false);
  v_refund_amount integer := 0;
  v_refunded boolean := false;
begin
  select *
    into v_before
    from public.generation_jobs
   where id = p_job_id
   for update;

  if not found then
    raise exception 'Generation job not found' using errcode = 'P0002';
  end if;

  if v_before.status not in ('pending', 'approved', 'processing', 'partial', 'failed', 'rejected') then
    raise exception 'Job status % cannot be rejected', v_before.status using errcode = '22023';
  end if;

  if v_refund_requested and coalesce(v_before.admin_refund_amount, 0) = 0 then
    v_refund_amount := greatest(coalesce(v_before.credits_charged, 0), 0);
  end if;

  if v_refund_amount > 0 then
    select *
      into v_profile_before
      from public.profiles
     where id = v_before.user_id
     for update;

    if not found then
      raise exception 'Job owner profile not found' using errcode = 'P0002';
    end if;

    perform set_config('app.allow_profile_privileged_update', 'on', true);

    update public.profiles
       set credits = credits + v_refund_amount
     where id = v_before.user_id
     returning * into v_profile_after;

    v_refunded := true;
  end if;

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  update public.generation_jobs
     set status = 'rejected',
         completed_at = coalesce(completed_at, now()),
         admin_rejected_at = coalesce(admin_rejected_at, now()),
         admin_refunded_at = case
           when v_refund_amount > 0 then now()
           else admin_refunded_at
         end,
         admin_refund_amount = case
           when v_refund_amount > 0 then v_refund_amount
           else admin_refund_amount
         end
   where id = p_job_id
   returning * into v_after;

  perform public.phase1f_audit_admin_action(
    v_actor,
    'admin_reject_generation_job',
    'generation_jobs',
    p_job_id::text,
    p_reason,
    jsonb_build_object(
      'job', to_jsonb(v_before),
      'profile', case when v_profile_before.id is null then null else to_jsonb(v_profile_before) end
    ),
    jsonb_build_object(
      'job', to_jsonb(v_after),
      'profile', case when v_profile_after.id is null then null else to_jsonb(v_profile_after) end
    ),
    jsonb_build_object(
      'original_status', v_before.status,
      'refund_requested', v_refund_requested,
      'refund_amount', v_refund_amount,
      'refunded', v_refunded
    )
  );

  return jsonb_build_object(
    'job_id', v_after.id,
    'status', v_after.status,
    'refund_amount', v_refund_amount,
    'refunded', v_refunded,
    'credits_charged', v_after.credits_charged
  );
end;
$$;

create or replace function public.admin_archive_content(
  p_kind text,
  p_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.phase1f_require_admin();
  v_kind text := lower(nullif(btrim(coalesce(p_kind, '')), ''));
  v_word public.words%rowtype;
  v_deck public.decks%rowtype;
  v_word_count integer := 0;
begin
  if v_kind not in ('word', 'deck') then
    raise exception 'Unsupported content kind: %', p_kind using errcode = '22023';
  end if;

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  if v_kind = 'word' then
    select *
      into v_word
      from public.words
     where id = p_id
     for update;

    if not found then
      raise exception 'Word not found' using errcode = 'P0002';
    end if;

    perform public.phase1e_queue_word_storage_cleanup(
      v_word.id,
      v_word.user_id,
      v_word.deck_id,
      v_word.word,
      v_word.video_url,
      v_word.thumbnail_url,
      v_word.video_url_b,
      v_word.thumbnail_url_b
    );

    delete from public.words
    where id = v_word.id;

    perform public.phase1e_recalculate_deck(v_word.deck_id);

    perform public.phase1f_audit_admin_action(
      v_actor,
      'admin_archive_content',
      'words',
      p_id::text,
      p_reason,
      to_jsonb(v_word),
      null,
      jsonb_build_object('kind', v_kind, 'deck_id', v_word.deck_id)
    );

    return jsonb_build_object('kind', v_kind, 'id', p_id, 'deck_id', v_word.deck_id);
  end if;

  select *
    into v_deck
    from public.decks
   where id = p_id
   for update;

  if not found then
    raise exception 'Deck not found' using errcode = 'P0002';
  end if;

  for v_word in
    select *
    from public.words
    where deck_id = v_deck.id
    for update
  loop
    v_word_count := v_word_count + 1;

    perform public.phase1e_queue_word_storage_cleanup(
      v_word.id,
      v_word.user_id,
      v_word.deck_id,
      v_word.word,
      v_word.video_url,
      v_word.thumbnail_url,
      v_word.video_url_b,
      v_word.thumbnail_url_b
    );
  end loop;

  delete from public.decks
  where id = v_deck.id;

  perform public.phase1f_audit_admin_action(
    v_actor,
    'admin_archive_content',
    'decks',
    p_id::text,
    p_reason,
    to_jsonb(v_deck),
    null,
    jsonb_build_object('kind', v_kind, 'word_count', v_word_count)
  );

  return jsonb_build_object('kind', v_kind, 'id', p_id, 'word_count', v_word_count);
end;
$$;

revoke all on function public.phase1f_require_admin() from public, anon, authenticated;
revoke all on function public.phase1f_audit_admin_action(uuid, text, text, text, text, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.phase1f_is_trusted_admin_command(text) from public, anon, authenticated;
revoke all on function public.phase1f_protect_admin_roles() from public, anon, authenticated;
revoke all on function public.phase1f_protect_invite_codes() from public, anon, authenticated;
revoke all on function public.phase1f_protect_system_settings() from public, anon, authenticated;

revoke all on function public.admin_adjust_user_credits(uuid, int, text) from public, anon;
revoke all on function public.admin_set_user_role(uuid, text, text) from public, anon;
revoke all on function public.admin_create_invite_code(text, int, int, text) from public, anon;
revoke all on function public.admin_toggle_invite_code(uuid, boolean, text) from public, anon;
revoke all on function public.admin_update_system_setting(text, jsonb, text) from public, anon;
revoke all on function public.admin_approve_generation_job(uuid, text) from public, anon;
revoke all on function public.admin_reject_generation_job(uuid, boolean, text) from public, anon;
revoke all on function public.admin_archive_content(text, uuid, text) from public, anon;

grant execute on function public.admin_adjust_user_credits(uuid, int, text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, text, text) to authenticated;
grant execute on function public.admin_create_invite_code(text, int, int, text) to authenticated;
grant execute on function public.admin_toggle_invite_code(uuid, boolean, text) to authenticated;
grant execute on function public.admin_update_system_setting(text, jsonb, text) to authenticated;
grant execute on function public.admin_approve_generation_job(uuid, text) to authenticated;
grant execute on function public.admin_reject_generation_job(uuid, boolean, text) to authenticated;
grant execute on function public.admin_archive_content(text, uuid, text) to authenticated;

notify pgrst, 'reload schema';

commit;
