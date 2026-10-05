# Current State
Last updated: 2026-10-05

Current truth and next actions only. Deployment ids, check tallies and release evidence live in LOG.md and the notes; the full 2026-09-07 snapshot is [[archive/state-2026-09-07]].

## Live on lingwave.ai
- September releases are live: hardening, Home, Speak/Lens, Today/guided, twelve bases, café visuals, native input and critic fixes. Release commits are in LOG and the linked notes. Waves are unchanged.
- The UI and guided explanations support 12 bases; the beta offers 8 targets (`BETA_TARGET_LANGUAGES`).
- Today: direct start and resume, honest wrong/reveal/no-microphone outcomes, scoped checkpoints and trophies, phrase Keep with its recording, native keyboard hints with IME/NFC handling. Guided bodies load per language by dynamic import.
- Speak (2026-09-26): Groq shut down the Llama model Speak used on 2026-08-16, so tutor replies and corrections failed until `4c4804a9` moved them to openai/gpt-oss-120b; verified with real provider calls, not yet on the live site by a signed-in user.
- Lens: stable per-language deck identity, exact save receipts, bounded scans. Live voice: one ten-minute reservation per session, refunded once on definitive failure. Server and client request deadlines everywhere; spending requests never auto-retry.
- Money: generation refunds are exact and idempotent; Stripe checkout survives lost responses and keeps event order; subscription billing proven end to end in sandbox (2026-07-31). `STRIPE_BILLING_ENABLED` stays off until launch.
- Study recall attempts persist offline (IndexedDB) with stable receipts.
- Database: all 18 hardening/Today/base migrations applied; direct client INSERT removed; worker columns guarded. Maintenance cron's missing analytics table was fixed in `39c10136`; subsequent scheduled execution was not observed.
- Config: production quotas fail closed. Auth email confirmation and Secure password change are ON; CAPTCHA is OFF. Reset requires PASSWORD_RECOVERY. Vercel secret values are unreadable through CLI, not necessarily empty.
- Tooling: AGENTS owns rules; frontend README maps checks. `verify` and `test:local` cover frontend/offline contracts. Full Python baseline had 16 known September failures.

## In progress
- Guided expansion: 260 complete B1 drafts staged: EN/ES P1–P5, FR P1–P4, IT/PT P1–P3, ID/CEB/KO P1–P2. Forty B2 drafts staged: German and English P1/P2. Another twenty Spanish B2 and twenty Portuguese B1 P4/P5 drafts are frozen in scratch and undergoing full review; French B2 and Japanese B1 authoring continue. English's 414 clips and Korean's 297 clips passed full spoken-content, execution/rate and committed-source checks; both are queued after French P3/P4. Specific publication findings remain bound in their plans. Native B2 architecture is separate from completed lessons. German has 100 live B1 lessons; all new drafts remain offline. Cebuano B1 and English B1 P2 L9 also retain nonspoken publication findings.
- Audio: the eleven-language v4 refresh is complete locally within its reviewed scope, including English Wistful/Sharp and German B1. English/Spanish B1 P2/P3 also finished; the next fifty B1 lessons are recording. One ambiguous Polish response was recovered from exact provider history without resynthesis. Corazon is added with confirmed Cebuano and explicitly null provider locale. One-phrase pilot queues after Italian; real receipt/fresh bound review gates the full 1,506-file Cebuano refresh. Polish A1 P2 retains its lexical hold. All runs share the existing 200,000-credit API ledger; combined 400,000 includes the separate web promotion. English uses Serafina. Ignored review-artifacts/guided-audio-20261003 holds receipts/audio. Listening, scopes/aliases, runtime/catalog/twelve-base integration and named production approval remain.
- agent-hygiene: September implementation and October navigation/docs pass done. Owner calls remain on BOARD; deferred work is in `investigations/project-audit-2026-09-25/IMPLEMENTATION_PLAN.md`.

## Known problems and limits
- Today's visual target (8+/10) is unmet at 7.8 after the three-round cap: Trophy wording and wrapping, reward grouping, small-phone overview spacing.
- Guided progress and drafts are device-local; kept phrases are account-backed.
- The machine-authored guided explanation editions and the nine lazy UI packs are not native-proofread.
- Nothing has been tested on a physical iPhone since the September releases; real OS keyboards, TestFlight and Reduce Motion are unverified.
- Live token expiry is not a socket-cost ceiling (needs a relay/revocation); the xAI voice model is deprecated and needs a paid sample before migrating.
- Gemini TTS `gemini-3.1-flash-tts-preview` is deprecated (replacement `gemini-3.8-flash-tts`); switching needs a Gemini key to test. The local OpenRouter key in `orchestrator/.env` returned 401 in the September audit; not rechecked in the B1 preparation. Translation spending needs a separate budget.
- 27 historical ambiguous generation operations (147 credits charged) need reconciliation before any manual refund.
- Storage objects of deleted words sit in `storage_cleanup_queue` (255 pending since 2026-05-02: 97 deletable, 136 from deleted accounts and 22 unsafe paths are kept). The daily sweep runs in preview mode; deleting needs the owner's OK, then `STORAGE_CLEANUP_MODE=delete` in Vercel or a one-off `--commit` CLI run.
- Platform follow-ups: CAPTCHA (needs client work), CSP still report-only, `SUNO_CALLBACK_BASE_URL` defaults to the dead resonanz.pro, full historical Supabase replay needs Docker.

## Next actions
- Urgent audio: authenticated subscription read gives the next reset as 2026-10-06 12:27:32 Manila; the web promotion separately showed 7 days 16 hours left on October 5. Keep the active single-dispatch new-lesson queue running; do not reset the ledger, replay ambiguous requests or overwrite sealed inputs. Root scratch scripts own the current sealed fingerprints and Fable jobs. Review every new lesson before TTS. Later web cuts still need alignment, waveform and listening checks.
- Owner: rotate the credentials pasted into April–May Codex prompts; the iPhone pass and TestFlight steps on protocol/BOARD.md; the six hardening decisions; PostHog credentials to switch analytics on; the Supabase outstanding-invoice warning.
- Agents: after an owner OK, run the storage deletion; migrate the Gemini TTS and xAI Live models with a paid sample; the Today visual leftovers are the next product design scope (use `ui-critic-loop`).

## Read next
- protocol/BOARD.md for everything waiting on the owner.
- notes/today-critic-loop-2026-09-07.md, notes/base-languages-brand-2026-09-07.md, notes/today-guided-2026-09-07.md, notes/hardening-2026-09-07.md, notes/speak-lens.md for the releases.
- `D:/CODING/ResonanceTEST/investigations/HARDENING_DELIVERY_2026_09_07.md` for the plain-English hardening summary and owner actions.
