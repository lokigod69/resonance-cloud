-- German B1 adds two guided-TTS playback surfaces (design doc §4.7 / B1 spec §5):
-- 'dialogue' keys the episode's non-core turns as turn-1/turn-3/turn-4 and
-- 'pattern' keys the spotlight examples as ex-1..ex-N. The usages table's
-- surface check predates B1 and rejected both, aborting the first B1 batch
-- run mid-flight (2026-07-17; paid assets were kept ready, usages reattach on
-- rerun). The guided_tts_playback view joins usages without filtering on
-- surface, so no view change is needed.

alter table public.guided_tts_asset_usages
  drop constraint if exists guided_tts_asset_usages_surface_check;

alter table public.guided_tts_asset_usages
  add constraint guided_tts_asset_usages_surface_check
    check (surface in ('corePhrase', 'chunk', 'trophyWord', 'speakTarget', 'dialogue', 'pattern'));
