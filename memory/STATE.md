# Current State
Last updated: 2026-11-07

Current truth and next actions only. Deployment ids, check tallies and release evidence live in LOG.md and the notes; the full 2026-09-07 snapshot is [[archive/state-2026-09-07]].

## Live on lingwave.ai
- September releases are live: hardening, Home, Speak/Lens, Today/guided, twelve bases, café visuals, native input and critic fixes. Release commits are in LOG and the linked notes. Waves are unchanged.
- All twelve learning targets have 100 A1 and 100 A2 lessons in Today. Home, Library and Media follow the selected target. Home and Today link to optional Hangul, hiragana and Cyrillic practice. Every symbol, Japanese and Russian example word, and all 3,192 Hangul builder choices have recordings. The UI and guided explanations support twelve bases.
- Today remembers the selected path per learner and language. Matching requires two distinguishable pairs in the learner’s base. Drafts resume at the next exercise if matching is skipped. Guided lesson bodies load per language.
- Speak: `4c4804a9` replaced Groq’s discontinued Llama with openai/gpt-oss-120b. Real provider calls passed; signed-in owner verification remains.
- Lens has stable language decks, exact save receipts and bounded scans. Live voice reserves ten minutes and refunds once on definitive failure. Request deadlines apply; spending calls never auto-retry.
- Money: exact idempotent generation refunds; Stripe sandbox subscription flow passed. `STRIPE_BILLING_ENABLED` stays off until launch.
- Study recall attempts persist offline (IndexedDB) with stable receipts.
- All eighteen hardening/Today/base migrations applied; direct client INSERT removed and worker columns guarded. Cron’s missing analytics table fixed in `39c10136`; subsequent execution unobserved.
- Production quotas fail closed; auth email confirmation and secure password change on, CAPTCHA off. Reset requires PASSWORD_RECOVERY. Vercel secret values are unreadable via CLI, not necessarily empty.
- Tooling: AGENTS owns rules; frontend README maps checks. `verify` and `test:local` cover frontend/offline contracts. Full Python baseline had 16 known September failures.

## In progress
- Guided text: English, French, German, Korean, Portuguese and Spanish each have 100 written B1 lessons. French and Brazilian Portuguese P6–P10 each add fifty episodes with German and English meanings. German B1 is in Today. Korean has all 100 B2 lessons, German has 40 and the other ten targets have 20 each. Korean B2 P5–P10 practice tasks are in the offline reader. Across the twelve targets **470 B1 and 860 B2 lessons still need writing**. Italian B1 P4–P10 is the nearest unfinished tier. The 80 October B2 reviews for Japanese, Russian, Polish and Cebuano passed offline. See `frontend/content-drafts/text-2026-11/index.json` for path verdicts and `investigations/lingwave-guided-text-2026-11-06.html` for the dashboard and reader. TTS stays deferred.
- Worlds: sixteen reviewed offline en-GB/es-ES mini books remain unpublished. Under its separate new free-account allowance, the mini-books chat saved one Spanish Emilio pilot; the English Nathaniel attempt was blocked by ElevenLabs' free-tier connection limit and settled without audio. Listening is pending; no full book is recorded. Last reported remaining balance is 9,961. Evidence is `tmp/STORYBOOKS_20261006/status.json`; no automatic retry, and the old heartbeat remains paused. Any future full website/mixed recording route needs its own review and cumulative accounting.
- Audio: all released curriculum v4 batches finished, including twelve-target A1/A2 refresh scope, English Wistful/Sharp, existing German B1 and the reviewed new paths. Polish A1 P2 remains excluded for a lexical conflict; Cebuano retains 107 formatting aliases and Corazon's verified locale is null. Listening, runtime/catalog/twelve-base integration and named production approval remain. No curriculum dispatcher is active. Historical receipts/audio and the original capped ledger are preserved in ignored review-artifacts/guided-audio-20261003.
- agent-hygiene: September implementation and October navigation/docs pass done. Owner calls remain on BOARD; deferred work is in `investigations/project-audit-2026-09-25/IMPLEMENTATION_PLAN.md`.

## Known problems and limits
- Today's visual target (8+/10) is unmet at 7.8 after the three-round cap: Trophy wording and wrapping, reward grouping, small-phone overview spacing.
- Guided progress and drafts are device-local; kept phrases are account-backed.
- The machine-authored guided explanation editions and the nine lazy UI packs are not native-proofread.
- The internal TestFlight release is prepared. The Mac handoff is `frontend/ios/TESTFLIGHT.md`. The configured Apple team still needs to provision `ai.lingwave.app`, archive, upload and assign the build to the owner. Physical iPhone playback, keyboards and Reduce Motion await testing.
- Live token expiry is not a socket-cost ceiling; relay/revocation remains.
- Gemini TTS and xAI Live providers need migration and paid samples; Gemini key is needed. The OpenRouter key returned 401 in September and has not been rechecked. Translation spending needs its own budget.
- 27 historical ambiguous generation operations (147 credits charged) need reconciliation before any manual refund.
- Deleted-word storage queue has 255 entries: 97 deletable and 158 unsafe/protected. Preview sweep only; deletion needs explicit owner approval for the 97 and `STORAGE_CLEANUP_MODE=delete` or one-off commit.
- Platform follow-ups: CAPTCHA (needs client work), CSP still report-only, `SUNO_CALLBACK_BASE_URL` defaults to the dead resonanz.pro, full historical Supabase replay needs Docker.

## Next actions
- Continue other languages from their first missing ten-lesson path. French and Portuguese B1 each need P6–P10. Use the verified source hashes and check alternative correct answers. Korean intermediate text is available for personal testing in the local reader. Recording and mini books stay paused.
- Owner: rotate the credentials pasted into April–May Codex prompts; the iPhone pass and TestFlight steps on protocol/BOARD.md; the six hardening decisions; PostHog credentials to switch analytics on; the Supabase outstanding-invoice warning.
- Agents: after an owner OK, run the storage deletion; migrate the Gemini TTS and xAI Live models with a paid sample; the Today visual leftovers are the next product design scope (use `ui-critic-loop`).

## Read next
- protocol/BOARD.md for everything waiting on the owner.
- notes/today-critic-loop-2026-09-07.md, notes/base-languages-brand-2026-09-07.md, notes/today-guided-2026-09-07.md, notes/hardening-2026-09-07.md, notes/speak-lens.md for the releases.
- `D:/CODING/ResonanceTEST/investigations/HARDENING_DELIVERY_2026_09_07.md` for the plain-English hardening summary and owner actions.
