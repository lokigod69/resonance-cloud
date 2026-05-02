# Phase 1F.0 Credit Pricing Reconciliation Precheck

Date: 2026-05-02

## Git and Migration Inventory

- Current HEAD before Phase 1F.0 edits: `b9d22d6bc47b3ce0dced9a261f01ad104ad5e50a`.
- Initial dirty tracked files were unrelated duration/settings work:
  - `frontend/src/components/settings/fieldConfigs.ts`
  - `frontend/src/lib/translations.ts`
  - `frontend/src/pages/GenerateGO.tsx`
  - `frontend/src/pages/GeneratePG.tsx`
  - `tests/test_frontend_duration_fields.py`
- Initial untracked files included stabilization/report docs, `frontend/src/components/generate/steps/CardImageStyleStep.tsx`, `frontend/supabase/migrations/20260502120000_add_deck_type_to_submit_generation.sql`, `frontend/supabase/migrations/20260503000000_get_user_words_for_language.sql`, and a stray shell-named file.
- `supabase migration list --linked` showed `20260502120000` as local-only.
- `supabase migration list --linked` showed `20260502210000` as local-only.
- Unexpected unrelated local-only migrations also exist, including older April/May migrations and `20260503000000_get_user_words_for_language.sql`. They were not part of Phase 1F.0 and were not applied through broad `db push`.
- Phase 1E migrations `20260502160000`, `20260502170000`, `20260502180000`, `20260502190000`, `20260502220000`, and `20260502230000` were aligned local/remote.

## Live Schema and Function State Before Phase 1F.0

Live schema inspection was read-only.

- `public.decks.deck_type` exists, is `text not null default 'video'`, and has `decks_deck_type_check` for `video` and `card`.
- `public.generation_jobs.credits_charged` did not exist.
- `public.generation_jobs.credit_cost_per_word` did not exist.
- `public.generation_jobs.deck_type` did not exist.
- `public.generation_jobs.generation_type` did not exist.
- `public.submit_generation` included `v_credit_cost_per_word` and `v_credits_required`, so live DB was partially ahead of recorded migration history.
- Live `submit_generation` used the existing deck's stored `deck_type` for existing-deck appends.
- Live `submit_generation` did not return `deck_type`, `credit_cost_per_word`, or `credits_charged`.
- Live `submit_generation` did not set `app.allow_phase1e_pipeline_update` before updating `decks.status` and `decks.word_count`.
- Live `submit_generation` did set `app.allow_profile_privileged_update` before debiting `profiles.credits`.
- Existing-deck append was at risk under Phase 1E deck triggers because the deck pipeline update lacked the trusted flag.
- `public.request_word_retry` still debited exactly 1 credit and set `app.allow_phase1e_pipeline_update` before word/deck pipeline updates and `app.allow_profile_privileged_update` before debit.
- Relevant Phase 1E triggers were live on `decks`, `words`, and `generation_jobs`.
- `public.api_quota_settings.enforcement_enabled` was `false`; quota remained monitor-only/off.

## Pricing Migration State

`20260502120000_add_deck_type_to_submit_generation.sql`:

- Local-only.
- Not recorded in remote migration history.
- Stale because it debits 1 credit per word, accepts browser deck type for existing-deck paths, and lacks Phase 1E deck-update trusted flag handling.

`20260502210000_credit_cost_per_deck_type.sql`:

- Local-only.
- Not recorded in remote migration history.
- Superseded by live partial state and the Phase 1F.0 requirements.
- Stale because it does not add `generation_jobs.credits_charged`, does not persist `credit_cost_per_word`/`deck_type`, does not return idempotent `credits_charged`, and does not set the Phase 1E deck-update trusted flag before updating `decks`.

## Recommendation

Do not repair either old local-only pricing migration into remote history and do not apply them blindly. Remove both from the active migrations folder and replace them with one canonical Phase 1F.0 migration:

- `frontend/supabase/migrations/20260503010000_phase1f0_credit_pricing_canonical.sql`

Apply only the canonical migration manually because broad `supabase db push` would also try to apply unrelated local-only migrations. After manual SQL apply, repair only the canonical migration version into Supabase migration history.
