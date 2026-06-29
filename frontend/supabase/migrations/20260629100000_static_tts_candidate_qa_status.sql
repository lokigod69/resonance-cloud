-- Allow static thematic TTS candidate rows for owner listening review.
--
-- Candidate rows remain excluded from public.static_tts_playback because that
-- view only exposes qa_status in ('ready', 'approved').

begin;

alter table public.static_tts_asset_usages
  drop constraint if exists static_tts_asset_usages_qa_status_check;

alter table public.static_tts_asset_usages
  add constraint static_tts_asset_usages_qa_status_check
  check (qa_status in ('pending', 'ready', 'approved', 'candidate', 'rejected', 'failed'));

notify pgrst, 'reload schema';

commit;
