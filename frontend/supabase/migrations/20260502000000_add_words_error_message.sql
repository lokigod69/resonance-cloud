-- DOCUMENTING + RPC MIGRATION
-- public.words.error_message is present in the tracked base schema
-- (20260322210000_phase2a_tables.sql). This keeps replay/prod state aligned
-- and extends mark_word_failed so orchestrator failures can persist a bounded
-- operational error summary.

alter table public.words add column if not exists error_message text;

drop function if exists public.mark_word_failed(uuid, text);

create or replace function public.mark_word_failed(
    p_word_id       uuid,
    p_failed_stage  text,
    p_error_message text default null
) returns boolean
language plpgsql
as $$
declare
    rows_affected integer;
begin
    update public.words
    set current_stage    = 'failed',
        status           = 'failed',
        failed_stage     = p_failed_stage,
        error_message    = left(p_error_message, 500),
        stage_started_at = now()
    where id            = p_word_id
      and current_stage != 'failed';

    get diagnostics rows_affected = row_count;
    return rows_affected = 1;
end;
$$;
