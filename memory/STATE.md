# Current State
Last updated: 2026-09-07

## Current release
- Hardening is LIVE: main commits c0192206 + d16e0bd2. Vercel dpl_AR6RjhD5WPw9KZHNF1N8YCCEiPhF Ready on lingwave.ai/www; Railway a856e9c6-19d9-4e78-a290-0833a208fcdf success. Production Home/Speak/Lens/Today/guided assets and 13 expected API responses verified.
- The first c0192206 production probe caught Speak ERR_REQUIRE_ESM. Restored previous working deployment, fixed API-local generated persona catalog in d16e0bd2, verified candidate, promoted and re-probed. Automatic domain assignment is back ON. Do not import src/ ESM directly from API CommonJS.
- Home9535d7f8 and prior Speak/Lens e079e32b refinements remain included. Approved Cosmos/First Light direction and all waves are unchanged. Preserve the unrelated WordTide diff/hash d4bcb0929af228c78d7c4f3f56aec8557cbbf095; never stage or revert it.

## What now works
- Lens has stable user/language deck identity independent of name, safe legacy adoption, exact per-row mixed-save receipts, language-scoped duplicate hints and bounded save/scan operations.
- Live retries/reconnects reuse one ten-minute reservation/charge and stored encrypted client credential. Definitive or abandoned no-secret failures refund once; existing authenticated daily maintenance covers abandoned reservations. Browser connection attestation cannot trigger refunds.
- Server whole-operation deadlines cover auth/body/quota/providers/response parsing, with bounded fresh-signal cleanup. Client deadlines cover auth/fetch/body and use iOS15-compatible cancellation helpers. Spending requests are not automatically retried.
- Speak personalities resolve canonical IDs; exact old tuples remain compatible. API-local generated catalog is checked at prebuild. Current providers: Live xAI grok-voice-think-fast-1.0; other voices Groq Whisper/Llama then Mistral Voxtral or Gemini TTS; Lens Gemini2.5Flash-Lite.
- Generation refunds use exact operation amount/source bucket/current plan period, atomic failure transition and worker operation fences. Admin/worker overlap is idempotent. Paid retries get new operations; expired plan credits stay expired.
- Stripe checkout/customer reservations survive lost responses. Subscription event ordering preserves newer status/periods while financial ledger entries still process once; canceled/expired allowance and its refund cannot alter unrelated credit balances.
- Study/game recall attempts persist in IndexedDB before delivery; stable receipts, account-switch handoff, bounded retries, clock correction and visible persistence failure. Legacy direct INSERT remains compatible.
- Guided facade is about 48 KB compressed versus 1.67 MB before; selected-language bodies load dynamically. All 2,500 lessons / 250 paths preserved, original authored source byte-identical.
- New card previews are 640x360 WebP; full PNG retained for study/detail/share. Active generation blocks deck deletion; imports/appends cap 500. Runner path confinement, bootstrap retries, engine failures, subprocess waits and worker death are hardened.
- Password reset requires PASSWORD_RECOVERY; local sign-out clears state even on network failure. Compatible dependency updates resolve all npm audit findings.

## Database/configuration verified
- Applied 13 migrations: Sept3 120000/121000/122000/123000/124000/125000; Sept7 100000/101000/102000/103000/104000/105000/106000. All exact date-prefixed versions are recorded in Supabase history. No blanket db push or certification of older manual migration drift.
- Removed direct INSERT grants/policies, installed ten indexes and privileged field/profile/admin guards. Lens/Live/credits/Stripe/recall/thumbnail rollback-only integration suites passed remotely. Exact500 import +500 append passed; no test-deck residue.106000 installs a missing pure language-normalization helper without historical backfill.
- Production Vercel CRON_SECRET and API_QUOTA_REQUIRE_ENFORCED=true added; APP_URL explicitly https://lingwave.ai. Current daily cron enabled 03:30 UTC; unauthenticated trigger 401. Actual scheduled execution not observed.
- Supabase email confirmation already ON; Secure password change enabled and saved/read back ON. CAPTCHA remains OFF pending client/provider integration. Sensitive existing Vercel values are withheld, not presumed empty.

## Evidence and limits
- Frontend/API tsc, build, i18n1696/1696 EN/DE/FR, complete guided suite and20 focused scripts pass. Final deadline13, persona78, Lens38+27, Speak31. Full lint zero errors/two unchanged stub warnings. npm audit zero vulnerabilities.
- Browser matrix20/20 with84 checks at320/390/1440 EN/DE/FR. Combined Python180 passed; fixed two tests that leaked a manifest stub across the suite. Physical iPhone, paid generation and live voice quality were not tested.
- Supabase outstanding-invoice warning requires owner billing action. Owner deferred physical iPhone/TestFlight checks until later.
- Live token expiry is not a trusted socket-cost ceiling; relay/revocation is still needed for that. Existing xAI model is deprecated; migration/live handshake/quality needs a real provider sample. No paid provider calls were run.
- 27 historical ambiguous operations represent 147 charged credits, NOT proof that 147 credits are owed. Reconcile before manual refund. No automatic deck-workspace deletion without a real admission/deletion lease.
- Remaining: Today/guided usability next; CAPTCHA/leaked-password protection, CSP observation/enforcement, Suno callback routing, retention/baseline cleanup, broader query/performance audit and prior Home product choices. This batch does not certify every old audit item.

## Read next
- protocol/workstreams/speak-lens/NEXT_STEP.md and hardening/NEXT_STEP.md.
- notes/hardening-2026-09-07.md for contracts; notes/speak-lens.md for providers.
- D:/CODING/ResonanceTEST/investigations/HARDENING_DELIVERY_2026_09_07.md for short English explanation and exact owner actions; hardening-2026-09-07/ for evidence.
