-- Add a dedicated quota action for Lens visual scans.
--
-- Enforcement is intentionally not changed here. The global
-- api_quota_settings.enforcement_enabled flag remains whatever it already is.

begin;

alter table public.api_quota_config
  drop constraint if exists api_quota_config_action_check;

alter table public.api_quota_config
  add constraint api_quota_config_action_check
  check (action in ('voice_chat', 'guided_transcribe', 'suggest_words', 'grok_token', 'visual_scan'));

alter table public.api_quota_usage
  drop constraint if exists api_quota_usage_action_check;

alter table public.api_quota_usage
  add constraint api_quota_usage_action_check
  check (action in ('voice_chat', 'guided_transcribe', 'suggest_words', 'grok_token', 'visual_scan'));

insert into public.api_quota_config (
  action,
  per_minute,
  per_day,
  hard_max_per_minute,
  hard_max_per_day
) values (
  'visual_scan',
  6,
  30,
  15,
  300
)
on conflict (action) do update
set
  per_minute = excluded.per_minute,
  per_day = excluded.per_day,
  hard_max_per_minute = excluded.hard_max_per_minute,
  hard_max_per_day = excluded.hard_max_per_day,
  updated_at = now();

commit;
