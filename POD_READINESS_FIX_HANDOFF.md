# Pod Readiness Fix — Handoff

**Implements:** Section 7 "Recommended Fix" from `INVESTIGATION_REPORT_POD_READINESS_ROOT_CAUSE.md` (Antigravity, 2026-04-16).
**Root cause summary:** Phase A of `_wait_for_pod_ready()` gated on `portMappings` being truthy, but HTTP-proxy pods (`"ports": ["8080/http"]`) never populate that field. Phase A looped the entire 300s timeout, Phase B (the real `/health` gate) never ran, and the pod was killed while the worker sat ready.

## Exact lines changed

### 1. `orchestrator/cloud_engines/video_engine/pod_manager.py`

Replaced the Phase A loop body at the previous lines 190–216.

- Removed `ports = data.get("portMappings") or {}` and the `and ports` clause from the break condition (Option B from report Section 7). Phase A now breaks on `desiredStatus == "RUNNING"` alone; Phase B remains the true readiness gate via `/health`.
- Updated the Phase A comment on the `while True:` line to reflect the new gating rationale.
- Added the Section 5 Experiment 1 diagnostic log (`poll response keys=... portMappings=... status=... desiredStatus=...`) on every poll so Sir Robert can confirm from production logs that `portMappings` stays `None` for HTTP-proxy pods (root-cause confirmation).
- Replaced the terse `"status=%s, waiting..."` log with the Section 7 Tertiary log (`desiredStatus=%s, runtime=%s, elapsed=%.0fs`) so future Phase A issues are diagnosable.

### 2. `orchestrator/cloud_engines/video_engine/config.py`

- Line 50: `RUNPOD_POD_STARTUP_TIMEOUT` default changed from `"300"` to `"600"`. Cold start with Docker pull can approach 6 min; 600s provides safety margin.

## Intentionally NOT changed (deferred)

- Optional `GET /` root endpoint on the worker (Section 7 "Optional") — defer to a separate PR.
- The 7 fixes from the withdrawn implementation prompt — out of scope here.

## Railway env var update required

Set (or update) on the orchestrator service in Railway:

```
RUNPOD_POD_STARTUP_TIMEOUT=600
```

The code default is now 600, but keeping the env var explicit makes the operational budget visible in Railway's config.

## Verification test (one)

After merge + deploy:

1. Trigger a fresh video generation (cold pod — either wait out idle timeout or terminate any existing pod).
2. Tail orchestrator logs during the wait. Every 10s you should see a `poll response keys=... portMappings=... status=... desiredStatus=...` line.
3. **Confirms root cause** if `portMappings=None` persists for the whole wait while `desiredStatus=RUNNING` appears quickly, and Phase A now exits promptly (seconds, not minutes) instead of timing out at 300s.
4. Phase B `/health` polling should then take over and report `model_loaded=true` within the cold-start budget (~4 min on L40S), and generation should proceed.

If `portMappings` ever populates, that's new information — capture the response and revisit the Option A variant in the report.
