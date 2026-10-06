# Current State
Last updated: 2026-10-06

Current truth and next actions only. Deployment ids, check tallies and release evidence live in LOG.md and the notes; the full 2026-09-07 snapshot is [[archive/state-2026-09-07]].

## Live on lingwave.ai
- September releases are live: hardening, Home, Speak/Lens, Today/guided, twelve bases, café visuals, native input and critic fixes. Release commits are in LOG and the linked notes. Waves are unchanged.
- The UI and guided explanations support 12 bases; the beta offers 8 targets (`BETA_TARGET_LANGUAGES`).
- Today: direct start and resume, honest wrong/reveal/no-microphone outcomes, scoped checkpoints and trophies, phrase Keep with its recording, native keyboard hints with IME/NFC handling. Guided bodies load per language by dynamic import.
- Speak: `4c4804a9` replaced Groq’s discontinued Llama with openai/gpt-oss-120b. Real provider calls passed; signed-in owner verification remains.
- Lens has stable language decks, exact save receipts and bounded scans. Live voice reserves ten minutes and refunds once on definitive failure. Request deadlines apply; spending calls never auto-retry.
- Money: exact idempotent generation refunds; Stripe sandbox subscription flow passed. `STRIPE_BILLING_ENABLED` stays off until launch.
- Study recall attempts persist offline (IndexedDB) with stable receipts.
- All eighteen hardening/Today/base migrations applied; direct client INSERT removed and worker columns guarded. Cron’s missing analytics table fixed in `39c10136`; subsequent execution unobserved.
- Production quotas fail closed; auth email confirmation and secure password change on, CAPTCHA off. Reset requires PASSWORD_RECOVERY. Vercel secret values are unreadable via CLI, not necessarily empty.
- Tooling: AGENTS owns rules; frontend README maps checks. `verify` and `test:local` cover frontend/offline contracts. Full Python baseline had 16 known September failures.

## In progress
- Guided expansion is stopped at the owner's request on October 6. There are 580 complete new drafts: 340 B1 and 240 B2, with twenty B2 lessons in every target. Five hundred new lessons have local v4 audio (340 B1 + 160 B2); Japanese, Russian, Polish and Cebuano B2 are the eighty unfinished recording candidates. Five hundred drafts are committed; forty Japanese/Russian B2 drafts and unreviewed prototypes remain local, and forty Polish/Cebuano B2 drafts are hash-frozen in scratch. No new source is activated. The HTML assessment is `D:/CODING/ResonanceTEST/investigations/lingwave-curriculum-assessment-2026-10-06.html`. Full stop evidence is in LOG.
- Worlds: sixteen reviewed offline en-GB/es-ES mini books remain unpublished. Under its separate new free-account allowance, the mini-books chat saved one Spanish Emilio pilot; the English Nathaniel attempt was blocked by ElevenLabs' free-tier connection limit and settled without audio. Listening is pending; no full book is recorded. Last reported remaining balance is 9,961. Evidence is `tmp/STORYBOOKS_20261006/status.json`; no automatic retry, and the old heartbeat remains paused. Any future full website/mixed recording route needs its own review and cumulative accounting.
- Audio: all released curriculum v4 batches finished, including twelve-target A1/A2 refresh scope, English Wistful/Sharp, existing German B1 and the reviewed new paths. Polish A1 P2 remains excluded for a lexical conflict; Cebuano retains 107 formatting aliases and Corazon's verified locale is null. Listening, runtime/catalog/twelve-base integration and named production approval remain. No curriculum dispatcher is active. Historical receipts/audio and the original capped ledger are preserved in ignored review-artifacts/guided-audio-20261003.
- agent-hygiene: September implementation and October navigation/docs pass done. Owner calls remain on BOARD; deferred work is in `investigations/project-audit-2026-09-25/IMPLEMENTATION_PLAN.md`.

## Known problems and limits
- Today's visual target (8+/10) is unmet at 7.8 after the three-round cap: Trophy wording and wrapping, reward grouping, small-phone overview spacing.
- Guided progress and drafts are device-local; kept phrases are account-backed.
- The machine-authored guided explanation editions and the nine lazy UI packs are not native-proofread.
- Nothing has been tested on a physical iPhone since the September releases; real OS keyboards, TestFlight and Reduce Motion are unverified.
- Live token expiry is not a socket-cost ceiling; relay/revocation remains.
- Gemini TTS and xAI Live providers need migration and paid samples; Gemini key is needed. The OpenRouter key returned 401 in September and has not been rechecked. Translation spending needs its own budget.
- 27 historical ambiguous generation operations (147 credits charged) need reconciliation before any manual refund.
- Deleted-word storage queue has 255 entries: 97 deletable and 158 unsafe/protected. Preview sweep only; deletion needs explicit owner approval for the 97 and `STORAGE_CLEANUP_MODE=delete` or one-off commit.
- Platform follow-ups: CAPTCHA (needs client work), CSP still report-only, `SUNO_CALLBACK_BASE_URL` defaults to the dead resonanz.pro, full historical Supabase replay needs Docker.

## Next actions
- Curriculum is paused by explicit owner request: no authoring, review, TTS, credit consumption or automatic resume. The previous API window expired; the Free plan initially showed 10,000 credits and no web promotional offer after refresh; the subsequent mini-books checkpoint reports 9,961 remaining. Those credits are reserved for mini books. Preserve current uncommitted candidates and incomplete Fable streams; do not treat them as approvals. On a future explicit curriculum resume, start with the HTML assessment and exact saved evidence; never reset the existing campaign or replay uncertain requests.
- Owner: rotate the credentials pasted into April–May Codex prompts; the iPhone pass and TestFlight steps on protocol/BOARD.md; the six hardening decisions; PostHog credentials to switch analytics on; the Supabase outstanding-invoice warning.
- Agents: after an owner OK, run the storage deletion; migrate the Gemini TTS and xAI Live models with a paid sample; the Today visual leftovers are the next product design scope (use `ui-critic-loop`).

## Read next
- protocol/BOARD.md for everything waiting on the owner.
- notes/today-critic-loop-2026-09-07.md, notes/base-languages-brand-2026-09-07.md, notes/today-guided-2026-09-07.md, notes/hardening-2026-09-07.md, notes/speak-lens.md for the releases.
- `D:/CODING/ResonanceTEST/investigations/HARDENING_DELIVERY_2026_09_07.md` for the plain-English hardening summary and owner actions.
