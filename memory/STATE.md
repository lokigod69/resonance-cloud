# Current State
Last updated: 2026-09-07

## Active work
- Home/Word Stream refinement **9535d7f8 is live**. Vercel production deployment dpl_C635sSbVz8dtjbJnrVwsBQtxTzh6 was Ready on lingwave.ai; Home/Generate chunks returned 200 and the focused picture review marker was present. Both original stream migrations are applied per the owner.
- Active coordination: protocol/workstreams/speak-lens/NEXT_STEP.md. Speak/Lens **e079e32b is live** on lingwave.ai; Vercel dpl_Adn8S4JTuWvTCXm4GXxp82m6yyd6 Ready, new Speak/Lens chunks verified and all 12 unauthenticated API probes returned expected 401/400/405. Owner deferred the real iPhone check. Today/guided paths is the next product pass. Existing approved design is preserved.
- All wave rendering is unchanged. WordTide retains wave-rider's original uncommitted diff/hash d4bcb0929af228c78d7c4f3f56aec8557cbbf095; never stage/revert it in this batch.

## Verified Home improvements
- Keep → picture door opens a focused Standard Card review with selected word/meaning/language, cost and explicit Generate. Rename/style/Premium are optional below it; Back preserves target language. No automatic paid request.
- Picture generation creates a separate word-named deck, stated in the review. It does not modify the stream text card. Validated navigation state preserves meaning for display; missing category metadata is not invented.
- Desktop words use more viewport width and sample the same wave at their displayed position. Phone lane math preserved. Small pools do not duplicate initial words; keyboard focus pauses drift; reduced-motion hidden collisions are inert and excluded from Next.
- Live stream/recall can replace a slow mission skeleton after 800ms. Preparing promotes to stream; exhausted stream CTA releases. The strip stops offering a competing Speak action.
- Both Home sheets inherit Cosmos colors with shared focus containment/restoration, inert background, accessible names, 44px close targets and reduced-motion behavior.
- Removed an accidental category preload via staticLibraryLanguage: 729,935 raw / 196,285 gzip bytes deferred. Skipped the unused populated-home streak query of up to 5,000 rows. Large guided corpus split remains deferred.
- en/de/fr coverage: 1,677 keys each; focused picture, Standard styles and Home error states localized; stream DE/FR wording consistent.

## Verification and limits
- Typecheck/build, changed-file lint, First Light 32, Word Stream 17, picture 18 assertions, static audio and iOS shell contracts pass.
- Browser fixtures: 28 executed/28 passed, midnight and cross-tab cases explicitly not-run. Final 7-screen refresh passes (320/390/1440px, EN/DE/FR, low credits, double click, style payload, focus/reduced motion).
- Full lint zero errors; two unchanged unused-disable stub warnings remain. Broader lane suite 150/153 has three existing Premium infographic source-string failures; asserted files unchanged from HEAD.
- Fixtures stub backend responses. No paid generation or physical iPhone test performed. Home production release and unauthenticated API smoke checks passed; production setup was not fully audited.

## Speak and Lens refinements
- Providers verified: Live xAI grok-voice-think-fast-1.0; async Groq Whisper/Llama → Mistral Voxtral or Gemini TTS; Lens Gemini 2.5 Flash-Lite. Exact models and durable rules: notes/speak-lens.md.
- Shorter prompts preserve all four language levels, align greetings/scenarios, remove redundant personas, fixed German/English glosses and a phantom search-tool instruction. Grok reconnect gets bounded recent context.
- Provider/body deadlines, bounded telemetry with consent protection, recent-40 corrections, latest-four replay audio, single authoritative Grok transcript, and stale token/socket guards.
- Real keyboard replay/reveal, accessible themed history/extraction/recap dialogs, reduced-motion behavior, and only supported Mistral character choices.
- Lens camera and requests cancel safely, wait for hydrated language settings, recover after Cancel, and reject previous-language results. Alternate selection clears incorrect lexical data. Errors and language labels are localized in en/de/fr.
- Frontend/API typechecks, build, 1,690-key translation coverage, provider/prompt/transcript/deadline tests, paid API protection and Grok/iOS contracts pass. Final production-theme browser matrix: 18/18 scenarios, 75 checks, zero page errors; Speak contract 31. Lint zero errors/two unchanged First Light stub warnings. Production assets and API handler smoke probes pass; live inference remains untested.

## Next actions and remaining choices
- Owner: deployed iPhone check later (cold pronunciation/replay, Keep, picture, nested song modal, nav clearance, Reduce Motion). Home commit/push call is complete.
- Existing Home choices: stream door for accounts with no deck; stream vs Library backlog ordering; ru/ja paid voices; pearls; level/category filters.
- Hardening code shipped previously (92a24f40, 9453ff7d). Its older handoff still lists six SQL migrations, CRON_SECRET, quota enforcement and Auth settings. **Remote state unverified**: do not infer completion or breakage from local source. Consult hardening NEXT_STEP.
- Analytics/legal/credential gates belong to analytics NEXT_STEP. TestFlight signing/distribution/device status belongs to home-orchestrator/main handoffs; the owner reports TestFlight nearly ready. Neither was re-audited here.
- Speak/Lens follow-ups: physical iPhone and live-provider quality/latency samples; stable Lens deck identity and row-specific mixed-save receipts need reviewed RPC/migration work; Live token minting still consumes a block before a later socket failure; Supabase gates/refunds lack one hard whole-request deadline. No billing policy/migration was changed.
- Next product pass: Today/guided paths. Guided index/body split is a larger performance follow-up.

## References
- Review and evidence: D:/CODING/ResonanceTEST/investigations/HOME_REFINEMENT_2026_09_06.md.
- Speak/Lens report: D:/CODING/ResonanceTEST/investigations/SPEAK_LENS_REFINEMENT_2026_09_07.md.
- Coordination: D:/CODING/ResonanceTEST/protocol/workstreams/speak-lens/NEXT_STEP.md; Home phone check remains in word-stream/NEXT_STEP.md.
- Durable history: LOG.md and DECISIONS.md. Previous contradictory STATE preserved at archive/state-before-home-refinement-2026-09-06.md; it is historical, not current authority.
