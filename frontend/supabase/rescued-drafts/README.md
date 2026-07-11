# Rescued SQL drafts (2026-07-11 cleanup pass)

These files are NOT part of the applied migration chain in `../migrations/` — do not move
them there (the supabase CLI would try to re-apply them). They were rescued out of
`_archive\` before its deletion because they exist nowhere else.

- `20260410000000_study_mode.sql`, `20260416000000_cost_tracking.sql`,
  `20260416000001_cost_rollup_views.sql`, `20260416000002_cost_rls_admin_read.sql` —
  April root-folder drafts, never committed, but **probably applied manually to Supabase**:
  typed/`study_mode` on `recall_attempts` and the admin costs dashboard both work in prod.
  Kept as the only record of that live schema. If ever confirmed redundant against the real
  schema (`supabase db diff`), they can be deleted.
- `20260517010000_guided_tts_v1.sql` — guided-TTS v1 draft, deliberately kept by owner
  decision (2026-07-11) as raw material for the future guided-path audio feature
  (listen-to-phrases where no video exists). Plan-first: do not apply or implement without
  an explicit owner go-ahead.
