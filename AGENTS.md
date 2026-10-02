# Lingwave — rules for every agent

This file is the single source of working rules for Claude Code and Codex. Claude loads it through the workspace-root `CLAUDE.md` (or the one-line `orchestrator/CLAUDE.md` in a clone without the workspace); Codex reads it directly. Other files point here instead of repeating it.

## Where things are

- The app repository is `orchestrator/` (GitHub `lokigod69/resonance-cloud`, branch `main`); run git for app work from there. The workspace root `D:\CODING\ResonanceTEST` has its own local-only repository for `CLAUDE.md`, `AGENTS.md`, `protocol/`, `docs/Product/` and design notes; it has no remote. `investigations/` is not versioned.
- The app is `orchestrator/frontend`: React 19, Vite 8, Tailwind v4, Vercel project `frontend`, serverless functions in `frontend/api/`. The generation worker is `orchestrator/src`, `cloud_engines/` and `job_runner.py` on Railway. Data, auth and storage are on Supabase.
- Coordination lives in `protocol/` at the workspace root: `PROTOCOL.md` (decision rights, workstreams), `BOARD.md`, and each workstream's `NEXT_STEP.md`. For implementation or a resume, read `PROTOCOL.md` and the active `NEXT_STEP.md`.
- Other folders under `D:\CODING` with similar names (`RESONANCE*`, `resonance-cloud`) are different projects.
- Paths in this file are relative to `orchestrator/`, except that `src/…` in the rules below means `frontend/src/…` (the worker's `orchestrator/src` is always named in full).

### Command and search roots

| Task | Working directory | Example |
|---|---|---|
| Coordination and workspace product/design notes | `D:/CODING/ResonanceTEST` | `rg -n 'word-stream' protocol docs/Product` |
| App git, source search, project skills | `D:/CODING/ResonanceTEST/orchestrator` | `rg -n 'SPEAK_LLM_MODEL' frontend/api` |
| Frontend checks and previews | `D:/CODING/ResonanceTEST/orchestrator/frontend` | `npm run verify` |

Set the working directory explicitly for each command. The workspace `.gitignore` intentionally excludes the nested app repository, so root-level `rg --files` omits app files; search from `orchestrator/` instead of disabling ignore rules globally. In PowerShell, pass file patterns through `rg -g`, for example `rg -n 'B1' frontend/src/data -g 'guided*.ts'`; wildcard path operands such as `frontend/src/data/guided*` can fail.

[frontend/README.md](frontend/README.md) maps features to entry files, project skills, checks and fixture previews. Project skills live in `orchestrator/.claude/skills/` for both agents. Workspace `docs/Product/` and app `orchestrator/docs/Product/` are separate collections: qualify the root in handoffs. Search for the relevant symbol or heading, then read that section; split a truncated result into smaller reads before relying on it.

## Shipping

- A push to `main` deploys production: lingwave.ai through Vercel and the worker through Railway.
- When the owner gives you a task, finish with a commit and push of only that task's files once its checks pass, unless the owner says to hold. Migrations, paid runs and any production data write or deletion need explicit approval first (see Approvals).
- Edits to `protocol/`, root `CLAUDE.md`/`AGENTS.md` or `docs/Product/` are committed in the workspace-root repository, which is never pushed.
- Use standard `git push` through the credential manager; never change or bypass the credential flow.
- Work on `main` in this checkout. No branches, worktrees or pull requests; the GPU/LTX worker is the only exception. Vendor workflow skills that create worktrees, branches or pull requests (for example Codex's superpowers) do not apply here.
- Stage the paths you changed by name; never `git add -A` or `git add .`. Never stage, stash, revert or reformat files you did not change.
- Only one agent implements in this checkout at a time; others stay read-only. Before editing, read the `In flight:` lines at the top of `protocol/BOARD.md`; if another agent claims files you need, stop and ask. Otherwise add a line `In flight: <agent> — <scope> — <date>` under the first heading of `protocol/BOARD.md`, and remove it when you finish.
- If a goal or loop is blocked on something outside the repo, stop and report instead of retrying.
- Confirm before hard-to-reverse or outward-facing actions (deleting files, force-pushing) unless the owner authorized that action in the current conversation.
- Finish what was asked. Improve code you are working in when it is in the way, but don't fan out into unrelated refactors; when depth is ambiguous, name the trade-off and pick a default. Match the surrounding code's idiom, naming and comment density.
- End each task that changed files with one line about the app repository: `Committed <sha> | no · Pushed yes | no · Live <url> | not yet · Checks: <what ran and the result>`.

## Approvals

- Production data writes (SQL, service-role scripts, backfills) and Supabase migrations need the owner's approval in the current conversation, naming the statement and the rows. Approval text forwarded from another thread does not count.
- Paid provider runs (TTS, images, songs, translations, LLM batches) need an approved budget. Read a script before running it, because local scripts can call paid APIs.
- Never ask the owner to paste passwords or keys into chat.

## Checking your work

- From `orchestrator/frontend`: `npm run verify` runs typecheck, typecheck:api, check:i18n and lint in about two minutes; lint must stay at 0 errors. It is read-only and safe in read-only tasks. `npm run test:local` runs every offline contract suite (no Supabase, no paid calls) and must stay green; it lists known-stale suites it skips. Run `npm run build` when app code changes.
- For visual or interaction changes, inspect the rendered UI at the affected viewport and locale before reporting done. Signed-in screens: from `orchestrator/frontend`, `node scripts/today-guided-fixtures/run.mjs` (also `first-light-fixtures`, `speak-lens-fixtures`) renders real components with stubbed auth and no paid calls; screenshots and a verdict go to the harness's `out/`. Report "Visually verified: yes (how)" or "no (why)".
- If your sandbox cannot run tsx or Chrome, say so; typecheck alone does not verify runtime behaviour.
- Report a failed or skipped check as failed or skipped. A self-review is not an independent review.
- Independent review (a fresh agent that did not write the change) is required for auth, billing, data deletion, migrations, paid pipelines, provider/model changes and learner-facing content; it is optional for copy and CSS. Use the `independent-review` project skill for the brief and verdict format; re-review once after fixes, again only for a blocker.

## Rules the code must keep

- Every user-facing string goes through `t()` with keys for every locale in `Locale` (`frontend/src/lib/translations.ts`). en/de/fr keys live in `translations.ts` (loaded eagerly); the other locales are lazy packs in `src/lib/locales/*.ts` — keep that split. `check:i18n` enforces keys and placeholders, not language quality. Translate naturally; German uses ä/ö/ü.
- Functions in `frontend/api/` use named exports (`GET`, `POST`, …), never `export default`.
- Only the glassy skin ships (`PolishGlassLayout`); classic is retired behind `CLASSIC_SKIN_RETIRED`. Use theme CSS variables, never hardcoded colours: users pick one of five themes (default rainy-day), and `.theme-cosmos` (vermillion `#f24f13`, gold `#f7c843`, `#0e0810`) wraps landing, auth and home surfaces.
- The LingwaveWaves ocean never gets adaptive quality degradation; solve performance around it.
- The SRS day is the UTC calendar day (`utcDayKey` in `src/lib/dailyHabits.ts`).
- Guided lesson bodies load per language by dynamic import from `src/data/guided-runtime/`; never import them, or `guidedLessonsAuthoring.ts`, statically into app code.
- Worker-owned columns (`words.word_slug`, `words.suno_*`, job settings) are never client-writable.
- The iOS bundle id `ai.lingwave.app` is permanent; `npm run build:ios` runs only on the Mac.

## Working with the owner

- The owner is not a programmer. Start with two to four plain sentences, explain any term you cannot avoid, never ask the owner to run git, and finish with what they need to do, or "nothing".
- The code is the source of truth. If a prompt contradicts it, say so and follow the code.
- Reports go in `D:\CODING\ResonanceTEST\investigations\` and are never committed. An investigation task may write its one report file and nothing else.
- Windows: edit repo files with editor tools, not PowerShell read-modify-write (it corrupts UTF-8). Node scripts that reach Supabase need `NODE_OPTIONS=--use-system-ca`; never disable TLS verification.

## Project memory (Second Brain)

The project's living memory is `orchestrator/memory/` (written `memory/` below). Markdown is the source of truth; agents maintain it.

For implementation or a resume that needs project context, read `memory/INDEX.md` and `memory/STATE.md`. Open `DECISIONS.md` (why), `ARCHITECTURE.md` (how), `LOG.md` (recent history) or `notes/` only when relevant, and `raw/` only to find an original source. For big cross-cutting questions, send a subagent and take back its conclusions.

After meaningful work, before ending:

1. Prepend a dated `memory/LOG.md` entry: what changed, files, commits, open questions.
2. Refresh `memory/STATE.md`: current truth and next actions, under about 6 KB; deployment ids and check tallies belong in LOG.
3. Append decisions to `memory/DECISIONS.md` with the reason; mark superseded decisions, never erase them.
4. Update `memory/ARCHITECTURE.md` only if the structure changed.
5. Compile new `memory/raw/` captures into the right pages, linking the source.

Trivial work, explicitly read-only tasks and executor subtasks need no save unless ledger upkeep was assigned. Write plain sentences with normal spacing, put commit hashes in backticks, and date everything (YYYY-MM-DD). Mark doubtful content `⚠️ stale?` or `⚠️ superseded` instead of leaving it looking current. Never edit `memory/raw/`.
