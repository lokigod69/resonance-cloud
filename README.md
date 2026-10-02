# Lingwave Orchestrator

Monorepo for **Lingwave** (formerly Resonanz), a language-learning app: guided daily
lessons, an SRS deck/card engine, AI music, and a voice tutor.

Two production halves live here:

| Half | Where | Runs on |
| --- | --- | --- |
| Web app (React 19 + TS + Vite + Tailwind v4) | `frontend/` (serverless functions in `frontend/api/`) | Vercel + Supabase (auth/DB/storage), iOS via Capacitor |
| Generation backend (Python worker) | `job_runner.py`, `start_cloud.py`, `src/`, `cloud_engines/` | Railway (`Dockerfile.cloud`, `railway.toml`) |

## Frontend

Start with the [shared working rules](AGENTS.md) and the
[frontend feature map](frontend/README.md). The map includes project skills,
focused checks and signed-in fixture previews. Command roots are explained in
[AGENTS.md](AGENTS.md#command-and-search-roots).

```bash
cd frontend
npm ci
npm run dev        # local dev server
```

Follow [Checking your work](AGENTS.md#checking-your-work) for the required checks;
[package.json](frontend/package.json) owns the executable commands. Git, locale,
API and theme rules are maintained in AGENTS.md rather than repeated here.

## Generation backend

One worker process polls Supabase for jobs and runs engines **in-process**
(`DISPATCH_MODE=direct` via `src/cloud_dispatcher.py` → `cloud_engines/*`):

```bash
uv sync                        # install Python deps
uv run pytest tests/ --ignore=tests/manual -x -q
```

Cloud entry point is `start_cloud.py` (env pre-flight + health server + `job_runner.py`).
The deploy image is `Dockerfile.cloud`; required env vars are listed in
`.env.cloud.example` and checked at boot.
For the existing Windows virtual environment and known test failures, consult
[current state](memory/STATE.md) before interpreting a baseline result.

Engines: concept, image, song, video, assembly, bookend under `cloud_engines/`.
**Video is deprecated user-facing** but the pipeline stays for legacy decks and
admin/support — see `docs/Refactors/FABLE_VIDEO_DEPRECATION_BOUNDARY.md`.

## Legacy local mode (DAW) — removed 2026-07-11

The original local workflow (FastAPI app in `src/app.py` + `src/routers/`, per-engine HTTP
servers, `start*.bat` launchers) was never part of any deployment and was deleted in the
2026-07-11 cleanup pass. It lives in git history if ever needed; `src/dispatcher.py` and
`src/pipeline.py` remain as part of the preserved video pipeline. Don't rebuild on the DAW.

## Where to read more

- [memory/INDEX.md](memory/INDEX.md) — living project memory; read INDEX and STATE for implementation or a resume, then only relevant topic notes.
- `docs/Stabilization/` — Phase 1 hardening program (roles/credits, atomic RPCs, quotas).
- `docs/Refactors/` — cleanup audits and the video deprecation boundary.
- `orchestrator/docs/Product/` — app-repository product references (guided Today missions, TestFlight prep); check each document's date and supersession notice. Workspace `D:/CODING/ResonanceTEST/docs/Product/` is a separate collection of coordination/design notes.
- `docs/Infrastructure/` — GPU/LTX worker specs and the video-disable plan.
- `docs/archive/` — historical docs (pipeline-era architecture, handoffs, investigations).
- Investigation/audit reports for new work go one level up in
  `D:\CODING\ResonanceTEST\investigations\`, not in `docs/`.
