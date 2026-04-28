# INVESTIGATION REPORT — Video Queue / `awaiting_video_gpu` State
 
 **Repo:** `lokigod69/resonance-cloud`, branch `main`
 **Date:** 2026-04-16
 **Mode:** Investigation write-up. No runtime code changed.
 
 ---
 
 ## 1 — Executive Summary
 
 When RunPod returns no-capacity errors across every configured volume and fallback GPU, `pod_manager._create_pod()` ultimately raises `RuntimeError("No GPU available after 3 attempts. Last error: …")` ([orchestrator/cloud_engines/video_engine/pod_manager.py:172](orchestrator/cloud_engines/video_engine/pod_manager.py#L172)). That exception flows through `LTXSelfHostedAdapter.generate()` into the video engine, which writes `generation-meta.json` with `status="failed"` and returns a failed engine result. `run_stage('video')` then records failed video lineage and returns a failed stage result when zero scenes succeed.

 The most important finding from this pass is a **control-flow bug in the orchestrator**: `process_word()` only retries shared stages when `run_stage()` raises. A returned failed result from `run_stage('video')` is treated as success by the outer loop, so the word often drifts forward and fails later at assembly because `manifest.selected.video` is still null. In other words, root cause is frequently video capacity, but the durable failure recorded in Supabase is often `Failed at assembly (version A)`.

 The codebase is still well-positioned for a queued-resume approach because **per-stage state is already tracked on disk**. `manifest.selected.<stage>` plus `_validate_artifacts()` in [orchestrator/src/services/stage_helpers.py:44](orchestrator/src/services/stage_helpers.py#L44) already encode the existing resume mechanism, and `get_incomplete_stages()` is the authoritative helper for reconstructing what remains. In cloud mode the job runner also deliberately skips workspace cleanup so deferred retries can continue using the same workspace files.

 The deployment is single-replica ([orchestrator/railway.toml](orchestrator/railway.toml)), runs one asyncio loop, already has a background pod-idle task ([orchestrator/start_cloud.py:147](orchestrator/start_cloud.py#L147)) and a startup stuck-job reaper ([orchestrator/start_cloud.py:78](orchestrator/start_cloud.py#L78)). An in-process async poller is therefore a natural fit if the queue path is chosen.

 The frontend has **no closed TypeScript union for status** and mostly uses string comparisons in `DeckView`, `DeckViewPG`, admin Queue, and admin Content. A new `awaiting_video_gpu` value would not compile-break the UI, but the Supabase CHECK constraint on `words.status` will reject it until the migration is updated ([orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql:44](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L44)).

 I also found likely **repo/live-schema drift** around Suno durability: code writes `suno_storage_url` / `suno_storage_url_b` and uploads to an `audio` bucket, but the checked-in migrations only add `suno_audio_url`, `suno_audio_url_b`, and `suno_task_id`, and only create a `videos` bucket. That needs confirmation before depending on those columns/buckets in any design.

 **Recommendation (previewed; full rationale in §6):** first fix the current result-handling bug so video-stage failure is recognized at the video stage. After that prerequisite, pursue **Alternative E — Hybrid (aggressive upfront retry tuned to single-digit seconds, plus a fast-polling in-process queue for sustained droughts)**. Secondary: benchmark the simpler **Alternative B (always-on cheaper card with offload)** before committing to queue complexity.
 
 ---
 
 ## 2 — Current State Map

### 2.1 Word status enum — exhaustive

**Schema:** `CHECK (status in ('pending', 'processing', 'complete', 'failed'))` ([orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql:44](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L44))

| Value | Writers (file:line) | Readers / branches |
|---|---|---|
| `pending` | Default on insert; set by frontend when words are imported | [orchestrator/job_runner.py:761](orchestrator/job_runner.py#L761) filters pending words for pickup |
| `processing` | [orchestrator/job_runner.py:176](orchestrator/job_runner.py#L176) when word enters pipeline | Frontend treats same as `pending` for UI purposes ([orchestrator/frontend/src/pages/DeckViewPG.tsx:651](orchestrator/frontend/src/pages/DeckViewPG.tsx#L651)) |
| `complete` | `upload_ab_results` path (publishing.py) after final video uploaded | Deck-level rollup at [orchestrator/job_runner.py:874](orchestrator/job_runner.py#L874); frontend `isComplete` flag |
| `failed` | [orchestrator/job_runner.py:283](orchestrator/job_runner.py#L283) (stage failure); [orchestrator/job_runner.py:444](orchestrator/job_runner.py#L444) (assembly); [orchestrator/job_runner.py:558](orchestrator/job_runner.py#L558) (upload) | Deck rollup; frontend shows "Failed" label |

**Important:** `words.status` is **stage-agnostic**. There is no intermediate `video_failed` or similar — a single stage failure skips all subsequent stages and terminates the word ([orchestrator/job_runner.py:296](orchestrator/job_runner.py#L296) `return False`).

### 2.1b `generation_jobs.status` enum — exhaustive

**Schema:** `CHECK (status in ('pending', 'approved', 'processing', 'complete', 'partial', 'failed', 'rejected'))` ([orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql:61-62](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L61-L62))

| Value | Writers (file:line) | Main consumers |
|---|---|---|
| `pending` | Wizard/job creation payloads ([orchestrator/frontend/src/components/generate/useWizardState.ts:168-179](orchestrator/frontend/src/components/generate/useWizardState.ts#L168-L179), [orchestrator/frontend/src/components/generate/submitGeneration.ts:65-68](orchestrator/frontend/src/components/generate/submitGeneration.ts#L65-L68), [orchestrator/frontend/src/components/generate/submitGeneration.ts:98-100](orchestrator/frontend/src/components/generate/submitGeneration.ts#L98-L100)) | Auto-approve loop in `job_runner.main()` ([orchestrator/job_runner.py:925-932](orchestrator/job_runner.py#L925-L932)) |
| `approved` | Auto-approve loop; stuck-job recovery; manual/admin retry flows | Pickup query in `job_runner.main()` ([orchestrator/job_runner.py:934-952](orchestrator/job_runner.py#L934-L952)); admin Queue treats these as queued |
| `processing` | Main job execution and Suno retry execution ([orchestrator/job_runner.py:600-603](orchestrator/job_runner.py#L600-L603), [orchestrator/job_runner.py:708-711](orchestrator/job_runner.py#L708-L711)) | Startup stuck-job reaper and admin Queue |
| `complete` | Main finalize and Suno retry success ([orchestrator/job_runner.py:678-682](orchestrator/job_runner.py#L678-L682), [orchestrator/job_runner.py:855-867](orchestrator/job_runner.py#L855-L867)) | Admin Queue status badges |
| `partial` | Main finalize when some words succeed ([orchestrator/job_runner.py:857-863](orchestrator/job_runner.py#L857-L863)) | Admin Queue status badges |
| `failed` | Main finalize / no-pending path / Suno retry failure | Admin Queue status badges and error display |
| `rejected` | Admin Queue reject action | Admin Queue status badges |

**Important:** `generation_jobs.status` is a **coarse queue lifecycle**, not per-word and not per-stage. It should not become the source of truth for `resume from video` without adding a new invariant.

### 2.2 Stage-level state tracking

There is no `completed_stages`, `current_stage`, `resume_from`, or `awaiting_resource` column anywhere in the schema. Per-stage state is tracked by:

1. **`manifest.json` / `selected.<stage>` fields** — authoritative. Each engine writes its output directory name to `manifest.selected.{concept,song,images,video,final,bookend}` on success ([orchestrator/src/models.py:23-29](orchestrator/src/models.py#L23-L29); updates via `update_selection()` called from pipeline).
2. **`manifest.lineage[]`** — audit trail with per-stage `status ∈ {"success", "partial", "failed"}`, timestamps, `from_versions` dependency map. Written even on failure ([orchestrator/src/manifest.py:106-126](orchestrator/src/manifest.py#L106-L126)).
3. **On-disk artifact validation** — `_validate_artifacts()` ([orchestrator/src/services/stage_helpers.py:44](orchestrator/src/services/stage_helpers.py#L44)) checks that the `selected` version's output files physically exist (e.g. `videos/<version>/scene_*.mp4`, `final/<version>/final.mp4`).
4. **`get_incomplete_stages()`** ([orchestrator/src/services/stage_helpers.py:75](orchestrator/src/services/stage_helpers.py#L75)) — iterates `STAGE_ORDER` and returns stages whose `selected` field is null OR whose artifacts are missing. **This function is the load-bearing resume mechanism and is already used by the pipeline today.**

**`generation_jobs` table** tracks only aggregate job state (`words_total`, `words_completed`, `words_failed`), not per-word stage state ([orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql:57-76](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L57-L76)).

**Key answer to "if video failed but everything else is done, what tells us?":** `manifest.selected.video is None` AND `_validate_artifacts(word_dir, 'video', ...)` returns False. The other stages' `selected` fields + artifact checks confirm their completion. This state survives container restarts because it lives in the word directory.

 **Caveat:** `src.storage` uses `CLOUD_WORKSPACE_ROOT` in cloud mode ([orchestrator/src/storage.py:25-35](orchestrator/src/storage.py#L25-L35)), but the repo alone does not prove whether production mounts that path to durable storage. AGENT UNCERTAIN whether a Railway redeploy (as opposed to restart) preserves the workspace volume. If not, the queue approach requires a durable volume or persistent upload of intermediate artifacts.

### 2.3 Current failure path for no-capacity — end-to-end

1. [orchestrator/cloud_engines/video_engine/pod_manager.py:94-169](orchestrator/cloud_engines/video_engine/pod_manager.py#L94-L169) — 3 attempts × each `RUNPOD_VOLUME_IDS` × one POST with all `gpu_types` in `gpuTypeIds`. HTTP 400/404/409/500/503 → "try next volume"; 401 → immediate `RuntimeError("RunPod auth failed")`; other → immediate `RuntimeError`.
2. [orchestrator/cloud_engines/video_engine/pod_manager.py:172](orchestrator/cloud_engines/video_engine/pod_manager.py#L172) — after loop: `raise RuntimeError(f"No GPU available after {MAX_CREATE_RETRIES} attempts. Last error: {last_error}")`. Between attempts, `time.sleep(30)` (line 169). Total worst-case latency: ~90 seconds plus HTTP timeouts.
3. [orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py) `ensure_pod_ready()` re-raises; `finally` block runs `release_use()`.
4. [orchestrator/cloud_engines/video_engine/engine.py](orchestrator/cloud_engines/video_engine/engine.py) catches the runtime error, leaves `status="failed"`, and writes `generation-meta.json` in the `finally` block.
5. **Video engine does NOT write to Supabase.** It writes only local files. The pipeline layer decides the word's DB fate.
6. Pipeline aggregates per-scene results at [orchestrator/src/pipeline.py:916-928](orchestrator/src/pipeline.py#L916-L928). If any scene succeeded, `final_status="partial"` and `update_selection` records a video version; if zero succeeded, `final_status="failed"` and `selected.video` stays null.
7. **Critical control-flow bug:** back in `job_runner.process_word`, the shared-stage loop only retries if `run_stage()` raises. Any returned dict sets `success=True` and exits the retry loop ([orchestrator/job_runner.py:255-260](orchestrator/job_runner.py#L255-L260)). So a zero-success video failure does **not** trigger the intended shared-stage retry/fallback branch.
8. The first hard exception usually arrives later in version A assembly. `run_stage('assembly')` raises when `manifest.selected.video` is missing, and the assembly retry loop eventually marks the word failed with `error_message="Failed at assembly (version A)"` ([orchestrator/job_runner.py:411-453](orchestrator/job_runner.py#L411-L453)).
9. Credit refund: `public.refund_credit(user_id_param uuid)` at [orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql:298-305](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L298-L305) — simple `UPDATE profiles SET credits = credits + 1`. **Not idempotent.** Re-calling it refunds again.

 **Net effect:** the observable DB failure often looks like assembly failure even though the root cause was video GPU capacity.

 **Capacity-vs-other-error distinguishability:** pod_manager conflates 400/404/409/500/503 into one "GPU unavailable" bucket ([orchestrator/cloud_engines/video_engine/pod_manager.py:153-158](orchestrator/cloud_engines/video_engine/pod_manager.py#L153-L158)). This over-catches. HTTP 400 can legitimately mean "malformed request" (bad template ID). The `last_error` string is preserved in the exception message, but downstream consumers would have to grep the string to disambiguate. AGENT UNCERTAIN whether RunPod uses a stable error-body schema for no-capacity vs validation errors.

### 2.4 Railway deployment topology

- **Process:** single `python start_cloud.py` process, single asyncio event loop. No gunicorn/uvicorn worker multiplication. Dockerfile CMD at [orchestrator/Dockerfile.cloud](orchestrator/Dockerfile.cloud).
- **Replicas:** [orchestrator/railway.toml](orchestrator/railway.toml) has no `replicas`/autoscaler config; default is single replica.
- **Restart policy:** `ON_FAILURE` with `restartPolicyMaxRetries = 10`. On restart, in-memory asyncio tasks are lost.
- **No cross-process safety anywhere.** Job pickup at [orchestrator/job_runner.py:934-952](orchestrator/job_runner.py#L934-L952) uses plain `SELECT ... LIMIT 1` followed by a non-atomic `UPDATE status='processing'`. No `FOR UPDATE SKIP LOCKED`, no `claimed_at`, no advisory lock. **If Railway ever scaled past one replica, duplicate pickup would occur silently.**

### 2.5 Existing background loops

[orchestrator/start_cloud.py](orchestrator/start_cloud.py) already runs:

| Loop | Purpose | Pattern |
|---|---|---|
| HTTP health server | Railway liveness on port 8091/`$PORT` | daemon thread |
| `_pod_idle_loop` (line 147) | `pod_manager.idle_check()` every 60s | `asyncio.create_task` |
| `recover_stuck_jobs()` (line 78) | Reset `generation_jobs.status='processing'` stale >30min back to `'approved'` | One-shot on boot |
| `job_runner.main()` | Poll `generation_jobs` every 30s, process approved jobs | Foreground await |

A new `awaiting_video_gpu` poller is a direct peer of `_pod_idle_loop` — same pattern, same process, same ergonomics.

### 2.6 Suno bake-in and URL durability

[orchestrator/job_runner.py:327-359](orchestrator/job_runner.py#L327-L359) — Suno bake-in runs **after** concept/images/song/video but **before** assembly. Code downloads Suno audio, uploads it to the Supabase `audio` bucket, and writes `words.suno_storage_url` / `words.suno_storage_url_b` ([orchestrator/src/services/suno_bakein.py:82-100](orchestrator/src/services/suno_bakein.py#L82-L100), [orchestrator/src/routers/suno.py:47-64](orchestrator/src/routers/suno.py#L47-L64)). Assembly still reads `manifest.selected.song`, which is a **local path** (`run-001_ts/take_001.flac`), not a URL.

**Schema drift caveat:** the checked-in migrations add `suno_audio_url`, `suno_audio_url_b`, and `suno_task_id`, but I did **not** find checked-in migrations for `suno_storage_url` / `suno_storage_url_b`. I also found a checked-in storage bucket migration for `videos`, but not `audio`. AGENT UNCERTAIN whether production already has those columns and bucket via unapplied or uncommitted migrations.

Gemini image URLs are not used downstream — images are downloaded and saved as `images/<version>/NNN.png` in the word directory. Durable as long as the workspace volume is durable. **Not uploaded to Supabase storage.**

### 2.7 Frontend status rendering

- **No TypeScript closed union on status.** The frontend uses plain string comparisons.
- `DeckView.tsx` and `DeckViewPG.tsx` treat `pending|processing` as queued, `failed` specially, and everything else as generic incomplete / processing UI. An unknown word status therefore falls through to a reasonable default.
- `admin/Queue.tsx` is the main `generation_jobs.status` consumer and explicitly color-maps all seven job states.
- `admin/Content.tsx` has a smaller color map for deck statuses plus word `pending` / `processing` / `failed`; an unknown word status would not crash, but would not get a bespoke color.
- Polling remains coarse: the deck pages re-fetch every 30s while generating. No realtime subscription exists.
- Adding `awaiting_video_gpu` as a value will not compile-break the frontend, but **will require updating the Supabase CHECK constraint** before any write succeeds.

---

## 3 — Design Question Analysis

### 3.1 Where is `awaiting_video_gpu` detected and written?

| Option | Files touched | Blast radius | Risk |
|---|---|---|---|
| **A — pod_manager / pipeline surfaces typed `NoCapacityError`; video-stage failure becomes explicit** | pod_manager.py, ltx_selfhosted.py, engine/pipeline, job_runner.py | Medium-high — must fix the current returned-failure control flow as well as add classification | Cleanest semantics. Need to ensure 400 (which over-catches malformed-request) doesn't incorrectly produce `NoCapacityError`. |
| **B — video_engine.engine.py writes status directly** | engine.py + DB client wiring | Large — engine becomes Supabase-aware (currently engines are DB-free, a well-preserved invariant) | **Breaks the engine/orchestrator boundary.** Avoid. |
| **C — job_runner inspects the returned `run_stage('video')` payload / manifest state and overrides** | job_runner.py only (or plus pipeline result schema) | Medium — localised, but relies on the returned result structure being trustworthy | Easiest to land while keeping DB writes where they already belong. |

**Tradeoff framing:** (A) is cleanest long-term because it fixes the current abstraction bug at the right layer. (C) is more incremental and preserves the invariant that DB writes live in the orchestrator, but it only works if the returned stage result is made sufficiently structured. (B) is the wrong level.

### 3.2 What state tells the poller which stages to resume?

| Option | Tradeoff |
|---|---|
| **A — New `words.resume_from_stage` column** | Explicit, queryable, but adds schema surface and a new invariant that must be kept in sync with manifest. |
| **B — Infer from existing manifest + `_validate_artifacts()`** | **Zero new state.** Re-uses the existing resume mechanism. Fully disk-backed; survives restarts if workspace is durable. The poller just calls `get_incomplete_stages()` for each `awaiting_video_gpu` word. |
| **C — New `generation_jobs.awaiting_resource='gpu'` row per stage** | Promotes generation_jobs to per-stage tracking, which is a bigger architectural change than the problem needs. |

**Compatibility with stuck-job recovery:** the current reaper resets `generation_jobs.processing → approved` based only on `started_at`. Neither option A, B, nor C conflicts with it, but option B means the word-level work lives outside `generation_jobs` entirely — the stuck-job reaper would never touch awaiting words, which is the desired behaviour.

### 3.3 Where does the poller live?

| Option | Setup cost | Restart semantics | Multi-replica safety | Extra single-point-of-failure? |
|---|---|---|---|---|
| **A — asyncio task in `start_cloud.py`** | Zero new infra; clone of `_pod_idle_loop` | Poller dies with container; stuck-job reaper re-queues if needed (but words are in `awaiting_video_gpu`, which the reaper does not touch — **this is a risk: nothing re-triggers the poller to check for awaiting words on boot**, except the loop starting fresh). | Relies on single-replica guarantee. | No — shares existing SPOF. |
| **B — Supabase `pg_cron` → HTTP endpoint on orchestrator** | Requires a new HTTP endpoint (currently only `/health` is exposed in cloud mode); needs pg_cron extension enabled. | Survives orchestrator restart — `pg_cron` keeps firing. | Still hits the single orchestrator. | Depends on Supabase uptime (already a SPOF). |
| **C — External cron (GitHub Actions, Railway Cron, cron-job.org)** | Needs HTTP endpoint; needs scheduled-job config; credentials exposure. | Same as B. | Same. | Adds a third-party SPOF. |
| **D — Dedicated Railway service** | Double deploy infrastructure; env duplication; needs coordination with main orchestrator. | Clean isolation. | Explicit locking required (both services want to create pods). | **Yes — creates the multi-replica problem we currently don't have.** |

**Tradeoff framing:** (A) is the simplest and is aligned with every other background concern in the codebase. Its only weakness is that it cannot reach across Railway restarts — if the orchestrator is down for 20 minutes, no polling happens. (B) fixes that at a small operational cost but requires exposing an endpoint (a small new surface to secure). (D) trades one problem (capacity drought) for a worse one (concurrent pod creation).

### 3.4 Locking — preventing duplicate pod creation

**Today's state:** pod_manager's module-level `_lock = threading.Lock()` ([orchestrator/cloud_engines/video_engine/pod_manager.py:47](orchestrator/cloud_engines/video_engine/pod_manager.py#L47)) is an in-process lock only. **If two orchestrator processes ran, both could call `ensure_pod_ready()` concurrently and create two pods.** This is not a current bug only because there is only ever one replica.

The queue approach has two new concurrency vectors:
- **Vector 1:** Poller picks up an `awaiting_video_gpu` word while a fresh user job concurrently triggers its own video stage on the same or another word.
- **Vector 2:** Poller drains multiple awaiting words back-to-back on one pod while another pod is still warming up.

| Option | Correctness | Cost | Scale-out survival |
|---|---|---|---|
| **A — `pg_advisory_lock`** | Strong. Standard Postgres idiom. | Negligible. | Works across replicas. |
| **B — Atomic row claim on `words.status`** (`UPDATE ... WHERE status='awaiting_video_gpu' AND id=? RETURNING *`) | Strong per-word; doesn't protect against duplicate pod creation, only duplicate word processing. | Negligible. | Works across replicas. |
| **C — Rely on in-process `_lock`** | Holds only within one Python process. | Zero. | **Breaks under scale-out.** |
| **D — Force single-replica forever** | Not a lock; a constraint. | Zero. | Self-defeating if scale is ever needed. |

**Recommendation preview:** combine (A) for the "who gets to create the pod right now" question with (B) for the "who claims this specific awaiting word" question. Together they are correct under multi-replica and add ~5 lines of code.

### 3.5 Poll cadence

**RunPod rate limits** (per Agent E's web research, [docs.runpod.io/serverless/endpoints/send-requests](https://docs.runpod.io/serverless/endpoints/send-requests)): documented for serverless REST endpoints (`/run`, `/runsync` etc.), not for pod-creation REST. AGENT UNCERTAIN whether `POST /pods` has a documented limit. Failed pod-creation calls appear not to be billed per community reports, but this is not authoritatively documented. **Assume rate limit exists, plan for <60 calls/min from the orchestrator.**

| Cadence | Latency to drain | Call volume | Risk |
|---|---|---|---|
| 30s | Fast | 120/hr | Possible rate-limit bump during sustained drought. |
| 1 min | Moderate | 60/hr | Safer. |
| 2 min | Slow for users — 2-minute average queue wait just from poll | 30/hr | Too slow once capacity opens. |
| 5 min | Not viable. | — | — |
| **Adaptive** (60s when queue empty, 20s when non-empty, exponential backoff on repeated no-capacity) | Best of both | ~30/hr idle, ~180/hr active | Modestly complex; maps to real-world capacity dynamics. |

**Competition for capacity:** community reports on the RunPod Discord (not officially documented) say capacity windows for common cards can close in seconds. A 60s poll is too slow to compete with an aggressive automated poller somewhere else. AGENT UNCERTAIN on actual competitor behaviour. If capacity drought is adversarial, nothing short of reserved/committed pricing guarantees wins.

### 3.6 Queue draining on a live pod

Current `RUNPOD_IDLE_TIMEOUT=300` ([orchestrator/cloud_engines/video_engine/config.py:49](orchestrator/cloud_engines/video_engine/config.py#L49) — default 300s, NOT 60s as the prompt stated). Existing `idle_check` ([orchestrator/cloud_engines/video_engine/pod_manager.py:355-372](orchestrator/cloud_engines/video_engine/pod_manager.py#L355-L372)) terminates the pod only when `_active_jobs == 0` AND `now - _last_activity > timeout`. **This already protects against terminating a pod while it's processing a job.**

| Option | Complexity | Pod-lifecycle impact |
|---|---|---|
| **A — Reset `_last_activity` when starting each queued word** | Trivial (already done by `acquire_use`). | No changes required. |
| **B — Check queue depth at idle-timer expiry** | Requires pod_manager to know about the queue — couples concerns. | Not ideal. |
| **C — Batch drain function** | Cleanest API: "given a warm pod, iterate the queue until empty or capacity lost." | Adds a new entry point. |

**Reality check:** (A) is essentially free because `acquire_use` already touches `_last_activity`. The real issue is whether the poller holds the pod warm *between* words, not whether a word's own run resets the timer. If the drain loop is serial and kicks off the next `ensure_pod_ready` immediately after one word finishes, the pod is already warm and the call returns the existing pod id without creating a new one. **Option A is sufficient.**

### 3.7 Escalation to hard-fail

| Window | Upside | Downside |
|---|---|---|
| 6h | Bounded blast radius on forgotten words. | Short for overnight droughts. |
| 12h | Covers most overnight patterns. | — |
| **24h** | Matches daily capacity cycles; maps well to user expectations ("check back tomorrow"). | Feels like a long failure time on a frustrated user. |
| 48h | Very lenient. | User probably already gave up. |
| Never | No further degradation. | Orphan words accumulate; credit never refunded. |

**Signal options:** a `words.awaiting_since` timestamp (new column) is the cleanest; inferable from `updated_at` if we accept the ambiguity. Escalation path reuses existing refund code ([orchestrator/job_runner.py:290](orchestrator/job_runner.py#L290)) — transition to `status='failed'` and call `refund_credit`. Because `refund_credit` is not idempotent, escalation must ensure it's not double-refunded from the original capacity-failure path; the cleanest invariant is **"do not refund when entering `awaiting_video_gpu`; refund only on escalation to `failed` or user-cancellation."**

### 3.8 Frontend impact

Already summarised in §2.7. Concretely:
- Adding `awaiting_video_gpu` breaks nothing on render.
- The existing "pulsing placeholder" (incomplete + opacity-50) is a serviceable minimum-viable UI.
- The Supabase CHECK constraint **will reject writes** until a migration updates the allowed values.
- No TypeScript `WordStatus` union exists to update. A soft "Queued for GPU" label could be added by extending the branch at [orchestrator/frontend/src/pages/DeckViewPG.tsx:804](orchestrator/frontend/src/pages/DeckViewPG.tsx#L804), but is strictly optional for v1.

---

## 4 — Alternatives Comparison

| Alternative | Solves "user sees failed"? | Complexity | Infra cost | Operational risk | Coverage |
|---|---|---|---|---|---|
| **A — Queue (base proposal)** | Yes, if poller runs | Medium-high (new status, poller, locking, escalation, migration, plus prerequisite result-handling fix) | None (in-process) | Restart window gap; idempotency of refund; workspace durability unknown | Handles arbitrary drought duration |
| **B — Always-on cheaper card (4090/5090)** via LTX-2.3 distilled offload path | Yes, avoids drought entirely if card class stays available | Low (config change + verify inference speed) | Higher monthly spend (always-on ~$0.44–0.69/hr ≈ $320–500/mo per card) | Capacity for 4090/5090 is usually better than for H100/A100 but not guaranteed. Speed regression (2–5× per LTX-2 offload overhead) may push per-clip cost up | Partial — still fails if *all* card classes are out |
| **C — Multi-region volume sprawl (5–6 volumes)** | Partially — raises hit rate | Low (config) | Volume storage fees × regions | Volumes in region X can't be used by GPU in region Y. AGENT UNCERTAIN whether RunPod volumes are region-portable. | Reduces drought probability but doesn't eliminate it |
| **D — Aggressive upfront retry (20–30 attempts, 2–5s delay)** | Partially — catches flicker-capacity | Very low (tune two constants) | Zero | Noisy retry chatter on logs; potentially higher RunPod API call rate (stay below likely limits) | Catches short droughts; useless against sustained drought |
| **E — Hybrid D + A** | Yes, with graceful fallback | Medium | None additional to A | Sum of both | Best |
| **F — Reserved / committed capacity (Savings Plan)** | Yes (during the commit window for the one GPU type); no for GPU types outside the plan | Low (billing change) | 3–6 month non-cancellable lock-in. Savings Plan covers compute only; storage billed separately. | If demand evaporates, money wasted. | Good for base load; not elastic |

**Quick pricing cross-reference** (Agent E, April 2026, order-of-magnitude):
- H100 SXM 80GB on-demand ~$2.69–2.99/hr
- A100 80GB on-demand ~$1.39–1.89/hr
- A6000 48GB ~$0.49–0.79/hr
- L40S 48GB ~$0.86–1.22/hr
- RTX 4090 24GB ~$0.44–0.69/hr
- Savings Plans 3–6 month commit; Spot ~30–50% cheaper than on-demand with 5-second termination warning.

**Alternative B viability evidence** ([ltx-worker/src/inference.py](ltx-worker/src/inference.py) per Agent E):
- Block-level offload with `num_blocks_per_group=1, use_stream=True` at inference.py:94-101
- Leaf-level text-encoder offload at inference.py:105-111
- VAE tiling enabled
- Distilled LoRA (lighter than the "dev" path)
- Already configured for sub-48 GB. Speed likely 2–5× slower than a resident 80 GB setup, but step count already minimised (8 + 3 steps).

---

## 5 — Edge Case Inventory

| # | Edge case | Failure mode if unhandled | State/logic implied |
|---|---|---|---|
| 1 | User deletes a word while it's `awaiting_video_gpu` | Poller picks up a deleted word; `refund_credit` may fire on a ghost | Poller must check word still exists and `deleted_at IS NULL` before claiming |
| 2 | User manually retries the generation from the UI while status is `awaiting_video_gpu` | Duplicate job; two pods for same word; double charge | Manual retry path must refuse if status is `awaiting_video_gpu` or must atomically transition it back to `pending` with lock |
| 3 | Word has 3 scenes; 2 succeed, 1 fails with no-capacity | Current code writes `final_status="partial"` at [orchestrator/src/pipeline.py:923](orchestrator/src/pipeline.py#L923), auto-selects the version, continues. Assembly runs on 2 clips. | Does awaiting-GPU apply per-word or per-scene? **Recommend: per-word only.** Partial successes proceed; a partial is not awaiting. But then a "partial" word never gets the missing scene retried, which may or may not be desired behaviour. AGENT UNCERTAIN what the product expectation is. |
| 4 | Pod created successfully, but video generation crashes mid-run for a queued word | Current behaviour: engine writes failed, pipeline retries up to MAX_RETRIES | Crashed pod run is a generation error, not a capacity error — should route to existing retry logic, not re-enter the queue. Decision criterion: only capacity-class failures produce `awaiting_video_gpu`. |
| 5 | Suno CDN URL expires before pod becomes available | Not applicable — Suno audio is persisted to Supabase `audio` bucket before assembly ([orchestrator/src/services/suno_bakein.py:82](orchestrator/src/services/suno_bakein.py#L82)). `selected.song` is a local path, which survives if workspace is durable. | No additional logic required if workspace is durable. If workspace is ephemeral, need to re-download song from `words.suno_storage_url` before running video. |
| 6 | Gemini image URLs expire | Not applicable — PNGs saved locally in word dir. Same durability caveat as #5. | As #5. |
| 7 | Credit refunded on prior pipeline version; queued version succeeds | Depends on refund policy. Current path refunds on failure. If `awaiting_video_gpu` does NOT refund, and the queued run later succeeds, no double-charge. If the queued run later escalates to `failed`, refund fires once. | **Invariant: refund exactly once per word.** Adding an `awaiting_video_gpu` intermediate state requires that the original failure path *not* refund. Concretely: when pod_manager no-capacity is detected, skip the refund and transition to awaiting instead. |
| 8 | Deck deleted while awaiting word exists | Current schema has `ON DELETE CASCADE` on `words.deck_id` ([20260322210000_phase2a_tables.sql:33](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L33)). Cascade removes the word. Poller may have already claimed it — race. | Poller claim is atomic; a cascade after claim means the word was valid at claim time. Run completes and writes to a soon-to-be-deleted row. Benign. |
| 9 | Supabase unreachable when poller runs | Current logger.error pattern suggests tolerant handling. | Poller must log and continue, not crash. |
| 10 | Two Railway restarts in quick succession; orphan pods | `cleanup_orphans()` at [orchestrator/cloud_engines/video_engine/pod_manager.py:375-449](orchestrator/cloud_engines/video_engine/pod_manager.py#L375-L449) terminates pods >10min old matching `RUNPOD_POD_NAME` on startup. Covers the orphan case for single-replica. | No new logic, but relies on `RUNPOD_POD_NAME` being shared across lifecycles and unique to this service. |
| 11 | User's credit balance drops to 0 between request and pod availability | Credits are already deducted at job creation / retry time, so the queued word's credit is already spent and proceeding is fine. | No additional logic required beyond preserving the invariant that refund happens exactly once if the queued path eventually hard-fails. |
| 12 | Workspace volume not persistent across Railway redeploy | Word dir contents vanish; `get_incomplete_stages` returns all stages as incomplete; queued run would re-run from images (which can be re-downloaded from Gemini only if Gemini URLs still exist — they don't). **Breaks the resume.** | **AGENT UNCERTAIN on Railway volume persistence for this deployment.** If ephemeral, need to either (a) attach a persistent volume, (b) upload intermediate artifacts (PNGs, FLACs, scene MP4s) to Supabase storage before queueing, or (c) accept that queued words re-run the full pipeline on redeploy (expensive but correct). |
| 13 | Poller catches a word whose `awaiting_since` is >24h (escalation threshold) | If escalation runs in the same poll tick as a fresh capacity attempt, two code paths could both write `status='failed'` + refund. | Escalation must be a separate code path, guarded by a status check: only transition `awaiting_video_gpu → failed` if current status is still `awaiting_video_gpu`. Use the atomic UPDATE form with WHERE clause. |
| 14 | Capacity actually available but pod_manager returned 400 on a malformed payload (misclassified as no-capacity) | Word stuck in `awaiting_video_gpu` forever; polls will succeed getting a pod but still fail on the malformed payload every time | Need structural separation of payload errors vs capacity errors, or an escalation-on-repeated-failure guard. Consider: if a queued word's pod run fails N times with the same error, give up and escalate to `failed`. |
| 15 | Code contains a `video_mode: "ken_burns"` fallback for video-stage retries ([orchestrator/src/services/stage_helpers.py:34-38](orchestrator/src/services/stage_helpers.py#L34-L38)), but the current no-capacity path usually never reaches it because `run_stage('video')` returns a failed result instead of raising and `process_word()` only retries in `except`. | Product owners may believe there is already a graceful fallback when, in the observed path, there often is not. | **Design question for Sir Robert:** once the control-flow bug is fixed, should no-capacity prefer `ken_burns`, `awaiting_video_gpu`, or an ordered policy between the two? |

---

## 6 — Recommendation

**Recommended approach: Alternative E (Hybrid), but only after a prerequisite correctness fix.**

The research suggests a three-step defence:

1. **Fix shared-stage result handling first** — today, `process_word()` treats a returned failed `run_stage('video')` result as success and only discovers the problem later in assembly. Before introducing any queue semantics, the orchestrator must recognize `video failed with zero successful scenes` as an actual video-stage failure.

2. **Tune pod-manager retries second** (Alternative D) — once the failure surface is correct, replace the current 3×30s rhythm with denser short-interval retries to catch flicker-capacity.

3. **Add the queue on top** (Alternative A) — for the rump of long-drought cases that retry tuning cannot catch, transition to `awaiting_video_gpu` instead of immediate failure and add an in-process poller.

**Why not B as primary:** the cheaper-card path (4090/5090/A6000-class) looks compelling on paper but has untested speed characteristics in production. It should be investigated in parallel. If the speed/cost curve is acceptable, this may simplify the whole problem and reduce the queue to a fallback rather than the main strategy.

**Why not F (Savings Plans):** the 3–6 month commitment window and the need to choose capacity up front are the opposite of the current elastic / opportunistic deployment model. Good fit later, not first.

**If the queue approach is pursued, the per-question picks are:**

| Question | Pick | Why |
|---|---|---|
| §3.1 Where to detect/write status | **A + C together** — structured capacity classification from pod/pipeline, DB write remains in `job_runner` | Fixes the current abstraction bug while preserving the invariant that engines stay DB-free |
| §3.2 Resume state | (B) reuse manifest + `get_incomplete_stages` | Zero schema change; re-uses the existing load-bearing mechanism |
| §3.3 Poller location | (A) in-process asyncio task | Mirrors `_pod_idle_loop`; no new infra; acceptable in a single-replica deployment |
| §3.4 Locking | (A) `pg_advisory_lock` for pod-create + (B) atomic word-claim | Correct under future multi-replica; minimal code |
| §3.5 Cadence | Adaptive: 60s idle, 20s active, exponential backoff on sustained no-capacity (max 5 min) | Balance between claim speed and rate-limit hygiene |
| §3.6 Drain pattern | (A) idle-timer reset via existing `acquire_use` | Free; pod stays warm naturally between serial word runs |
| §3.7 Escalation | 24 h with `awaiting_since` timestamp; refund only on escalation, not on queue entry | Idempotency-safe; matches daily capacity cycles |
| §3.8 Frontend | Piggyback on existing incomplete/queued UI for MVP; add a specific label later | Zero frontend work required for MVP beyond schema migration |

---

## 7 — Open Questions (AGENT UNCERTAIN — need confirmation)

1. **Workspace volume durability across Railway redeploy.** If the word directory is ephemeral, the resume premise collapses. Verify the production volume attachment for `CLOUD_WORKSPACE_ROOT`.

2. **Live schema drift for Suno storage durability.** Does production already have `suno_storage_url`, `suno_storage_url_b`, and an `audio` bucket, or are those migrations missing from the repo?

3. **Product intent on the `ken_burns` fallback.** Once the control-flow bug is fixed, should no-capacity prefer `ken_burns`, `awaiting_video_gpu`, or an ordered policy between the two?

4. **RunPod error taxonomy.** Is the current 400/404/409/500/503 bucket a robust signal for no-capacity specifically, or does it over-catch malformed payloads and config errors?

5. **Per-scene semantics.** Should a word with 2/3 scenes successful and 1 failed-for-capacity enter the queue for the missing scene, or is today's `partial` behavior acceptable?

6. **Poll cadence ceiling.** Pods REST rate limits are not documented in the official RunPod pages I found. If you want an aggressive poller, either ask RunPod support directly or enforce a conservative ceiling.

7. **Cheaper-card viability.** Alternative B still needs a measured benchmark on a 24/32/48 GB card with the current offload config before making a cost/latency call.

---

## 8 — Suggested Implementation Sequencing

If the hybrid recommendation is accepted, work proceeds in this order. **Each phase is independently shippable.**

### Phase 0 — Verification (no code change)

- Confirm workspace-volume persistence on Railway (open question #1).
- Confirm the live Supabase/storage state for `suno_storage_url`, `suno_storage_url_b`, and the `audio` bucket (open question #2).
- Benchmark LTX-2.3 on one 48 GB and one 24/32 GB RunPod instance for 1 hour each; record latency, VRAM, and per-clip cost (open question #7).

### Phase 1 — Correctness fix (mandatory)

- Change the shared-stage loop in `job_runner.process_word()` so it inspects the returned `run_stage()` result instead of treating any returned dict as success.
- Ensure a zero-success `run_stage('video')` result is handled as a **video-stage** failure surface rather than drifting to assembly.
- Add regression coverage around the current bug: failed video result should not proceed to assembly.
- If practical, attach structured capacity classification at the pipeline result level instead of relying on string matching.

### Phase 2 — Retry tuning

- Change `MAX_CREATE_RETRIES` and retry cadence in `pod_manager.py` to a denser short-interval schedule.
- Add structured error parsing to distinguish `payload invalid` from `no capacity`.
- Add a typed `NoCapacityError(RuntimeError)` if that is the cleanest way to propagate capacity classification.
- **Ship this before the queue.** It is the lowest-risk UX improvement once Phase 1 is in place.

### Phase 3 — Queue MVP (feature-flagged)

Migration:
- Expand `words.status` CHECK to include `awaiting_video_gpu`.
- Add `words.awaiting_since timestamptz`.

Code:
- In `job_runner.process_word`, when corrected video-stage handling identifies a capacity-class failure, write `status='awaiting_video_gpu', awaiting_since=now()` instead of letting the failure drift to assembly; do not refund.
- Add `poll_awaiting_gpu_queue()` in `start_cloud.py` following the `_pod_idle_loop` pattern.
- Poller logic: claim `awaiting_video_gpu` rows atomically, acquire `pg_advisory_lock`, call `get_incomplete_stages()`, and resume from there.
- Escalation: any awaiting word older than 24h transitions to `failed` + refund via an atomic UPDATE-with-WHERE.

Feature flag:
- Start with `AWAITING_GPU_QUEUE_ENABLED=false` and enable in staging first.

### Phase 4 — Frontend polish

- Add a specific render branch for `awaiting_video_gpu` showing `Queued — waiting for capacity`.
- Optionally show `awaiting_since` relative time in a tooltip or detail panel.
- Do **not** build queue-position UI in v1.

### Phase 5 — Multi-replica readiness

- Add explicit claim metadata to `generation_jobs` and convert pickup to atomic claim semantics.
- Keep the `pg_advisory_lock` from Phase 3 around pod-creation critical sections.

**Minimum viable slice:** Phase 1 is mandatory correctness work. Phase 2 is the first practical UX improvement and may already absorb a meaningful share of observed failures. Phase 3 is the full queue design. Phases 4 and 5 are optional follow-ons.
