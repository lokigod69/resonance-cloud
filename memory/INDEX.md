# Lingwave Orchestrator — Memory Index
Last updated: 2026-09-07

> Lingwave (formerly Resonanz) is a cloud-first language-learning app: guided daily lessons, an SRS deck/card engine, AI music (level songs / song-only), a voice tutor, and a deprecated-for-users AI video pipeline. This repo (git root) holds both the live product — the `frontend/` React app on Vercel + Supabase — and the Python cloud generation backend (`job_runner.py`, `src/`, `cloud_engines/`) on Railway, plus legacy local-DAW paths. Phase: launch-readiness hardening for a TestFlight/private beta (July 2026).

## Map

| File | What it holds | Read when |
|---|---|---|
| [[STATE]] | Current truth: works / in progress / problems / next actions | Every session |
| [[DECISIONS]] | Why things are the way they are | Before changing direction |
| [[ARCHITECTURE]] | How the system is built | Before touching structure |
| [[LOG]] | Dated session journal, newest first | Catching up on recent work |
| raw/ | Untouched captures: pasted chats, research, prompts | Only when hunting a source |
| notes/ | Compiled topic pages | When INDEX points you there |
| archive/ | Rolled-off log entries and retired notes | Almost never |

## Topic notes
<!-- One line per page in notes/, added when created:
- [[notes/some-topic]] — one-line description -->
- [[notes/speak-lens]] — current providers, prompt rules, lifecycle contracts and remaining device/save/billing gates.
- [[notes/hardening-2026-09-07]] — Lens receipts, Live/credit/Stripe invariants, whole-request deadlines, offline recall, guided split, applied SQL and remaining operational gates.

## Rules for agents
Read [[STATE]] at session start; open the rest only when needed. After meaningful work: prepend [[LOG]], refresh [[STATE]], append decisions to [[DECISIONS]]. Update, don't duplicate. Date everything. Mark wrong things `⚠️ superseded` — never leave known-false statements looking current. Never edit raw/. Full protocol: SecondBrainOS/PROTOCOL.md.
