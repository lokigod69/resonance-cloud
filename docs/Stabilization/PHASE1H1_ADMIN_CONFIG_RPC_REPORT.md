# Phase 1H.1 Admin Config RPC Report

Date: 2026-05-10

## Scope

Phase 1H.1 closes the remaining non-Image admin direct-write gaps:

- `frontend/src/pages/admin/Content.tsx` no longer directly updates `words.needs_review`.
- `frontend/src/pages/admin/Profiles.tsx` no longer directly inserts, updates, or deletes `language_profiles`.
- `frontend/src/pages/admin/Voices.tsx` no longer directly inserts, updates, or deletes `voices`.

Image-2 / infographic columns were intentionally left untouched.

## Migrations

Phase 1H.1 is intentionally split into two migrations to avoid a deployment race:

- `frontend/supabase/migrations/20260510110000_phase1h1_admin_config_rpcs.sql`
- `frontend/supabase/migrations/20260510120000_phase1h1_admin_config_guards.sql`

The first migration is additive. It adds RPCs only and does not block existing direct table writes. This lets SQL be applied before the frontend deploys without breaking the old admin pages.

The second migration is enforcement-only. It adds direct-write denial guards after the frontend has moved to RPC calls.

Added RPCs:

- `admin_set_word_review_flag(p_word_id uuid, p_needs_review boolean, p_reason text)`
- `admin_upsert_language_profile(p_profile_id uuid, p_language text, p_name text, p_settings jsonb, p_notes text, p_reason text)`
- `admin_set_language_profile_active(p_profile_id uuid, p_is_active boolean, p_reason text)`
- `admin_delete_language_profile(p_profile_id uuid, p_reason text)`
- `admin_upsert_voice(p_voice_row_id uuid, p_voice_id text, p_name text, p_language text, p_language_code text, p_notes text, p_reason text)`
- `admin_delete_voice(p_voice_row_id uuid, p_reason text)`

## Guard Behavior

`20260510120000_phase1h1_admin_config_guards.sql` adds `phase1h1_is_trusted_admin_config_update()` and guard triggers.

Allowed writers:

- `service_role`
- RPCs that set transaction-local `app.allow_admin_config_update = on`

Blocked direct browser/admin table writes:

- `words.needs_review` updates
- `language_profiles` insert/update/delete
- `voices` insert/update/delete

Admin UI reads remain table reads.

## Audit Behavior

Each RPC writes `admin_audit_events` through existing Phase 1F helper `phase1f_audit_admin_action`.

Audit actions:

- `admin_set_word_review_flag`
- `admin_upsert_language_profile`
- `admin_set_language_profile_active`
- `admin_delete_language_profile`
- `admin_upsert_voice`
- `admin_delete_voice`

## Frontend Changes

Fixed reason strings are used for now:

- `Admin content review flag update`
- `Admin language profile update`
- `Admin voice registry update`

Richer reason-entry UX remains a later admin usability task.

## Migration Status

Both migrations are local-only in `supabase migration list --linked` at the time of this report.

Live probes show that both RPCs and guards are present in the live schema, so the SQL appears to have been applied outside this shell. Migration history has not been repaired for either version.

Manual apply order:

1. Apply `20260510110000_phase1h1_admin_config_rpcs.sql`.
2. Deploy frontend that calls the new RPCs.
3. Run `npm run test:phase1h1:admin-config`.
4. Repair/record only `20260510110000` after confirming the SQL actually ran.
5. Apply `20260510120000_phase1h1_admin_config_guards.sql`.
6. Run `npm run test:phase1h1:admin-config:guards`.
7. Repair/record only `20260510120000` after confirming the SQL actually ran.

Broad `supabase db push` remains unsafe due to unresolved local-only migration drift.

## Quota Status

Quota enforcement remains monitor-only/off. This phase does not change quota settings.

## Remaining Next Phase

Recommended next phase after live Phase 1H.1 application:

Phase 1H.2: migration drift reconciliation execution plan, followed by storage cleanup operationalization and provider spend kill switch work.
