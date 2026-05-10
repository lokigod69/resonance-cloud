# Phase 1H.3 Column Lock Implementation Prompt

Use this prompt for the next implementation phase. Do not treat this document as an applied migration.

## Mission

Implement a narrow post-Image-2/card column lock for final worker-owned `words` fields.

## Hard Safety Rules

- Work on `main`.
- Do not run broad `supabase db push`.
- Do not apply unrelated local-only migrations.
- Do not run migration repair except for the new migration after it is proven live.
- Do not enable quota enforcement.
- Do not call paid providers.
- Do not change Image-2/card behavior except for direct browser write protection.
- Use path-specific staging only. Do not use `git add .`.

## Proposed Migration

Create one new migration, for example:

```text
frontend/supabase/migrations/YYYYMMDDHHMMSS_phase1h3_lock_card_image_word_fields.sql
```

Proposed SQL:

```sql
-- Phase 1H.3: lock final worker-owned card/image/enrichment fields.
-- This migration intentionally extends the existing Phase 1E trigger instead
-- of adding a second overlapping words guard.

create or replace function public.phase1e_protect_words_pipeline_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.phase1e_is_trusted_mutation() then
    return new;
  end if;

  if new.status is distinct from old.status
     or new.current_stage is distinct from old.current_stage
     or new.video_url is distinct from old.video_url
     or new.thumbnail_url is distinct from old.thumbnail_url
     or new.video_url_b is distinct from old.video_url_b
     or new.thumbnail_url_b is distinct from old.thumbnail_url_b
     or new.music_state is distinct from old.music_state
     or new.retry_requested is distinct from old.retry_requested
     or new.failed_stage is distinct from old.failed_stage
     or new.stage_attempts is distinct from old.stage_attempts
     or new.total_stage_attempts is distinct from old.total_stage_attempts
     or new.stage_started_at is distinct from old.stage_started_at
     or new.bridge_mnemonic is distinct from old.bridge_mnemonic
     or new.visual_mnemonic is distinct from old.visual_mnemonic
     or new.dominant_emotional_reading is distinct from old.dominant_emotional_reading
     or new.composition_hint is distinct from old.composition_hint
     or new.treatment_hint is distinct from old.treatment_hint
     or new.metadata is distinct from old.metadata then
    raise exception 'Direct updates to worker-owned word fields are not allowed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.phase1e_protect_words_pipeline_fields() from public, anon, authenticated;
grant execute on function public.phase1e_protect_words_pipeline_fields() to service_role;
```

The existing trigger `phase1e_protect_words_pipeline_fields` already points at this function, so no trigger recreation should be necessary unless the live trigger is missing.

## Why These Columns

Lock now:

| Column | Reason |
| --- | --- |
| `bridge_mnemonic` | Enrichment/card prompt field written by backend. |
| `visual_mnemonic` | Image/storyboard worker writeback. |
| `dominant_emotional_reading` | Enrichment/card prompt semantics. |
| `composition_hint` | Enrichment/card render planning. |
| `treatment_hint` | Enrichment/card render planning. |
| `metadata` | Contains `visual_card_plan`, `layer2_eval`, `gpt_image_2_card`, provider prompt hash, and infographic learning metadata. |

Defer:

| Column | Reason |
| --- | --- |
| `mnemonic` | Mixed generated/display ownership; GPT Image-2 rewrites it, but future user/admin corrections may need an audited path. |
| `translation`, `etymology`, `pos`, `article`, `synonyms`, `ipa`, `example`, `example_gloss`, `tags` | Broader enrichment correction model should be designed before locking. |
| `tts_*`, `suno_*` | Audio/music worker-owned fields need separate audit. |

No lock needed:

| Field | Reason |
| --- | --- |
| `card_image_model` | Not a live `words` column. It is stored in job/settings payloads. |
| `card_layer2` | Not a live `words` column. It is stored in job/settings payloads and normalized into `metadata`. |

## Required Test Changes

Add or extend a targeted guard test, preferably under `frontend/scripts`, that:

1. Creates or locates a disposable owned word row through existing safe setup.
2. As an authenticated owner, attempts direct `words.update()` changes to:
   - `bridge_mnemonic`
   - `visual_mnemonic`
   - `dominant_emotional_reading`
   - `composition_hint`
   - `treatment_hint`
   - `metadata`
3. Asserts each direct update is rejected with the guard error or a permission error.
4. Verifies normal owner read still works.
5. Verifies existing allowed user/RPC flows still work, especially:
   - `submit_generation`
   - `request_word_retry`
   - `rate_word` or current rating RPC if present
   - `archive_word` if the test already covers cleanup
6. Uses service-role or trusted mutation to prove worker-owned writeback can still update the six locked fields.

Do not call real paid providers. Mock or avoid provider paths.

## Required Verification

Before applying to live:

```bash
git status --short
supabase migration list --linked
```

Apply only the new migration after explicit approval for the implementation phase. Do not run broad `supabase db push`.

After applying the single migration:

```bash
npm run test:phase1e:rls
npm run test:phase1h1:admin-config:guards
npm run test:regressions
npm run build
npm run typecheck:api
git diff --check
```

If a new script is added, run it explicitly and add it to `package.json` only if useful for repeated stabilization checks.

After live tests pass, repair only the new migration version if needed:

```bash
supabase migration repair --linked --status applied YYYYMMDDHHMMSS
supabase migration list --linked
```

Do not repair or apply unrelated local-only migrations.

## Expected Source Impact

No frontend source change should be required.

No worker source change should be required if these paths use a service-role Supabase client:

- `src/orchestration/feeder.py`
- `src/orchestration/card_worker.py`
- `src/orchestration/upstream_worker.py`
- `src/orchestration/downstream_worker.py`

If any worker write fails under the new guard, stop and fix the worker trust path rather than weakening the lock.

## Final Report Requirements

Report:

- migration version created
- whether SQL was applied
- whether migration repair was run
- exact columns locked
- worker-path verification result
- frontend/browser direct-write rejection result
- remaining local-only migration drift
- whether broad `db push` remains unsafe
