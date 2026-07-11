# Lingwave Orchestrator

Monorepo for **Lingwave** (formerly Resonanz), a language-learning app: guided daily
lessons, an SRS deck/card engine, AI music, and a voice tutor.

Two production halves live here:

| Half | Where | Runs on |
| --- | --- | --- |
| Web app (React 19 + TS + Vite + Tailwind v4) | `frontend/` (serverless functions in `frontend/api/`) | Vercel + Supabase (auth/DB/storage), iOS via Capacitor |
| Generation backend (Python worker) | `job_runner.py`, `start_cloud.py`, `src/`, `cloud_engines/` | Railway (`Dockerfile.cloud`, `railway.toml`) |

## Frontend

```bash
cd frontend
npm install
npm run dev        # local dev server
```

Before claiming a change done:

```bash
npm run typecheck   # tsc -b --noEmit (excludes frontend/api — use tsc -p tsconfig.api.json for functions)
npm run lint        # your changed lines must add zero new errors
npm run check:i18n  # every user-facing string needs en/de/fr keys
```

Conventions: commits go directly to `main`; i18n via `useTranslation`/`t()` with keys in
`src/lib/translations.ts`; Vercel functions use named exports (`GET`, `POST`), never
`export default`; prefer theme CSS variables over hardcoded colors.

## Generation backend

One worker process polls Supabase for jobs and runs engines **in-process**
(`DISPATCH_MODE=direct` via `src/cloud_dispatcher.py` → `cloud_engines/*`):

```bash
uv sync                        # install Python deps
uv run pytest tests/ -x -q     # test suite
```

Cloud entry point is `start_cloud.py` (env pre-flight + health server + `job_runner.py`).
The deploy image is `Dockerfile.cloud`; required env vars are listed in
`.env.cloud.example` and checked at boot.

Engines: concept, image, song, video, assembly, bookend under `cloud_engines/`.
**Video is deprecated user-facing** but the pipeline stays for legacy decks and
admin/support — see `docs/Refactors/FABLE_VIDEO_DEPRECATION_BOUNDARY.md`.

## Legacy local mode (DAW) — removed 2026-07-11

The original local workflow (FastAPI app in `src/app.py` + `src/routers/`, per-engine HTTP
servers, `start*.bat` launchers) was never part of any deployment and was deleted in the
2026-07-11 cleanup pass. It lives in git history if ever needed; `src/dispatcher.py` and
`src/pipeline.py` remain as part of the preserved video pipeline. Don't rebuild on the DAW.

## Where to read more

- `memory/` — living project memory (start with `INDEX.md` and `STATE.md`).
- `docs/Stabilization/` — Phase 1 hardening program (roles/credits, atomic RPCs, quotas).
- `docs/Refactors/` — cleanup audits and the video deprecation boundary.
- `docs/Product/` — current product direction (guided Today missions, TestFlight prep).
- `docs/Infrastructure/` — GPU/LTX worker specs and the video-disable plan.
- `docs/archive/` — historical docs (pipeline-era architecture, handoffs, investigations).
- Investigation/audit reports for new work go one level up in
  `D:\CODING\ResonanceTEST\investigations\`, not in `docs/`.
