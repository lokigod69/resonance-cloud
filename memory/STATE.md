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
- Guided expansion: 480 complete new drafts: 340 B1 (EN/ES/PT P1–P5, FR P1–P4, IT P1–P3, ID/CEB/KO/JA/RU/PL P1–P2) and 140 B2 (DE/EN/ES/FR/IT/PT/ID P1/P2). Italian B2 passed final content/gate review; its isolated recording package is ready for exact execution review. Portuguese/Indonesian B2 are in content correction and native-gate review. Korean B2 authoring starts from its repaired V2 specification. Source flags remain draft/pending. German retains 100 existing live B1 lessons; specifications alone are not complete content.
- Worlds: a separate chat owns sixteen reviewed offline en-GB/es-ES storybooks (`cca96f01`) and its own up-to-50,000-credit API approval within the shared cap. Its pilot, audition and publication remain held; the final curriculum tail has not been released.
- Audio: reviewed v4 refreshes completed for twelve targets, English Wistful/Sharp and German B1 included. New EN/ES/PT B1 through P5, FR through P4, IT through P3, ID/KO/CEB/JA/RU/PL P1/P2 and DE/EN/ES/FR B2 P1/P2 finished. Italian B2 awaits exact dispatch review. Corazon’s verified locale remains null; Polish A1 P2 retains a lexical hold. Existing API ledger/cap is 200,000; the combined 400,000 target includes a separate web promotion. English uses Serafina. Ignored review-artifacts/guided-audio-20261003 holds receipts/audio. Listening, formatting aliases, runtime/catalog/twelve-base integration and named production approval remain.
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
- Urgent audio: API reset is 2026-10-06 12:27:32 Manila; web promotion separately showed 7 days 13 hours left at the October 6 local browser check. Review new lessons before TTS and continue the existing ledger. Never reset its cap, replay uncertain requests or alter sealed inputs. Scratch scripts record exact fingerprints and Fable jobs. Web cuts need alignment, waveform and listening checks.
- Owner: rotate the credentials pasted into April–May Codex prompts; the iPhone pass and TestFlight steps on protocol/BOARD.md; the six hardening decisions; PostHog credentials to switch analytics on; the Supabase outstanding-invoice warning.
- Agents: after an owner OK, run the storage deletion; migrate the Gemini TTS and xAI Live models with a paid sample; the Today visual leftovers are the next product design scope (use `ui-critic-loop`).

## Read next
- protocol/BOARD.md for everything waiting on the owner.
- notes/today-critic-loop-2026-09-07.md, notes/base-languages-brand-2026-09-07.md, notes/today-guided-2026-09-07.md, notes/hardening-2026-09-07.md, notes/speak-lens.md for the releases.
- `D:/CODING/ResonanceTEST/investigations/HARDENING_DELIVERY_2026_09_07.md` for the plain-English hardening summary and owner actions.
