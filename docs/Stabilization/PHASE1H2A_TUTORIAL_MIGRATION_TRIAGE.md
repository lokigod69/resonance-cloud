# Phase 1H.2A Tutorial Migration Triage

Date: 2026-05-11

## Summary

Phase 1H.2A reconciled the retained tutorial persistence column used by profile loading:

- `frontend/src/hooks/useAuth.ts` selects `seen_tutorials` from `public.profiles`.
- `frontend/src/lib/supabase.ts` includes `seen_tutorials` in `AuthProfile`.
- Live `public.profiles.seen_tutorials` exists and is readable through the Supabase REST API.
- The tutorial migration history entry `20260510101944` was repaired as applied.
- No broad `supabase db push` was run.
- No unrelated local-only migrations were applied.

## Live Schema Check

Read-only service-role probe:

```text
GET /rest/v1/profiles?select=seen_tutorials&limit=1
status=200
body=[{"seen_tutorials":{}}]
```

PostgREST OpenAPI metadata for `profiles.seen_tutorials`:

```json
{
  "seen_tutorials": {
    "description": "Map of versioned tutorial keys (e.g. \"generate.v1\") to ISO 8601 timestamps of first dismissal/completion. Empty object {} means no tutorials seen.",
    "format": "jsonb"
  },
  "required": true
}
```

This matches the committed migration contract:

```sql
alter table public.profiles
  add column if not exists seen_tutorials jsonb not null default '{}'::jsonb;

comment on column public.profiles.seen_tutorials is
  'Map of versioned tutorial keys (e.g. "generate.v1") to ISO 8601 timestamps of first dismissal/completion. Empty object {} means no tutorials seen.';
```

The Supabase CLI schema dump path was not used for the final decision because this Windows environment does not have Docker available for `supabase db dump`. The REST and OpenAPI checks were read-only and sufficient to verify the frontend contract: the column exists, is `jsonb`, is non-null from the API contract, and carries the expected comment.

## Migration Decision

`20260510101944_profile_seen_tutorials.sql` was local-only before triage.

Because the live schema already contains `public.profiles.seen_tutorials`, SQL was not reapplied. Instead, only the migration history row was repaired:

```text
supabase migration repair --linked --status applied 20260510101944
```

After repair:

```text
20260510101944 | 20260510101944
```

No tutorial UI files were changed. The retained profile persistence path is intentionally preserved for a future video tutorial modal.

## Remaining Local-Only Migration Drift

The following local-only migration versions remain after Phase 1H.2A. They were not repaired or applied in this phase:

```text
20260404000000
20260406200000
20260406210000
20260407000000
20260408000000
20260409000000
20260409100000
20260416004500
20260418000000
20260418000100
20260418
20260418
20260420000000
20260420191500
20260420
20260421000000
20260422000000
20260423000000
20260429090000
20260501000000
20260501010000
20260501020000
20260501030000
20260502000000
20260503000000
20260503030000
20260503120000
20260504000000
20260504010000
20260505000000
20260506090000
20260506091000
20260506100000
20260506170000
20260509030000
20260509101721
20260510130000
```

## Next Recommended Phase

Phase 1H.2B should classify the remaining local-only migrations into:

1. Already-live schema changes that can be repaired after direct live verification.
2. Obsolete or superseded local migrations that should remain unrepaired until intentionally retired.
3. Still-needed migrations that require narrow, migration-specific application rather than broad `supabase db push`.

Keep excluding unrelated Image-2 / infographic columns and quota enforcement from this stabilization pass unless a later phase explicitly scopes them in.
