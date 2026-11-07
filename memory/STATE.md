# Current State
Last updated: 2026-11-07

Current truth and next actions. Release evidence is in LOG.md; older snapshot: [[archive/state-2026-09-07]].

## Live on lingwave.ai
- September Home, Speak/Lens, Today/guided, hardening and visual releases are live; commits in LOG. Waves unchanged.
- Twelve targets each have 100 A1 and 100 A2 Today lessons; Home/Library/Media follow the target. Optional Hangul/hiragana/Cyrillic practice includes recorded symbols/examples and all 3,192 Hangul choices. UI/guided explanations support twelve bases.
- Today remembers paths per learner/language. Matching needs two distinguishable pairs in the base language; skipped matching resumes at the next exercise. Lesson bodies load per language.
- Speak: `4c4804a9` replaced Groq’s discontinued Llama with openai/gpt-oss-120b. Real provider calls passed; signed-in owner verification remains.
- Lens has language decks, exact save receipts and bounded scans. Live reserves ten minutes, refunds once on definitive failure and has request deadlines; spending calls never auto-retry.
- Money: exact idempotent generation refunds; Stripe sandbox subscription flow passed. `STRIPE_BILLING_ENABLED` stays off until launch.
- Study recall attempts persist offline (IndexedDB) with stable receipts.
- All eighteen hardening/Today/base migrations applied; direct client INSERT removed and worker columns guarded. Cron’s missing analytics table fixed in `39c10136`; subsequent execution unobserved.
- Quotas fail closed. Email confirmation/secure password change on, CAPTCHA off; reset requires PASSWORD_RECOVERY. Unreadable Vercel secrets are not necessarily empty.
- Tooling: AGENTS owns rules; frontend README maps checks. `verify` and `test:local` cover frontend/offline contracts. Full Python baseline had 16 known September failures.

## In progress
- Guided text: eight targets have 100 written B1 lessons; Indonesian/Japanese/Polish/Russian still need P3–P10. German B1 is in Today; other staged writing remains offline. B2 counts: Korean 100, German 40, other ten 20 each. **320 B1 and 860 B2 lessons remain unwritten**. The 80 October B2 revisions passed offline review. Verdicts: `frontend/content-drafts/text-2026-11/index.json`; reader: `investigations/lingwave-guided-text-2026-11-06.html`. Guided Path TTS is on hold.
- Worlds: sixteen reviewed en-GB/es-ES mini books remain unpublished. Separate free-account pilot saved Spanish Emilio; English Nathaniel was blocked by ElevenLabs' connection limit and settled without audio. Listening pending; no full book recorded. Last reported balance 9,961; `tmp/STORYBOOKS_20261006/status.json`. No auto-retry; heartbeat paused. Future recording needs separate review/accounting.
- Audio: released v4 batches finished (twelve-target A1/A2, English Wistful/Sharp, existing German B1, reviewed new paths). Polish A1 P2 excluded for lexical conflict; Cebuano has 107 formatting aliases and Corazon's verified locale is null. Listening, runtime/catalog/twelve-base integration and production approval remain. No dispatcher active; receipts/audio/capped ledger preserved in ignored `review-artifacts/guided-audio-20261003`.
- agent-hygiene: September implementation and October navigation/docs pass done. Owner calls remain on BOARD; deferred work is in `investigations/project-audit-2026-09-25/IMPLEMENTATION_PLAN.md`.

## Known problems and limits
- Today's visual target (8+/10) is unmet at 7.8 after the three-round cap: Trophy wording and wrapping, reward grouping, small-phone overview spacing.
- Guided progress and drafts are device-local; kept phrases are account-backed.
- The machine-authored guided explanation editions and the nine lazy UI packs are not native-proofread.
- Lingwave 1.0 (4), source `323ca7bf`, is Testing in Lingwave Owner (one tester). It includes safe-area/zoom and Text-save/audio fixes. Web and iPhone simulator checks passed; physical camera/audio remain unverified. Release guide: `frontend/ios/TESTFLIGHT.md`.
- Live token expiry is not a socket-cost ceiling; relay/revocation remains.
- Text/Standard failed with OpenRouter 401. The owner's new key passed read-only authentication and balance checks; its Vercel/Railway updates await owner entry in prepared forms, then redeployment. Google now shows the owner's €20 credit purchase; Lens recovery and production key ownership remain unverified. Google also supplies Gemini speech in Speak. A live-test budget is still needed.
- Text repair `323ca7bf` is live: saves no longer await the never-deployed audio endpoint; changed headwords clear obsolete recordings, translation edits retain them, and device pronunciation remains available. iPhone build 4 release status is in LOG.
- 27 historical ambiguous generation operations (147 credits charged) need reconciliation before any manual refund.
- Deleted-word storage queue has 255 entries: 97 deletable and 158 unsafe/protected. Preview sweep only; deletion needs explicit owner approval for the 97 and `STORAGE_CLEANUP_MODE=delete` or one-off commit.
- Platform follow-ups: CAPTCHA (needs client work), CSP still report-only, `SUNO_CALLBACK_BASE_URL` defaults to the dead resonanz.pro, full historical Supabase replay needs Docker.

## Next actions
- Finish the prepared OpenRouter updates and redeploy, then verify bounded live Text, Standard and Lens runs with an approved budget. Install internal build 1.0 (4) and complete the physical-device pass; offline checks do not prove provider recovery.
- Continue Indonesian/Japanese/Polish/Russian B1 P3–P10 with verified hashes and alternative-answer checks. Korean intermediate text is in the local reader. Recording/mini books stay paused. The old French/Portuguese P6–P10 action is superseded by their completed B1 writing.
- Owner: rotate the credentials pasted into April–May Codex prompts; the physical iPhone pass; the six hardening decisions; PostHog credentials to switch analytics on; the Supabase outstanding-invoice warning.
- Agents: after an owner OK, run the storage deletion; migrate the Gemini TTS and xAI Live models with a paid sample; the Today visual leftovers are the next product design scope (use `ui-critic-loop`).

## Read next
- protocol/BOARD.md for everything waiting on the owner.
- notes/today-critic-loop-2026-09-07.md, notes/base-languages-brand-2026-09-07.md, notes/today-guided-2026-09-07.md, notes/hardening-2026-09-07.md, notes/speak-lens.md for the releases.
- `D:/CODING/ResonanceTEST/investigations/HARDENING_DELIVERY_2026_09_07.md` for the plain-English hardening summary and owner actions.
