# Phase 1H.3 Post Image-2 Column Lock Audit

Date: 2026-05-11

Scope: investigation and documentation only. No SQL was applied, no broad `supabase db push` was run, no migration repair was run, no RLS or trigger was edited, and no Image-2 columns were locked in this phase.

## Inventory

Working tree at audit start was clean on `main`.

Migration inventory was read with:

```bash
supabase migration list --linked
```

Relevant aligned migrations:

| Version | Status |
| --- | --- |
| `20260510101944` | Local + Remote |
| `20260510110000` | Local + Remote |
| `20260510120000` | Local + Remote |

Broad migration drift remains. This phase did not reconcile old local-only migrations.

The live `public.words` schema was inspected read-only. Relevant live columns include:

| Column | Type | Notes |
| --- | --- | --- |
| `word` | `text` | Original/display target word, rewritten by enrichment when normalized. |
| `original_input` | `text` | Submit-time input audit field. |
| `translation` | `text` | Enrichment output. |
| `mnemonic` | `text` | Enrichment output, later rewritten by GPT Image-2 cards to the displayed mnemonic. |
| `etymology` | `text` | Enrichment output. |
| `pos` | `text` | Enrichment output. |
| `article` | `text` | Enrichment output. |
| `synonyms` | `text` | Enrichment output. |
| `ipa` | `text` | Enrichment output. |
| `example` | `text` | Legacy usage example target text. |
| `example_gloss` | `text` | Legacy usage example base-language gloss. |
| `tags` | `text` | Enrichment output. |
| `metadata` | `jsonb` | Worker metadata, including card/image/enrichment blobs. |
| `bridge_mnemonic` | `text` | Enrichment/card prompt field. |
| `visual_mnemonic` | `text` | Image/storyboard worker writeback. |
| `dominant_emotional_reading` | `text` | Enrichment/card prompt field. |
| `composition_hint` | `text` | Enrichment/card prompt field. |
| `treatment_hint` | `text` | Enrichment/card prompt field. |
| `video_url` / `thumbnail_url` | `text` | Worker media fields. |
| `video_url_b` / `thumbnail_url_b` | `text` | Worker media fields. |
| `tts_audio_url` / `tts_status` / `tts_voice_id` / `tts_generated_at` | mixed | Card pronunciation TTS writeback. |

Columns checked but not present on live `public.words`:

| Name | Result | Current source meaning |
| --- | --- | --- |
| `card_image_model` | Not a live `words` column | Stored in `generation_jobs.settings_override` and language profile settings, then consumed by card workers. Some frontend types still allow a derived/legacy optional value for display. |
| `image_url` / `image_urls` / `card_image_url` | Not live `words` columns | Legacy/type-level naming only in the inspected surface. Current card image output uses `thumbnail_url`. |

## Current Protection

Live trigger on `public.words`:

| Trigger | Function | Purpose |
| --- | --- | --- |
| `phase1e_protect_direct_word_delete` | `phase1e_protect_direct_word_deck_delete()` | Blocks direct delete paths outside trusted flows. |
| `phase1e_protect_words_pipeline_fields` | `phase1e_protect_words_pipeline_fields()` | Blocks direct browser updates to selected worker-owned pipeline fields. |
| `phase1h1_protect_word_review_flag` | `phase1h1_protect_word_review_flag()` | Blocks direct `needs_review` edits outside the admin RPC/trusted path. |
| `trg_words_updated_at` | `set_updated_at()` | Maintains timestamps. |

The Phase 1E word guard currently blocks normal browser writes to:

```text
status
current_stage
video_url
thumbnail_url
video_url_b
thumbnail_url_b
music_state
retry_requested
failed_stage
stage_attempts
total_stage_attempts
stage_started_at
```

The guard bypasses trusted mutations through `phase1e_is_trusted_mutation()`, which trusts `service_role`, `public.is_admin()`, or transaction-local `app.allow_phase1e_pipeline_update = on`.

Phase 1H.1 separately blocks direct `needs_review` changes unless the audited admin RPC/trusted setting is used.

Current `words` policies still permit owners to update their own `words` rows generally:

```text
Users update own words: (user_id = auth.uid()) OR is_admin()
```

Therefore, any column not blocked by a trigger remains browser-writable for the row owner.

## Source Write Paths

Current source writes relevant card/image/enrichment fields from backend worker paths:

| Path | Evidence | Writes |
| --- | --- | --- |
| `src/orchestration/feeder.py` | Enrichment writeback builds `visual_card_plan` and updates `words`. | `translation`, `bridge_mnemonic`, `mnemonic`, `etymology`, `dominant_emotional_reading`, `composition_hint`, `treatment_hint`, `pos`, `article`, `synonyms`, `ipa`, `example`, `example_gloss`, `tags`, `metadata`, `word`, later `word_slug`, `music_state`. |
| `src/orchestration/card_worker.py` | Card image worker builds payload from top-level fields and `metadata.visual_card_plan`; GPT Image-2 adds metadata. | `thumbnail_url`, `metadata.gpt_image_2_card`, `mnemonic`, TTS fields. |
| `src/orchestration/upstream_worker.py` | Post-images writeback reads storyboard `mnemonic_text`. | `visual_mnemonic`. |
| `src/orchestration/downstream_worker.py` | Upload/finalization metadata collection. | `metadata`. |
| `src/services/publishing.py` | Media publishing. | `video_url`, `thumbnail_url`, `video_url_b`, `thumbnail_url_b`. |
| `frontend/src/components/generate/submitGeneration.ts` | Browser submits through RPC only. | Calls `submit_generation`; no direct `words` update. |
| `frontend/src/components/generate/useWizardState.ts` | Card tier and infographic customization payload. | Sends `settings_override.card_image_model` and `settings_override.card_layer2` into job payload, not into `words`. |
| `frontend/src/lib/wordDisplayMetadata.ts` | Display resolver. | Reads top-level enrichment fields and `metadata.visual_card_plan` / `metadata.gpt_image_2_card`; no writes. |

No current frontend card/image path was found that should directly update these `words` columns from the browser.

## Column Classification

### Already protected from normal browser writes

| Column | Owner | Current protection | Recommendation |
| --- | --- | --- | --- |
| `status` | Worker/RPC | Protected by `phase1e_protect_words_pipeline_fields`. | Keep protected. |
| `current_stage` | Worker/RPC | Protected by `phase1e_protect_words_pipeline_fields`. | Keep protected. |
| `video_url` | Worker/provider | Protected by `phase1e_protect_words_pipeline_fields`. | Keep protected. |
| `thumbnail_url` | Worker/provider | Protected by `phase1e_protect_words_pipeline_fields`. | Keep protected. Card images currently land here. |
| `video_url_b` | Worker/provider | Protected by `phase1e_protect_words_pipeline_fields`. | Keep protected. |
| `thumbnail_url_b` | Worker/provider | Protected by `phase1e_protect_words_pipeline_fields`. | Keep protected. |
| `music_state` | Worker/RPC | Protected by `phase1e_protect_words_pipeline_fields`. | Keep protected. |
| `retry_requested` | Worker/RPC | Protected by `phase1e_protect_words_pipeline_fields`. | Keep protected. |
| `failed_stage` | Worker/RPC | Protected by `phase1e_protect_words_pipeline_fields`. | Keep protected. |
| `stage_attempts` | Worker/RPC | Protected by `phase1e_protect_words_pipeline_fields`. | Keep protected. |
| `total_stage_attempts` | Worker/RPC | Protected by `phase1e_protect_words_pipeline_fields`. | Keep protected. |
| `stage_started_at` | Worker/RPC | Protected by `phase1e_protect_words_pipeline_fields`. | Keep protected. |
| `needs_review` | Admin RPC | Protected by `phase1h1_protect_word_review_flag`. | Keep protected through `admin_set_word_review_flag`. |

### Browser-writable today and should be locked in the next SQL phase

These are final post-Image-2 card/image/enrichment fields that appear worker/provider-owned in current source and have no legitimate browser direct-write path.

| Column | Current owner | Current protection | Why lock | Worker/card path updates needed |
| --- | --- | --- | --- | --- |
| `bridge_mnemonic` | Enrichment worker | Browser-writable | Used as a card prompt/display input. Direct browser edits can corrupt card learning metadata after generation. | No source update expected if worker uses `service_role`, but verify with service-role probe. |
| `visual_mnemonic` | Image/storyboard worker | Browser-writable | Written from storyboard output after image stage. Direct browser writes can spoof image-derived mnemonic state. | No source update expected if worker uses `service_role`, but verify with image-stage probe. |
| `dominant_emotional_reading` | Enrichment worker | Browser-writable | Feeds card prompt and admin/debug display. Direct browser writes can alter prompt semantics. | No source update expected if worker uses `service_role`. |
| `composition_hint` | Enrichment worker | Browser-writable | Feeds card prompt/renderer planning. Direct browser writes can alter render planning. | No source update expected if worker uses `service_role`. |
| `treatment_hint` | Enrichment worker | Browser-writable | Feeds card prompt/renderer planning. Direct browser writes can alter render planning. | No source update expected if worker uses `service_role`. |
| `metadata` | Workers/providers | Browser-writable | Contains `visual_card_plan`, `layer2_eval`, `gpt_image_2_card`, provider prompt hash, infographic learning metadata, and other generation snapshots. Direct browser writes can spoof provider/render state. | Needs explicit verification because many worker paths append to `metadata`. Current backend worker service clients should bypass the guard. |

Recommended next lock is intentionally small: extend `phase1e_protect_words_pipeline_fields()` for these six columns only.

### Mixed ownership, defer until an audited edit model exists

These are generated/enrichment fields, but they are also natural candidates for future user/admin corrections. Locking them now may be correct eventually, but it is broader than the post-Image-2 column lock and should wait for an intentional edit RPC/product decision.

| Column | Current owner | Current protection | Recommendation |
| --- | --- | --- | --- |
| `word` | Submit/enrichment | Browser-writable | Defer. It may need a future audited correction flow. |
| `original_input` | Submit RPC | Browser-writable | Defer but consider locking in a separate audit; it is an audit field. |
| `translation` | Enrichment | Browser-writable | Defer until correction UX/RPC is defined. |
| `mnemonic` | Enrichment and GPT Image-2 card worker | Browser-writable | Defer because it is a user-visible learning field and may need correction. Note that GPT Image-2 currently rewrites it to `displayed_mnemonic`. |
| `etymology` | Enrichment | Browser-writable | Defer until correction UX/RPC is defined. |
| `pos` | Enrichment | Browser-writable | Defer until correction UX/RPC is defined. |
| `article` | Enrichment | Browser-writable | Defer until correction UX/RPC is defined. |
| `synonyms` | Enrichment | Browser-writable | Defer until correction UX/RPC is defined. |
| `ipa` | Enrichment | Browser-writable | Defer until correction UX/RPC is defined. |
| `example` | Enrichment legacy display fallback | Browser-writable | Defer until metadata fallback/backfill strategy is settled. |
| `example_gloss` | Enrichment legacy display fallback | Browser-writable | Defer until metadata fallback/backfill strategy is settled. |
| `tags` | Enrichment | Browser-writable | Defer until correction UX/RPC is defined. |

### User/admin editable and should stay open or RPC-controlled

| Field | Current path | Recommendation |
| --- | --- | --- |
| `settings_override.card_image_model` | User selection through `submit_generation` and admin language profile settings. | Keep open through existing RPC/settings paths. It is not a `words` column. |
| `settings_override.card_layer2` | User premium-card customization through `submit_generation`. | Keep open through submit payload validation. It is not a `words` column. |
| `needs_review` | Admin Content RPC `admin_set_word_review_flag`. | Keep RPC-controlled. Do not reopen direct browser writes. |

### Out of scope but worth a separate pass

| Column family | Observation | Recommendation |
| --- | --- | --- |
| `tts_audio_url`, `tts_status`, `tts_voice_id`, `tts_generated_at` | Card worker writes these after pronunciation TTS. They are browser-writable today. | Separate audio/TTS column lock audit. Do not mix with Image-2 lock unless explicitly scoped. |
| `suno_audio_url`, `suno_task_id`, `suno_audio_url_b`, `suno_storage_url`, `suno_storage_url_b` | Music workers write these fields. Some related state is protected, but the URL/task fields need their own check. | Separate music/Suno column lock audit. |
| `rating`, `rated_at`, `deck_id`, share/archive/move fields | User workflow and RPC ownership needs separate confirmation. | Leave outside this phase. |

## Broad `db push` Risk

Broad `supabase db push` is still unsafe. Existing local-only migrations include stale Image-2/card migrations that redefine high-risk RPCs such as `submit_generation`. Applying them in bulk could overwrite newer live function bodies and regress `original_input`, credit pricing, or final worker settings behavior.

For this phase specifically, the risk is not from the current audit docs. The risk is that old migrations would be applied before the Image-2/card schema and RPC history are intentionally reconciled.

## Recommendation

Do not apply SQL in Phase 1H.3.

Next safe implementation phase should:

1. Add a narrow migration that extends `phase1e_protect_words_pipeline_fields()` to block direct browser updates to:
   - `bridge_mnemonic`
   - `visual_mnemonic`
   - `dominant_emotional_reading`
   - `composition_hint`
   - `treatment_hint`
   - `metadata`
2. Keep the existing trusted bypass behavior.
3. Add a guard test that an authenticated owner cannot directly update those fields.
4. Add a service-role/trusted write test that worker-owned paths can still write them.
5. Run targeted frontend and SQL/RLS checks.
6. Repair/apply only the new narrow migration after live verification, not broad `db push`.

No worker/card source changes are expected if all backend workers use the service-role Supabase client, but this must be verified before applying the lock.
