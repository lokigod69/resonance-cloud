# LTX / Video Feature Disable Plan

**Goal:** discontinue video generation in Resonance for now, keep all video code
dormant and revivable, and do it without breaking card generation, guided Today,
Speak, decks, study (flashcards/audio/image/canvas), music, or admin
observability. Avoid DB schema changes and avoid touching `submit_generation` /
`request_word_retry` unless a concrete blocker appears.

**Status of this document:** plan only. Do **not** implement until asked. This
lists the exact files/functions to change and the safest order.

---

## 1. Current state — video is already half-disabled

A prior pass already removed the **study-mode** video surface:

- `frontend/src/pages/StudyModeSelector.tsx:26-35` — explicit comment "Video is
  discontinued (hidden from the selector); its study pages remain for the Image
  mode to clone." The `MODES` array no longer includes a video entry (only
  `text`, `image`, `audio`, `canvas`).

What is **still exposed**:

- The generation wizard still offers the **"Video & Music"** product lane:
  `frontend/src/components/generate/steps/ProductLaneStep.tsx:50-55` (the
  `value: 'video'` tile) and its label "Video & Music"
  (`steps/ConfirmStep.tsx:21`).
- The wizard's default lane fallback is still `'video'`:
  `components/generate/useWizardState.ts:813` (`?? 'video'`) and `:816`
  (`laneToDeckType(lane) ?? 'video'`).
- Backend pipeline, adapters, worker, routes, and the `VideoPlayer` page are all
  intact (correct — we want them dormant, not removed).

So the remaining work is: **stop new `deck_type='video'` decks from being
created**, while leaving everything else untouched.

---

## 2. Recommended strategy: front-of-funnel removal behind a flag

The cleanest, lowest-risk disable is **product-lane removal in the frontend**,
gated by a single re-enable flag. This:

- requires **zero backend changes**,
- requires **zero DB/schema changes**,
- does not touch `submit_generation` or `request_word_retry`,
- keeps every video component/route/adapter compiled and dormant,
- keeps old completed videos viewable (they use stored URLs, not the worker).

Because card decks already bypass the video stage entirely
(`feeder.py:959-971`), simply never offering the `video` lane means no new word
ever enters `video_queued`.

### 2a. The single re-enable switch

Add one constant (mirroring the existing `RUNNER_GAME_ROUTE_ENABLED = false`
pattern at `frontend/src/App.tsx:72`). Suggested location: a small shared module,
e.g. `frontend/src/lib/featureFlags.ts`:

```ts
// Master switch for the discontinued Video & Music lane. Flip to true to
// re-enable video generation end-to-end (also requires POD_URL/POD_AUTH_TOKEN
// on the worker side — see GPU_WORKER_ACCESS_INVENTORY.md).
export const VIDEO_GENERATION_ENABLED = false
```

Optionally allow an admin/dev override (e.g. read a `localStorage` key or an
admin-only setting) so the team can still QA video without a redeploy. Keep it
out of the normal user flow.

### 2b. Exact files / functions to change (frontend only)

| # | File | Change |
|---|------|--------|
| 1 | `frontend/src/lib/featureFlags.ts` (new) | Add `VIDEO_GENERATION_ENABLED = false`. |
| 2 | `frontend/src/components/generate/steps/ProductLaneStep.tsx` | In `allTiles` (lines 31-56), filter out the `value: 'video'` tile when `!VIDEO_GENERATION_ENABLED`. Keep the tile definition in place — just don't render it. |
| 3 | `frontend/src/components/generate/useWizardState.ts` | Change the default lane fallback from `'video'` (line 813) to a card lane (e.g. `'card_standard'`) when video is disabled, and `laneToDeckType(lane) ?? 'video'` (line 816) so a missing lane never silently becomes a video deck. Leave the `ProductLane` type and all `laneTo*` helpers intact. |
| 4 | `frontend/src/components/generate/steps/ConfirmStep.tsx` | No change needed for hiding, but verify the confirm summary never resolves to "Video & Music" once the tile is gone. The `laneLabel` mapping (line 21) can stay. |

That is the entire minimum patch. Items 1-3 are required; item 4 is verification.

### 2c. Optional defense-in-depth (only if you want belt-and-suspenders)

If you want the backend to *also* refuse to spin up video work even if a video
deck somehow arrives (e.g. an old client, a crafted request), add a **read-only
guard** that converts the video stage into a no-op/skip rather than calling the
worker. The non-invasive seam is the upstream handoff:

- `src/orchestration/upstream_worker.py:152-167` transitions `song →
  video_queued`. A flag here could instead transition `song →
  post_video_queued` (skip the video stage) when video is globally disabled.

This is **optional and higher-risk** (it changes pipeline routing) — do not do it
in the first pass unless a concrete leak of `video` decks is observed. The
frontend lane removal is sufficient for "discontinue for users."

---

## 3. The startup blocker you must respect

**Do not unset `POD_URL` / `POD_AUTH_TOKEN` in the deployment to "turn off"
video.** Both startup gates hard-require them:

- `start_cloud.py:79-89` → `sys.exit(1)`
- `job_runner.py:142-158` (`assert_pod_credentials`, called `:250`) → `SystemExit`

If those vars are removed, the **entire orchestrator stops** — cards, music, and
all generation die with it, even though none of them need the GPU. Two safe
options:

1. **Leave `POD_URL`/`POD_AUTH_TOKEN` set** (even pointing at a now-idle or
   decommissioned pod). Since no new `video` decks are created, the worker is
   simply never called. This is the least-effort, zero-code option and is the
   recommended default.
2. **Relax the startup gate** (small, surgical) so the orchestrator can boot
   without pod credentials when video is disabled. If you choose this, change
   *both* gates together and guard with the same flag:
   - `start_cloud.py:_check_required_env` (lines 66-89)
   - `job_runner.assert_pod_credentials` (lines 142-158)
   Make the `POD_URL`/`POD_AUTH_TOKEN` checks conditional on
   `VIDEO_GENERATION_ENABLED` (server-side env, e.g. `VIDEO_GENERATION_ENABLED`
   defaulting to off). Leave `pod_manager.ensure_pod_ready()` as-is — it will
   only ever be reached if a video job runs, which won't happen while disabled.

Recommendation: **start with option 1** (keep the vars set, change nothing on the
backend). Only adopt option 2 when the GPU pod is actually being torn down and
you don't want dummy credentials lingering.

---

## 4. What explicitly must NOT change

- `submit_generation` (Supabase RPC) and `request_word_retry` — no change. The
  frontend simply stops sending `deck_type='video'`.
- Any database table, column, RLS policy, or migration — no change. (Do not rerun
  old migrations.)
- The video adapters (`ltx_selfhosted.py`, `ltx_runpod.py`, `ltx.py`,
  `kling.py`, `ken_burns.py`), `router.py`, `pod_manager.py`,
  `video_dispatcher.py`, `downstream_worker.py` — leave dormant and intact.
- `VideoPlayer` page and `/deck/:id/word/:wordId` route (`App.tsx:203`) — keep,
  so existing videos remain viewable.
- Admin Queue / observability — no change. `admin/Queue.tsx:264,344` only
  *displays* `deck_type` (`job.deck_type || 'video'`); it does not assume a video
  job exists. `admin/ObservabilityWordDetail.tsx` and `components/stages/VideoPanel.tsx`
  render video data only when present.

---

## 5. Safest implementation order (when authorized)

1. Add the flag module (`featureFlags.ts`), default `false`.
2. Gate the `video` tile out of `ProductLaneStep` (`allTiles` filter).
3. Fix the default-lane fallbacks in `useWizardState.ts` (no silent video).
4. Run frontend checks from `orchestrator/frontend`:
   `npm run typecheck`, `npm run lint`, `npm run check:i18n`.
   (No new i18n keys are required if you only hide the existing tile; if you add
   any user-facing copy, add en/de/fr.)
5. Manual smoke: open the generate wizard → confirm only the three card lanes
   appear and no path produces a `video` deck. Confirm Decks, Study
   (text/image/audio/canvas), Music, Speak, and admin Queue all still load.
6. Leave `POD_URL`/`POD_AUTH_TOKEN` in the deployment (option 1 above). No
   backend deploy needed.
7. (Later, only when the pod is decommissioned) optionally relax the startup gate
   per §3 option 2.

---

## 6. Re-enable path

Flip `VIDEO_GENERATION_ENABLED = true`, redeploy frontend, ensure a worker is
reachable with `POD_URL`/`POD_AUTH_TOKEN` set (see
`GPU_WORKER_CLEAN_REINSTALL_PLAN.md` and `ltx-worker/POD_RESTORE.md`). Because no
code was deleted, this is a configuration flip plus a live worker — no code
restoration required.

---

## 7. Final answer — exact Resonance files to touch to disable video

Minimum (frontend, no backend, no DB):

1. `frontend/src/lib/featureFlags.ts` *(new — single `VIDEO_GENERATION_ENABLED` flag)*
2. `frontend/src/components/generate/steps/ProductLaneStep.tsx` *(filter the `video` tile)*
3. `frontend/src/components/generate/useWizardState.ts` *(default-lane fallbacks at lines 813, 816)*
4. `frontend/src/components/generate/steps/ConfirmStep.tsx` *(verify only)*

Already done in a prior pass:
- `frontend/src/pages/StudyModeSelector.tsx` *(video study mode already hidden)*

Optional, only if defense-in-depth is required (higher risk, pipeline routing):
- `src/orchestration/upstream_worker.py:152-167` *(skip `video_queued`)*
- `start_cloud.py:66-89` + `job_runner.py:142-158` *(relax POD_* startup gate)*
