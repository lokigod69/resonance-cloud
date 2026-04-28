# Production Boundary

- Active app repo: `orchestrator/`.
- Frontend/API production surface: Vercel frontend plus `frontend/api/*.ts`.
- Auth, database, and storage: Supabase.
- Worker: Python job runner.
- GPU worker: `ltx-worker`.
- Local FastAPI workspace routes are local/dev only and must not be production-exposed.
- Canonical Supabase migration folder: `orchestrator/frontend/supabase/migrations`.
- Do not make production changes in duplicated/snapshot folders such as `_review`, `_spotcheck`, `tmp`, `phase2b_push`, or generated `content`.
