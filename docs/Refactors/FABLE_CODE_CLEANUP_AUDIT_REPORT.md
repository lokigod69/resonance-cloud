# Code Cleanup & Launch-Readiness Audit — July 2026

**Author:** Fable (senior architecture review), 2026-07-06
**Scope:** one token-efficient cleanup pass before TestFlight/private beta. Broad scanning was
delegated (Codex + subagents); every decision-relevant claim below was then verified
first-hand in source before any change landed.
**Companion docs:** `FABLE_VIDEO_DEPRECATION_BOUNDARY.md` (the video line, surface by surface),
`FABLE_SAFE_CLEANUP_PATCH_PLAN.md` (patch ledger + later-pass roadmap).

## 1. Current state, in one page

Lingwave is two production systems in one repo. The live product is the `frontend/` React
app (Vercel + Supabase, Capacitor iOS shell) — ~46 pages, ~30 routes duplicated across two
skins (classic `AppLayout` vs glassy `PolishGlassLayout`, chosen in `App.tsx:223-266`), with
Vercel serverless functions in `frontend/api/`. The generation backend is a single Python
worker on Railway (`start_cloud.py` → `job_runner.py` → `src/orchestration/*` →
in-process `src/cloud_dispatcher.py` → `cloud_engines/*`). A third system — the original
local "DAW" (FastAPI routers, per-engine HTTP servers, `start*.bat`) — is legacy, gated
behind `STORAGE_MODE != "cloud"`, and **not part of any deployment** (the cloud image never
copies the FastAPI server; `Dockerfile.cloud:37-39,47`).

Health signals are better than the mission brief assumed:

- **Phase 1 hardening is real.** All paid-provider endpoints (`voice-chat`, `grok-token`,
  `suggest-words`, `extract-vocabulary`, `translate-and-ipa`, `guided-transcribe`) gate
  `requireSupabaseUser` + body-size caps + `consume_api_quota` RPC (verified line-by-line in
  `grok-token.ts`, by import pattern in the rest). Phase 1C is done; no cost-exposure blocker.
- **Direct Supabase writes are contained.** Full frontend sweep: generation, credits, roles,
  retries, deck lifecycle all go through RPCs (`submit_generation`, `request_word_retry`,
  `redeem_invite_code`, `admin_*`, …). Direct `.insert/.update/.delete` touch only
  self-owned rows: `profiles` (theme/skin/name/language/daily cap), `speak_conversations` /
  `speak_messages`, `recall_attempts` (SRS), `words.tts_audio_url` (TTS refresh),
  one `decks` quick-create in `DeckPickerSheet.tsx:80`, and admin-only curriculum tables.
  No `.upsert` anywhere. One to keep an eye on: `useEditImagelessCard.ts:27` does a generic
  `words.update(updates)` — RLS-scoped, but the widest direct write in the app.
- **Video is already 90% severed in the UI.** Nav layouts: zero video references.
  `StudyModeSelector.tsx:26` already hides the video mode. `/study/video` (App.tsx:237,259)
  and the `VideoPlayer` route (App.tsx:210) have **zero inbound links** — deep-link-only.
  The one live conflict was the "Video" lane tile offered to every new-deck user in
  `ProductLaneStep.tsx` — now hidden (Patch B).
- **Two assumed risks are non-issues.** No `engines/` dir exists (no `engines/` vs
  `cloud_engines/` source-of-truth split). Local destructive FastAPI routes cannot load in
  production (image bakes `STORAGE_MODE=cloud`; FastAPI server not shipped).

## 2. Keep / Hide / Remove / Do-not-touch

**KEEP** — backend video pipeline wholesale (`cloud_engines/video_engine|assembly_engine|bookend_engine`,
`src/services/suno_bakein.py`, `publishing.py`, orchestration video paths), worker state
machine, Phase 1A/1B RPCs, all active card/study/music/speak flows, legacy video playback
surfaces (deck views, VideoPlayer, SharePage, `/study/video` routes), admin video panels
incl. Ken Burns option in `fieldConfigs.ts` (admin-only), `src/api.ts` (live admin imports),
`generate.productLane.video.*` i18n keys.

**HIDE (landed)** — the video lane tile for new decks, behind `VIDEO_LANE_ENABLED=false`
(`lib/productFlags.ts`, commit `6b5991ce`).

**REMOVE (landed, provably dead)** — DAW stage panels `components/stages/*` (8 files),
`StageSettings.tsx`, `pages/Settings.tsx`, `GeminiAccentPicker.tsx` (commit `ade651bc`,
−1,854 lines); `AppSidebar.tsx` with its stale `/admin/costs` link (commit `baaeea7c`).
Deadness proof per file: zero importers repo-wide (incl. dynamic imports), absent from
`routeImports.ts`/`App.tsx`, mtime-checked against the concurrent session, tsc + full
production build green after deletion.

**DO NOT TOUCH** — the `videos` storage bucket (card PNGs upload into it —
`card_worker.py:710-783`); `start_cloud.py` POD_* boot gate (worker dies without the
video-era env vars — see §4); `words` video columns (selected by active queries);
`submit_generation`/`request_word_retry`; pricing/credits; Supabase schema; the
classic-vs-glassy page pairs (owned by the parallel TestFlight UX workstream).

## 3. What changed in this pass

| Commit | Patch | Summary |
| --- | --- | --- |
| `6b5991ce` | B | Video lane hidden from new-deck wizard (both skins, one shared component, flag-reversible) |
| `ade651bc` | A1 | Dead DAW-era UI cluster removed (−1,854 lines) + orphaned test-script assertion dropped |
| `baaeea7c` | A2 | Dead `AppSidebar` removed (−129 lines) |
| `b749a300` | A3 | `study.addCardsHint`/`study.generateFirst` said "videos" to card-deck users in Image mode — now media-neutral in en/de/fr (staged surgically around a concurrent session's uncommitted work) |
| (docs commit) | D | README rewritten (was describing the retired local DAW as the product); this doc set; project brain (`memory/`) installed |

Verification per patch: `npm run typecheck` ✅, eslint on changed files ✅ (0 new),
full `npm run build` ✅ after each deletion, `npm run check:i18n` ✅ (only the 5 known
warn-only `speak.*` fr gaps, untouched by this pass), `git diff --check` ✅.
No Python files changed ⇒ no pytest run needed.

## 4. What remains risky (known, deliberate, documented)

1. **Worker boot depends on video-era env vars.** `start_cloud.py:66-89` fail-fasts on
   `POD_URL`/`POD_AUTH_TOKEN` (LTX pod). Unsetting them in Railway kills card/music
   generation. Defer relaxing the gate until product confirms legacy video repair is dead (L4).
2. **Card PNGs live in the `videos` bucket** — any future storage cleanup must migrate them
   first (L6).
3. **Skin-pair duplication** (7 classic/PG page pairs) is the largest remaining mess; blocked
   on the glassy-only-for-beta decision (owner sign-off), not on engineering (L1).
4. **`useEditImagelessCard`'s generic `words.update`** — verify RLS column restrictions when
   next touching that flow.
5. **Landing experiment routes `/a`, `/b`, `/landing/*` are publicly routable** (flagged by
   the parallel UX session; decision owed there).
6. **Admin Profiles voice/LoRA pickers** call local-DAW endpoints via `src/api.ts`
   (`getLoras`/`getVoices`) that don't exist in production — admin-only breakage, inventory
   note for the admin cleanup pass.

## 5. Later-pass roadmap

See the ranked table with triggers in `FABLE_SAFE_CLEANUP_PATCH_PLAN.md` (L1–L8). Explicitly
out of scope by mission: Stripe/iOS work, provider abstraction, pipeline refactor, schema
changes, pricing.

## 6. Method note (honest accounting)

The heavy scanning was delegated: an Explore survey (structure/git-history), a Codex deep
scan, and a Sonnet inventory (mutations / stale copy / env vars). The Codex run gathered
solid evidence — its interim findings (AppSidebar dead, `/admin/costs` stale, route/nav
reachability) fully converged with my independent checks — but its runtime wedged twice
while writing the packet file, so `CODEX_REPO_INTEL_PACKET.md` was never delivered. Its
recovered findings are folded into this report; nothing here rests on an unverified
Codex claim. Env-var hygiene from the Sonnet sweep (referenced-but-undocumented
`VITE_PUBLIC_WEB_ORIGIN`, `VITE_PUBLIC_API_ORIGIN`, `VITE_NATIVE_AUTH_REDIRECT_URL`,
`VITE_APP_URL`; documented-but-unreferenced `VITE_STRIPE_PUBLISHABLE_KEY`) is recorded here
for the next `.env.example` refresh — no code change warranted now (Stripe is out of scope).
