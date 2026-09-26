# Current State
Last updated: 2026-09-26

Current truth and next actions only. Deployment ids, check tallies and release evidence live in LOG.md and the notes; the full 2026-09-07 snapshot is [[archive/state-2026-09-07]].

## Live on lingwave.ai
- Everything through the 2026-09-07 releases is live: hardening (`c0192206` + `d16e0bd2`), Home and Speak/Lens (`9535d7f8`, `e079e32b`), Today/guided (`58ac56bf`), twelve base languages (`36355fe3`), the café visual and native-input round (`7a1aa2d3` + `2fe938b8`) and the Today critic fixes (`180f7102`). Waves are unchanged.
- The UI speaks 12 locales (en/de/fr eager, nine lazy packs); guided lessons carry 12 explanation editions; the beta offers 8 target languages (`BETA_TARGET_LANGUAGES`).
- Today: direct start and resume, honest wrong/reveal/no-microphone outcomes, scoped checkpoints and trophies, phrase Keep with its recording, native keyboard hints with IME/NFC handling. Guided bodies load per language by dynamic import.
- Speak (2026-09-26): Groq shut down the Llama model Speak used on 2026-08-16, so tutor replies and corrections failed until `4c4804a9` moved them to openai/gpt-oss-120b; verified with real provider calls, not yet on the live site by a signed-in user.
- Lens: stable per-language deck identity, exact save receipts, bounded scans. Live voice: one ten-minute reservation per session, refunded once on definitive failure. Server and client request deadlines everywhere; spending requests never auto-retry.
- Money: generation refunds are exact and idempotent; Stripe checkout survives lost responses and keeps event order; subscription billing proven end to end in sandbox (2026-07-31). `STRIPE_BILLING_ENABLED` stays off until launch.
- Study recall attempts persist offline (IndexedDB) with stable receipts.
- Database: all 18 hardening/Today/base migrations applied and recorded; direct client INSERT removed; worker-owned columns guarded. Daily maintenance cron runs at 03:30 UTC behind `CRON_SECRET`; until 2026-09-26 it failed daily at the missing analytics queue table, fixed in `39c10136` (next scheduled run not yet observed).
- Config: quota and subscription checks fail closed in production (`API_QUOTA_REQUIRE_ENFORCED=true`). Supabase Auth has email confirmation and Secure password change ON, CAPTCHA OFF (needs client work). Password reset requires the PASSWORD_RECOVERY event; local sign-out clears state even when the network call fails. Sensitive Vercel env values are unreadable through the CLI — never presume they are empty.
- Agent tooling (2026-09-26): one shared rules file `orchestrator/AGENTS.md` with a review policy; project skills include `independent-review` and `ui-critic-loop`; `npm run verify`, `npm run test:local` (27 offline suites, 5 known-stale listed), `check:skills`, `check:i18n-language`, `env:check`; ESLint blocks `export default` in `api/`; `.gitattributes` enforces LF. Python tests run with `orchestrator/.venv/Scripts/python.exe -m pytest tests --ignore=tests/manual` (16 known failures, identical on HEAD).

## In progress
- agent-hygiene (2026-09-25 audit fixes): implementation done 2026-09-26; waiting on owner calls (storage deletion OK, Speak live try, credential rotation). Deferred items with reasons are in `investigations/project-audit-2026-09-25/IMPLEMENTATION_PLAN.md`.

## Known problems and limits
- Today's visual target (8+/10) is unmet at 7.8 after the three-round cap: Trophy wording and wrapping, reward grouping, small-phone overview spacing.
- Guided progress and drafts are device-local; kept phrases are account-backed.
- The machine-authored guided explanation editions and the nine lazy UI packs are not native-proofread.
- Nothing has been tested on a physical iPhone since the September releases; real OS keyboards, TestFlight and Reduce Motion are unverified.
- Live token expiry is not a socket-cost ceiling (needs a relay/revocation); the xAI voice model is deprecated and needs a paid sample before migrating.
- Gemini TTS `gemini-3.1-flash-tts-preview` is deprecated (replacement `gemini-3.8-flash-tts`); switching needs a Gemini key to test. The local OpenRouter key in `orchestrator/.env` is dead (401).
- 27 historical ambiguous generation operations (147 credits charged) need reconciliation before any manual refund.
- Storage objects of deleted words sit in `storage_cleanup_queue` (255 pending since 2026-05-02: 97 deletable, 136 from deleted accounts and 22 unsafe paths are kept). The daily sweep runs in preview mode; deleting needs the owner's OK, then `STORAGE_CLEANUP_MODE=delete` in Vercel or a one-off `--commit` CLI run.
- Platform follow-ups: CAPTCHA (needs client work), CSP still report-only, `SUNO_CALLBACK_BASE_URL` defaults to the dead resonanz.pro, full historical Supabase replay needs Docker.

## Next actions
- Owner: rotate the credentials pasted into April–May Codex prompts; the iPhone pass and TestFlight steps on protocol/BOARD.md; the six hardening decisions; PostHog credentials to switch analytics on; the Supabase outstanding-invoice warning.
- Agents: after an owner OK, run the storage deletion; migrate the Gemini TTS and xAI Live models with a paid sample; the Today visual leftovers are the next product design scope (use `ui-critic-loop`).

## Read next
- protocol/BOARD.md for everything waiting on the owner.
- notes/today-critic-loop-2026-09-07.md, notes/base-languages-brand-2026-09-07.md, notes/today-guided-2026-09-07.md, notes/hardening-2026-09-07.md, notes/speak-lens.md for the releases.
- `D:/CODING/ResonanceTEST/investigations/HARDENING_DELIVERY_2026_09_07.md` for the plain-English hardening summary and owner actions.
