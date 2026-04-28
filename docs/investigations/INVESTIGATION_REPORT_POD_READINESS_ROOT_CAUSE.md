# Investigation Report: pod_manager Readiness Timeout Root Cause

**Investigator:** Antigravity (code-read investigation, 2026-04-16)
**Status:** ROOT CAUSE IDENTIFIED with high confidence

---

## 1. TL;DR

**The bug is in Phase A of `_wait_for_pod_ready()`, not Phase B.** Phase A gates on `data.get("portMappings")` being truthy ([pod_manager.py:212–213](file:///d:/CODING/ResonanceTEST/orchestrator/cloud_engines/video_engine/pod_manager.py#L212-L213)), but pods created with HTTP proxy mode (`"ports": ["8080/http"]`) do **not** populate `portMappings` — that field is for TCP port forwarding. Phase A loops for the entire 300s timeout, Phase B (the `/health` check that actually works correctly) **never executes**, and the pod is killed with the misleading error `"did not enter RUNNING state"`. The worker's health endpoint, auth middleware, and model-loaded signaling are all correct and were never the problem.

**The narrowest fix:** Remove the `and ports` gate from Phase A's break condition (line 213), or replace it with a check on a field that actually populates for HTTP-proxy pods (e.g., `runtime.status` or the pod's `status` field). Also increase the timeout default to 600s as a safety margin.

---

## 2. Current Code Behavior

### 2.1 `_create_pod()` — [pod_manager.py:76–172](file:///d:/CODING/ResonanceTEST/orchestrator/cloud_engines/video_engine/pod_manager.py#L76-L172)

- Iterates `RUNPOD_VOLUME_IDS` × `MAX_CREATE_RETRIES=3` with a 30s inter-attempt delay
- Sends `POST /v1/pods` with payload including `"ports": ["8080/http"]` (line 105) — this configures HTTP proxy mode, NOT TCP port forwarding
- On 200/201, extracts `pod_id` from `data.get("id")` (line 138)
- Logs `portMappings` from create response: `data.get("portMappings")` (line 146) — **production log shows this is `None`**
- Returns `(pod_id, auth_token)`

### 2.2 `_wait_for_pod_ready()` — [pod_manager.py:180–253](file:///d:/CODING/ResonanceTEST/orchestrator/cloud_engines/video_engine/pod_manager.py#L180-L253)

Two-phase design:

**Phase A (lines 190–216):** Polls `GET /v1/pods/{pod_id}` every 10s. Break condition:
```python
status = data.get("desiredStatus", "")          # line 211
ports = data.get("portMappings") or {}          # line 212
if status == "RUNNING" and ports:               # line 213
    break
```
On timeout: terminates pod, raises `TimeoutError("Pod {id} did not enter RUNNING state within {timeout}s")` (line 194).

**Phase B (lines 221–253):** Polls `GET {proxy_url}/health` with `Authorization: Bearer {auth_token}` every 10s. Checks `status == "healthy"` AND `model_loaded is True`. On timeout: terminates pod, raises `TimeoutError("Pod {id} health check did not pass within {timeout}s")` (line 225).

### 2.3 `_quick_health_check()` — [pod_manager.py:292–299](file:///d:/CODING/ResonanceTEST/orchestrator/cloud_engines/video_engine/pod_manager.py#L292-L299)

Fast-path health probe for already-ready pods. Probes `/health` with auth, checks `model_loaded is True` only (does NOT check `status == "healthy"` — minor inconsistency with Phase B, but not the root cause).

### 2.4 `ensure_pod_ready()` — [pod_manager.py:302–337](file:///d:/CODING/ResonanceTEST/orchestrator/cloud_engines/video_engine/pod_manager.py#L302-L337)

Public entry point. Acquires `_lock` (line 310), holds it through `_create_pod()` and `_wait_for_pod_ready()`. On any exception, attempts `_terminate_pod_locked()` cleanup, then re-raises.

### 2.5 Worker `GET /health` — [app.py:93–120](file:///d:/CODING/ResonanceTEST/ltx-worker/src/app.py#L93-L120)

- **Exempt from auth** — middleware explicitly skips auth for `/health` path (line 63)
- Returns JSON with `status: "healthy"|"loading"`, `model_loaded: true|false`, plus GPU/VRAM/queue info
- `model_loaded` is backed by `_inference.loaded` which becomes `True` at [inference.py:134](file:///d:/CODING/ResonanceTEST/ltx-worker/src/inference.py#L134) after all pipelines + upsampler are loaded

### 2.6 Worker `GET /` (root) — DOES NOT EXIST

- No `@app.get("/")` route registered in [app.py](file:///d:/CODING/ResonanceTEST/ltx-worker/src/app.py)
- Registered routes: `GET /health`, `POST /generate`, `GET /jobs/{job_id}`, `GET /jobs/{job_id}/result`
- FastAPI returns 404 for unregistered routes (not 401)
- **But:** the auth middleware (line 61–69) runs BEFORE route matching. For paths other than `/health`, it checks for a valid Bearer token. If the token is missing/invalid, it returns 401 BEFORE FastAPI can return 404
- This explains the production log: `GET / HTTP/1.1 401 Unauthorized` — the middleware rejects the request before route matching

### 2.7 Worker auth middleware — [app.py:61–69](file:///d:/CODING/ResonanceTEST/ltx-worker/src/app.py#L61-L69)

```python
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.url.path == "/health":        # exempt
        return await call_next(request)
    if WORKER_AUTH_TOKEN:
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer ") or auth[7:] != WORKER_AUTH_TOKEN:
            return JSONResponse(status_code=401, content={"error": "Unauthorized"})
    return await call_next(request)
```

Only `/health` is exempt. All other paths (including `/`) require auth.

### 2.8 Worker entrypoint

Dockerfile CMD: `python -u -m src.rp_handler` (serverless mode) — [Dockerfile:38](file:///d:/CODING/ResonanceTEST/ltx-worker/Dockerfile#L38)

But pod_manager overrides this: `"dockerStartCmd": ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8080"]` — [pod_manager.py:106](file:///d:/CODING/ResonanceTEST/orchestrator/cloud_engines/video_engine/pod_manager.py#L106)

So pods run `app.py` (FastAPI), not `rp_handler.py`. Confirmed.

### 2.9 Timeout configuration

`RUNPOD_POD_STARTUP_TIMEOUT` defaults to `300` in [config.py:50](file:///d:/CODING/ResonanceTEST/orchestrator/cloud_engines/video_engine/config.py#L50). This is a single shared deadline for both Phase A and Phase B.

---

## 3. Hypothesis Verdicts

### Hypothesis A — No `GET /` route blocks RunPod proxy routing

| Question | Answer |
|---|---|
| A1. Does worker have `GET /`? | **No.** Only `/health`, `/generate`, `/jobs/{id}`, `/jobs/{id}/result`. |
| A2. What returns for `/`? | 401 (auth middleware intercepts before route matching). |
| A3. RunPod proxy readiness docs? | RunPod docs state proxy routes based on Pod ID and port, not based on an application health check. Quote: *"If your service takes too long to bind to the port...the proxy might attempt to route traffic before the application is ready."* This implies the proxy routes as soon as uvicorn binds, not based on a health probe. |
| A4. 100.64.x.x source? | This is RunPod's internal network (documented for inter-pod communication via Global Networking). The GET / requests are from RunPod's infrastructure, not from pod_manager. |
| A5. Does the 401 prevent proxy routing? | **AGENT UNCERTAIN (#1).** RunPod docs don't document a proxy readiness check for pods (only serverless has /ping). The proxy may route purely based on the container's port being open, regardless of what it returns. |

**Verdict: PLAUSIBLE UNVERIFIED — but SECONDARY.** Even if this is true, it cannot be the primary root cause because **Phase B never executes** (see root cause below). This hypothesis only becomes relevant after Phase A is fixed. If Phase A is fixed and Phase B's /health probes still get connection refused or 502, then this hypothesis becomes the blocker.

---

### Hypothesis B — Phase A checks the wrong RunPod field

| Question | Answer |
|---|---|
| B1. What fields does GET /v1/pods/{id} return? | Per RunPod docs: `id`, `desiredStatus`, `status`, `machineId`, `gpu`, `machine`, `portMappings`, `costPerHr`, etc. Both `desiredStatus` (intended state) and `status` (actual state) exist. |
| B2. Which field is authoritative? | `status` (or `runtime.status` in some API versions) indicates actual state. `desiredStatus` is always "RUNNING" from the moment of creation — it's the user's intent, not reality. |
| B3. How fast does Phase A exit? | **It NEVER exits.** Production logs show `status=RUNNING, waiting...` from 07:55:43 to 08:00:47 (304 seconds). Phase A consumed the entire timeout. |
| B4. Does portMappings populate? | **No.** `portMappings` provides TCP port-to-public-port mappings (e.g., `{"22": 10341}`). The pod is created with `"ports": ["8080/http"]` which sets up HTTP **proxy** mode, not TCP port forwarding. HTTP-proxy pods have no TCP port mappings, so `portMappings` is always null/empty. |

> [!CAUTION]
> **Verdict: CONFIRMED — THIS IS THE ROOT CAUSE.**

The break condition at line 213 is:
```python
if status == "RUNNING" and ports:    # ports = data.get("portMappings") or {}
```

- `status` (`desiredStatus`) is `"RUNNING"` immediately ✅
- `ports` (`portMappings`) is **always falsy** for HTTP-proxy pods ❌

Phase A loops forever → consumes the entire 300s timeout → Phase B never runs → pod killed.

**The error message "did not enter RUNNING state" is doubly misleading**: (1) the pod IS in RUNNING state (`desiredStatus`), and (2) the actual blocker is `portMappings`, not the status field.

---

### Hypothesis C — 300s too short for cold start

| Question | Answer |
|---|---|
| C1. Timeline reconstruction | Create: 07:55:42 → Worker ready: 07:59:35 = **3 min 53s**. Breakdown: ~1:30 model shards, ~6s T2V pipeline + LoRA, ~2:15 group offloading + upsampler. |
| C2. FastAPI startup message? | Uvicorn logs `Application startup complete` before model loading begins (the lifespan handler spawns model load in a background thread, line 52 of app.py). So `/health` responds immediately (with `model_loaded: false`). |
| C3. Time from "ready" to first successful /health? | Worker is ready at 07:59:35. Phase B would succeed immediately (checking `model_loaded: true`). But Phase B never ran. |
| C4. Safe upper bound? | 3:53 on L40S. First Docker pull adds 1–2 min. Safe budget: ~6 min. 600s would be sufficient. |

**Verdict: PARTIAL.** The timeout IS tight considering cold starts with Docker pull. But even with a 600s timeout, Phase A would loop for the entire 600s because `portMappings` never populates. Increasing timeout alone does NOT fix the bug.

---

### Hypothesis D — Health probes blocked by RunPod proxy

| Question | Answer |
|---|---|
| D1. Poll interval | 10s (`_HEALTH_CHECK_INTERVAL = 10`, line 43) |
| D2. httpx timeout per probe | 15s read, 5s connect (line 228) |
| D3. Worker logs show /health requests? | **No.** Production log summary states "no further /health requests logged" before termination. |
| D4. Zero requests = proxy blocking? | Cannot distinguish — Phase B never ran, so zero /health requests is expected regardless of proxy behavior. |

**Verdict: CANNOT EVALUATE.** Phase B never executed, so no evidence exists about proxy routing. This hypothesis is moot until Phase A is fixed.

---

### Hypothesis E — Worker startup hanging

| Question | Answer |
|---|---|
| E1. Can _inference.loaded stay False? | Yes — if `_inference.load()` crashes, the `finally` block in lifespan sets `_ready` (line 50) but `_inference.loaded` remains `False`. /health would return `{"status": "loading", "model_loaded": false}` forever. |
| E2. Error reporting? | /health does NOT report the exception. It just shows `model_loaded: false` indefinitely. (Minor improvement opportunity.) |
| E3. "Model loaded" but loaded=False? | No. The log "Model loaded — worker ready for requests" comes from app.py:46 which runs inside the `_load()` function BEFORE `_ready.set()`. If this log appears, `_inference.loaded` is `True` (set at inference.py:134). |

**Verdict: REJECTED for this incident.** Worker logs confirm successful model load at 07:59:35. But the code does have an edge case where crash-on-load leaves /health permanently reporting "loading" — worth noting for robustness.

---

### Hypothesis F — Lock contention / race condition

| Question | Answer |
|---|---|
| F1. Lock held during wait? | **Yes.** `ensure_pod_ready()` acquires `_lock` at line 310 and calls `_wait_for_pod_ready()` while holding it. Lock is held for up to 300s (or 600s after timeout increase). |
| F2. Concurrent callers blocked? | Yes — all other callers to `ensure_pod_ready()`, `idle_check()`, `acquire_use()`, `release_use()` serialize behind this lock. |
| F3. Can idle_check kill a starting pod? | No — `idle_check` checks `_pod_status != "ready"` and returns early (line 361). A pod in "creating" or "starting" state won't be idle-killed. But `idle_check` IS blocked by the lock for the entire wait period. |

**Verdict: TRUE BUT NOT ROOT CAUSE.** The lock hold time is a design concern (10 min with 600s timeout), but it doesn't cause the failure. It does mean concurrent video generation requests will queue behind the first caller's full timeout.

---

### Hypothesis G — Job retry creates new pods

| Question | Answer |
|---|---|
| G1. Job runner retry loop | job_runner.py:256: `for attempt in range(MAX_RETRIES + 1)` where `MAX_RETRIES=2` (line 49). Up to 3 attempts per stage. Each calls `run_stage → adapter.generate() → ensure_pod_ready()`. |
| G2. Pod state cleanup | When `_wait_for_pod_ready` times out, `_terminate_pod_locked()` is called (line 193), which calls `_reset_state()` (line 273), resetting `_pod_id`, `_pod_status`, etc. to idle. Next call to `ensure_pod_ready` creates a fresh pod. |
| G3. Wasteful retries | Yes. Each retry spins a new pod, waits 300s, times out, kills it. 3 attempts × 300s = 15 min of blocking + ~$0.45 wasted per user request. |

**Verdict: TRUE — SECONDARY CONSEQUENCE.** The retry loop correctly retries on failure, but because the failure is deterministic (Phase A never exits), every retry fails identically. Not a bug in the retry logic — it's the Phase A bug making retries pointless.

---

## 4. Additional Hypotheses Discovered

### Hypothesis H — `desiredStatus` vs `status` field semantics

The code checks `data.get("desiredStatus", "")` but RunPod's API also has a `status` field that indicates actual operational state. According to RunPod docs, `desiredStatus` is the user's intent (always "RUNNING" after create), while `status` reflects reality (`STARTING`, `RUNNING`, `STOPPING`, etc.).

Currently this doesn't matter because the `portMappings` check blocks Phase A regardless. But after fixing the `portMappings` issue, Phase A should probably check the actual `status` field instead of (or in addition to) `desiredStatus`.

**Verdict: DEFERRED — fix after primary root cause.**

### Hypothesis I — Cloudflare 100s proxy timeout

RunPod's HTTP proxy is fronted by Cloudflare with a **hard 100-second request timeout**. This means individual /health poll requests won't time out (they complete in <1s), but it's worth noting for the generation phase: if a video generation request via the proxy takes >100s, the adapter will get a 524. The adapter already handles this with async polling (submit → poll → download), so this isn't an active issue, but it's a forward risk.

---

## 5. Diagnostic Experiments

If Sir Robert wants to independently verify the root cause before applying a fix, here are targeted experiments:

### Experiment 1: Log the full RunPod polling response (RECOMMENDED)

Add one temporary log line to Phase A to dump the raw polling response.

**File:** `pod_manager.py`, inside Phase A loop, after line 201 (`data = resp.json()`), add:
```python
logger.info("RunPod: Pod %s poll response keys=%s portMappings=%s status=%s desiredStatus=%s",
    pod_id, list(data.keys()), data.get("portMappings"), data.get("status"), data.get("desiredStatus"))
```

**What to look for:**
- If `portMappings` is always `None` or `{}` → **confirms root cause**
- If `portMappings` appears after some delay → Phase A break condition is correct but slow; the wait is expected
- Compare `status` vs `desiredStatus` — do they differ? When does `status` become "RUNNING"?

### Experiment 2: Manual curl to proxy URL during startup

After creating a pod manually from RunPod dashboard (or letting pod_manager create one without the fix):

```bash
# Immediately after pod shows RUNNING in RunPod dashboard:
curl -v https://{pod_id}-8080.proxy.runpod.net/health

# If 502/503/connection refused → proxy not ready yet
# If 200 with model_loaded:false → proxy routes correctly, worker loading
# If 200 with model_loaded:true → proxy routes correctly, worker ready
```

**What this tells us:**
- If the proxy responds at all → Hypothesis A (proxy routing) is REJECTED
- If the proxy returns 502/connection refused for minutes → Hypothesis A needs fixing too
- Timing: how long after pod RUNNING does the proxy become routable?

### Experiment 3: Check portMappings in RunPod dashboard

Go to RunPod dashboard → select a running pod → look at the JSON details or API response. Does `portMappings` appear for pods with HTTP proxy only?

### Confirmation/Rejection Table

| Hypothesis | CONFIRMED if... | REJECTED if... |
|---|---|---|
| **B (portMappings — ROOT CAUSE)** | Experiment 1 shows `portMappings=None` for entire duration | Experiment 1 shows `portMappings` populating after delay |
| **A (proxy routing)** | Experiment 2 returns 502/refused for >60s after RUNNING | Experiment 2 returns 200 while worker is still loading |
| **C (timeout too short)** | Worker takes >300s to load (not seen in current logs) | Worker loads in <300s (confirmed: 3:53) |
| **H (desiredStatus vs status)** | Experiment 1 shows `status != desiredStatus` at any point | Both fields are always identical |

---

## 6. External Findings

### 6.1 RunPod Pod Proxy Behavior

- **Proxy URL format:** `https://{pod_id}-{port}.proxy.runpod.net` — routes based on Pod ID and port number
- **Proxy infrastructure:** Fronted by Cloudflare with a **100-second hard timeout** on HTTP requests
- **Readiness routing:** RunPod documentation does NOT describe a readiness health check for pod proxy routing (unlike serverless, which uses `/ping`). The proxy appears to route as soon as the container's port is open (uvicorn binds)
- **The `100.64.x.x` requests:** These are from RunPod's internal infrastructure. They probe `GET /` (not `/health`). This is likely RunPod's own container monitoring, NOT a proxy readiness gate
- Source: RunPod Docs (Pods Networking / Expose Ports), RunPod Community forums

### 6.2 RunPod Pod Status Fields

- `desiredStatus`: User's intended state — always "RUNNING" after creation. Values: `RUNNING`, `EXITED`, `TERMINATED`
- `status`: Actual operational state. Values: `STARTING`, `RUNNING`, `STOPPING`, `TERMINATED`
- `portMappings`: TCP port-to-public-port mappings for **TCP port forwarding** mode. **Not populated for HTTP-proxy-only pods.**
- Source: RunPod REST API Reference (rest.runpod.io/v1/openapi.json)

### 6.3 Port Configuration Distinction

| Pod Config | `ports` payload | `portMappings` in response | Access method |
|---|---|---|---|
| HTTP proxy | `["8080/http"]` | **Null/empty** | `https://{id}-8080.proxy.runpod.net` |
| TCP forwarding | `["8080/tcp"]` | `{"8080": 12345}` | `{public_ip}:12345` |
| Both | `["8080/http", "22/tcp"]` | `{"22": 10341}` | Proxy for HTTP, IP:port for TCP |

**Our pods use HTTP proxy only.** `portMappings` will never populate.

---

## 7. Recommended Fix

### Primary Fix: Remove `portMappings` gate from Phase A

**What:** In [pod_manager.py:211–213](file:///d:/CODING/ResonanceTEST/orchestrator/cloud_engines/video_engine/pod_manager.py#L211-L213), change the Phase A break condition from:
```python
status = data.get("desiredStatus", "")
ports = data.get("portMappings") or {}
if status == "RUNNING" and ports:
```
to checking a field that actually reflects pod readiness. Two options:

**Option A (minimal, conservative):** Remove the `portMappings` gate and check the actual runtime status field instead:
```python
runtime_status = (data.get("runtime") or {}).get("status") if isinstance(data.get("runtime"), dict) else None
status = runtime_status or data.get("status") or data.get("desiredStatus", "")
if status == "RUNNING":
```

**Option B (simplest):** Since Phase B already validates actual worker readiness via `/health`, Phase A's job is just "wait until the pod is provisioned enough to receive traffic." If `desiredStatus == "RUNNING"`, the pod is provisioned. Remove the `portMappings` check entirely:
```python
status = data.get("desiredStatus", "")
if status == "RUNNING":
```

I recommend **Option B** because Phase B is the true readiness gate. Phase A only needs to ensure RunPod has acknowledged the pod is alive. The `portMappings` check was a well-intentioned but incorrect proxy for "pod is ready to receive traffic."

### Secondary Fix: Increase timeout default to 600s

Change `RUNPOD_POD_STARTUP_TIMEOUT` default from `300` to `600` in [config.py:50](file:///d:/CODING/ResonanceTEST/orchestrator/cloud_engines/video_engine/config.py#L50). Cold start with Docker pull can approach 6 min. Update Railway env var to match.

### Tertiary Fix: Improve Phase A logging

Log the actual response keys and status fields on each poll so future issues are diagnosable:
```python
logger.info("RunPod: Pod %s desiredStatus=%s, runtime=%s, elapsed=%.0fs",
    pod_id, data.get("desiredStatus"), data.get("runtime"),
    time.monotonic() - (deadline - timeout))
```

### Optional: Add `GET /` root endpoint to worker

Add a trivial public root endpoint to `app.py` so RunPod's internal `GET /` probes get 200 instead of 401. This stops the 401 log noise and ensures any RunPod-internal readiness checks pass:
```python
@app.get("/")
async def root():
    return {"status": "ok"}
```
Add `/` to the auth middleware exemption. This is not required for the fix but is good hygiene.

---

## 8. Risks of Recommended Fix

| Risk | Severity | Mitigation |
|---|---|---|
| Phase A exits too early (pod not actually provisioned) | Low | Phase B will catch this — /health probes will fail until uvicorn binds, then return `model_loaded: false` until ready. Phase B loops safely. |
| Phase B probes fail because RunPod proxy isn't routable yet | Medium | If this happens, Phase B logs connection errors and retries every 10s. The 600s timeout gives ample room. **AGENT UNCERTAIN (#2):** If proxy never routes (Hypothesis A), this becomes a new blocker. Experiment 2 above would reveal this. |
| `desiredStatus` might not be "RUNNING" if pod creation is deferred | Very Low | RunPod typically sets `desiredStatus` to "RUNNING" immediately on 201 response. If it doesn't, Phase A loops (correct behavior). |
| Lock held for 600s blocks concurrent requests | Medium (existing) | Already true at 300s. Not made worse by the Phase A fix itself, but the timeout increase doubles the max block time. Consider releasing the lock during `_wait_for_pod_ready` in a future PR. |

---

## 9. Open Questions

1. **AGENT UNCERTAIN (#1):** Does RunPod's pod proxy perform its own readiness check (probing `GET /`), or does it route purely based on the container's port being open? The `100.64.x.x GET / 401` logs suggest RunPod probes, but it's unclear if this gates routing. **Experiment 2 would resolve this.**

2. **AGENT UNCERTAIN (#2):** After fixing Phase A, will Phase B's /health probes reach the worker through the proxy? If RunPod's proxy doesn't route until uvicorn responds on `/`, those probes would fail with connection errors until the proxy activates. The 600s timeout should absorb this, but it's worth verifying. **Experiment 2 would resolve this.**

3. **AGENT UNCERTAIN (#3):** The exact field name for the pod's actual runtime status in RunPod's REST API is uncertain. Docs mention `status`, but some API versions nest it under `runtime.status` or `runtime.uptimeSecs`. **Experiment 1 (logging response keys) would resolve this.**

4. **AGENT UNCERTAIN (#4):** Does `portMappings` populate for HTTP-proxy pods after a delay, or truly never? Production evidence shows it never populated in 300s, and the RunPod API semantics strongly suggest it's TCP-only. But only Experiment 1 or Experiment 3 can provide 100% certainty.

5. **Minor:** `_quick_health_check()` (line 292) checks `model_loaded is True` but NOT `status == "healthy"`, while Phase B checks both. This inconsistency is harmless (if model is loaded, status is always "healthy") but should be noted for code review.

---

## Appendix: Production Log Timeline Reconstruction

```
07:55:42  _create_pod() → POST /v1/pods → 201 Created
07:55:42  Pod yjxnzc91ktvms0 created (portMappings=None)          ← portMappings already None
07:55:42  Phase A starts. Deadline = now + 300s = 08:00:42

          ┌── Phase A loop ──────────────────────────────────────────────┐
07:55:43  │  GET /v1/pods/{id} → desiredStatus=RUNNING, portMappings=?  │
          │  portMappings is falsy → continue looping                    │
07:55:53  │  Same result. Log: "status=RUNNING, waiting..."              │
07:56:03  │  Same. (Meanwhile, worker starts loading model shards)       │
  ...     │  (30 polls × 10s = 300s)                                     │
07:59:35  │  (Worker logs "Model loaded — worker ready for requests")    │
  ...     │  Phase A still looping — portMappings still falsy            │
08:00:42  │  Deadline passed                                             │
          └──────────────────────────────────────────────────────────────┘

08:00:47  _terminate_pod_locked() called
08:00:47  TimeoutError: "Pod yjxnzc91ktvms0 did not enter RUNNING state within 300s"

          Phase B NEVER EXECUTED. Worker was ready for 65 seconds before being killed.
```

**The worker was ready and waiting. pod_manager killed it because it was checking a field that can never be true for HTTP-proxy pods.**
