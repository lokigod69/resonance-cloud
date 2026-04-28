# Phase 1 Production DB Verification

Date: 2026-04-29

## Scope

Verification only. The three Phase 1 SQL migration files were not rerun.

Manually applied migration order, as reported by the operator:

1. `20260428090000_pre_bootstrap_stage.sql`
2. `20260428120000_phase1a_db_rls_auth_hardening.sql`
3. `20260428130000_phase1b_atomic_generation_retry.sql`

Linked Supabase project confirmed by CLI:

- Project ref: `rkiucrrusrwgcviodysp`
- Project name: `Resonanz`
- Status: `ACTIVE_HEALTHY`

## Read-Only Checks Run

### Supabase project link

Command:

```powershell
supabase projects list -o json
Get-Content frontend\supabase\.temp\project-ref
```

Result:

- `frontend/supabase/.temp/project-ref` is `rkiucrrusrwgcviodysp`.
- `supabase projects list` marks `rkiucrrusrwgcviodysp` / `Resonanz` as `linked: true`.

### PostgREST schema metadata

The local Supabase CLI can authenticate to the Supabase Management API. The service-role API key was fetched into memory through:

```powershell
supabase projects api-keys --project-ref rkiucrrusrwgcviodysp -o json
```

The key value was not printed or written to disk. It was used only for a read-only PostgREST OpenAPI metadata request:

```http
GET https://rkiucrrusrwgcviodysp.supabase.co/rest/v1/
Accept: application/openapi+json
apikey: [REDACTED service_role]
Authorization: Bearer [REDACTED service_role]
```

Exact result:

```text
rpc.submit_generation=True
rpc.request_word_retry=True
rpc.is_admin=True
rpc.redeem_invite_code=True
Table.generation_jobs=True
Table.words=True
generation_jobs.submit_idempotency_key=True
words.current_stage=True
openapi_path_count=36
openapi_definition_count=23
openapi_host=rkiucrrusrwgcviodysp.supabase.co:443
service_role_key_used=true redacted
```

Confirmed live through production metadata:

- `public.submit_generation(...)`
- `public.request_word_retry(...)`
- `public.is_admin()`
- `public.redeem_invite_code(text)`
- `generation_jobs.submit_idempotency_key`
- `words.current_stage`

### Anonymous RPC visibility checks

Command shape:

```http
POST https://rkiucrrusrwgcviodysp.supabase.co/rest/v1/rpc/<function>
apikey: [REDACTED anon]
Authorization: Bearer [REDACTED anon]
```

Exact result:

```text
rpc.is_admin.http=401 details={"code":"42501","details":null,"hint":null,"message":"permission denied for function is_admin"}
rpc.submit_generation.http=404 details=The remote server returned an error: (404) Not Found.
rpc.request_word_retry.http=404 details=The remote server returned an error: (404) Not Found.
rpc.redeem_invite_code.http=401 details=The remote server returned an error: (401) Unauthorized.
supabase_url_host=rkiucrrusrwgcviodysp.supabase.co
anon_key_found=true redacted
```

Interpretation:

- Anonymous callers do not have direct access to the protected RPC surface.
- This is not a substitute for authenticated normal-user RLS testing.

## SQL Checks Requested

These are the exact SQL checks that would fully verify the remaining non-OpenAPI objects from Supabase SQL editor or a direct read-only `psql` session:

```sql
select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer,
  p.proconfig as function_config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'submit_generation',
    'request_word_retry',
    'is_admin',
    'redeem_invite_code',
    'protect_profile_privileged_fields',
    'refund_credit'
  )
order by p.proname, args;

select
  c.relname as table_name,
  a.attname as column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'generation_jobs'
  and a.attname = 'submit_idempotency_key'
  and not a.attisdropped;

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and indexname = 'idx_generation_jobs_submit_idempotency';

select
  constraint_name,
  check_clause
from information_schema.check_constraints
where check_clause ilike '%pre_bootstrap%';
```

These SQL queries were not executed by Codex because:

- `supabase db dump` requires Docker on this machine and failed before producing schema output.
- Direct `psql` requires a database password that was not available in the shell.
- The Supabase Management API read-only SQL endpoint requires a Supabase access token that the CLI can use internally but does not expose as a shell-safe value.

## Conclusion

Production metadata confirms the Phase 1B API-facing DB surface is live. The trigger-only function `protect_profile_privileged_fields()` and index `idx_generation_jobs_submit_idempotency` still need direct SQL-editor or direct `psql` confirmation if a strict catalog-level audit is required.
