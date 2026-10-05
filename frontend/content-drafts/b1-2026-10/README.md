# B1 expansion: English, Spanish, French, Italian and Portuguese

October 5 continuation: 110 additional episodes have passed review for local recording: English and Spanish P2–P5, French P2 and Italian P2–P3. The staged total is 160. See [the later-path package](paths/README.md) for exact scope, evidence and publication holds. The original P1 milestone below remains its historical record.

Prepared 2026-10-03. This is an authoring package, not a released course. The live app still has 100 A1 and 100 A2 lessons in each of twelve targets, plus 100 German B1 lessons. Eight targets are currently offered in the beta picker.

The first milestone is Practical 1: ten complete B1 episodes in each of five languages. The accompanying plans allocate the full ten-path, 100-lesson progression per language. The remaining 450 beats are outlines, not authored lessons. B2 and C1/C2 are not part of this batch.

This milestone prepares the Practical/Bright content and audio. Existing A1/A2 refresh counts below also cover Bright only; they do not claim replacement recordings for Wistful or Sharp.

## What a learner practices

The existing seven-step B1 format is retained: hear the opening, match useful vocabulary, notice a grammar pattern, build the first reply, answer a new follow-up with two or three blanks, speak both replies, and review the episode. The later turn stays hidden until the learner needs to answer it. This reuses the approved Today design.

Practical 1 develops connected narration. English uses American English, moving from simple past into past continuous and present-perfect results. Spanish uses the existing Spain variety and contrasts completed events with background descriptions. French contrasts passé composé with imparfait. The French pilot uses gender-neutral constructions with avoir; it does not require the learner to adopt a voice actor's gender.

Italian uses formal Lei and gender-neutral learner narration with avere, followed by imperfetto background. Brazilian Portuguese uses você and contrasts completed events with background descriptions; it does not copy English present-perfect constructions. Fable's Italian/Portuguese specification governs their grammar progression and overrides the provisional planning notes.

English explanations retain the existing German source convention. The other four languages contain both German and English explanations. Publishing still requires complete editions for all twelve explanation locales.

The progression is an authored interpretation of the [CEFR Companion Volume](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions), the [Instituto Cervantes B1–B2 inventory](https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/niveles/02_gramatica_inventario_b1-b2.htm), and [France Éducation international's B1 descriptors](https://www.france-education-international.fr/document/cecrldescripteursb1). These support connected narration, explanations and interaction. Completing this short path is not evidence of achieving the whole CEFR B1 level.

## Files and validation

Review completed on 2026-10-03: Fable 5.1 at maximum effort personally read all thirty episodes and arbitrated the independent findings. Its 25 exact field corrections across nine lessons were applied and validated. The fresh independent reviewer returned **PASS**, with no unresolved findings, for the staged content and offline manifest. This includes fixing two Spanish blanks that previously admitted another grammatical person form. Full-tier plans beyond P1 remain proposals.

Italian/Portuguese review also completed on 2026-10-03: Fable read all twenty episodes and returned twenty exact field edits plus one subject-guard fix. The independent re-review returned **PASS** after checking every edit against the frozen originals. The Portuguese L7 second-valid-answer defect is fixed. Fable's accepted inactive-recall caveats are retained in `review-evidence-it-pt.json` and must be revisited if that step is enabled. Across both batches, fifty full episodes have been read and reviewed.

Verification: frontend `verify` passed with zero errors and two existing fixture warnings; 28/28 offline suites passed with five known-stale suites skipped; the production build passed. The final draft contract covers fifty lessons and thirteen rejection cases; 119 focused Python tests plus ten waveform subtests passed. No rendered interface changed, so no new visual or device verification is claimed.

- `english.json`, `spanish.json`, `french.json`, `italian.json`, `portuguese.json`: complete, still-staged P1 lesson drafts.
- `*-plan.json`: proposed ten-path progression, 100 reserved trophies and lesson beats per language.
- `tts-snapshot.json`: validated audio input, tied to each source file by SHA-256.
- `tts-plan.json`: local inventory with proposed voices, exact playback coordinates, cache keys, recording counts and character forecasts. It cannot authorize or execute generation.
- `tts-plan-v4.json`: the equivalent v4 inventory with separate cache identities and supported v4 settings.
- `review-evidence.json`: source fingerprints, Fable's full read-through and arbitration, exact applied replacements, independent verdict and check results.
- `authoring-spec-it-pt.json`: Fable's grammar and register specification for Italian/Portuguese. These targets use separate `tts-snapshot-it-pt.json`, `tts-plan-it-pt.json`, `tts-plan-it-pt-v4.json` and `review-evidence-it-pt.json`; the original three-language fingerprints remain unchanged.
- `OPUS_POLISH_HANDOFF.md`: the prepared brief for later interaction polish; no Opus implementation has run in this milestone.

From `frontend`, run `npm run test:guided-b1-drafts`. The contract checks shape, explanation coverage, trophy collisions against the full shipped corpus, chapter allocation, sentence reconstruction, blank choices, speech tokens, and pattern highlights. It deliberately does not claim to prove natural language quality.

The extended contract covers 50 lessons and 500 reserved trophies. Subject cues in Italian/Portuguese form blanks must match whole words in visible preceding text; a substring such as `eu` inside `recebeu` or the hidden answer to an earlier blank cannot supply the subject. Regression cases cover both failures and unplanned gender-marked learner production. Portuguese noun-trophy recall fallbacks are story-memory choices, as explicitly arbitrated by Fable; grammatical form blanks still require one valid choice.

The frontend suite also verifies that the saved snapshot exactly matches the current source text and fingerprints. From `orchestrator`, run `.\.venv\Scripts\python.exe -m pytest tests/test_guided_b1_draft_plan.py -q` to rebuild and compare the complete saved manifest, and exercise rejection of missing scopes and audio surfaces. Regenerate both artifacts after content changes; never edit a count or hash to silence a failed check.

Regenerate the immutable inputs after any approved content edit:

```powershell
# From orchestrator/frontend (offline):
npx tsx scripts/prepare-guided-b1-drafts.ts content-drafts/b1-2026-10/tts-snapshot.json
# From orchestrator (offline):
.\.venv\Scripts\python.exe scripts/plan_guided_b1_drafts.py frontend/content-drafts/b1-2026-10/tts-snapshot.json --output frontend/content-drafts/b1-2026-10/tts-plan.json
.\.venv\Scripts\python.exe scripts/plan_guided_b1_drafts.py frontend/content-drafts/b1-2026-10/tts-snapshot.json --model eleven_v4 --output frontend/content-drafts/b1-2026-10/tts-plan-v4.json
```

For Italian/Portuguese use `--batch italian-portuguese` with the snapshot exporter and paid CLI, and the corresponding `-it-pt` filenames with the offline planner. The manifest includes core phrases, phrase chunks, vocabulary-item clips, trophy words, dialogue turns 1/3/4 and pattern examples. Vocabulary matching uses the existing chunk surface with `*-item-*` keys. That coverage must also be preserved in the production lesson exporter when these drafts are integrated.

## Audio and spending

P1 uses Serafina for English and Lilly for French. Spanish deliberately uses Emilio, a verified peninsular Spanish voice: the old provider ID labelled Lia now resolves to Marcela, a Colombian voice. This new B1 assignment does not alter existing recordings. The owner has also requested a v4 refresh; the offline planner accepts `--model eleven_v4`, with separate cache identities and only the supported stability and similarity settings. Live integration still uses its existing model until replacement audio has been checked and publication approved.

Italian uses Sami, the native Italian voice currently behind the saved roster label Samanta; Brazilian Portuguese uses Carla. Authenticated voice reads and individual pilot receipts verify access before the full batch. Sharing rates are retained as evidence, not treated as a documented credit formula; the executor checks conservative upper bounds against actual receipts.

The reviewed text produces this offline forecast. Playback locations can share one cached recording.

| Target | Episodes | Playback locations | Unique clips | First-attempt characters |
|---|---:|---:|---:|---:|
| English | 10 | 177 | 157 | 3,708 |
| Spanish | 10 | 184 | 154 | 3,638 |
| French | 10 | 181 | 158 | 4,089 |
| Italian | 10 | 190 | 163 | 4,357 |
| Portuguese | 10 | 177 | 155 | 3,660 |
| Total | 50 | 909 | 787 | 19,452 |

The owner clarified a combined 400,000-credit target: a maximum 200,000 through the API plus the separate 200,000 web promotion. Generate useful reviewed content; do not pad text or repeat recordings merely to consume the allowance. Permissions are now enabled. No key belongs in this package.

The local API milestone is complete: **4,462 individual v4 MP3 files, 71,071 submitted characters and 7,142 actual credits**, including pilot requests. This is well below the combined 400,000-credit target; the allowance has not been exhausted. All files passed ffmpeg decoding and the final hash audit, with zero missing files, unplanned keys or unresolved requests. This is technical validation, not a claim of listening review or publication.

| Completed local scope | Unique files | Actual API credits |
|---|---:|---:|
| English/Spanish/French B1 P1 | 469 | 1,165 |
| Italian/Portuguese B1 P1 | 318 | 814 |
| English A1/A2 Bright — Serafina | 1,252 | 1,788 |
| Spanish A1/A2 Bright — Emilio | 1,175 | 1,476 |
| French A1/A2 Bright — Lilly | 1,248 | 1,899 |
| Total | 4,462 | 7,142 |

Provider receipts settle the charge; character forecasts and the legacy subscription counter are not invoices. The discounted actual charges are below the conservative standard-price reservation, and no exact discount formula is assumed. `review-artifacts/guided-audio-20261003/campaign-summary.json` records the final per-batch totals and explicit listening/publication holds. Refreshes for other targets and Wistful/Sharp remain future work.

`scripts/run_guided_audio_campaign.py` verifies the reviewed sources, reconstructs the complete saved plan and checks its rate-bound input fingerprint before opening a provider. Dry-run is the default. The local executor in `src/services/guided_tts/campaign.py` reserves each request against one durable SQLite ledger, makes one attempt, retains received audio and charge evidence, decodes it, then writes the file atomically. Ambiguous requests stop for reconciliation; they are never automatically retried. Every later manifest shares the same 200,000-credit cap and process lock. Never create a fresh ledger to reset that allowance.

The fixed local output is `review-artifacts/guided-audio-20261003/api/`: `campaign.sqlite3` plus cache-key MP3 files. It is intentionally ignored by Git. Rate evidence and run results sit in its parent directory. The v4 plan remains an offline input; paid execution requires the owner's authorization and verified rate evidence as separate gates.

One Spanish receipt save failed while a progress audit held a database read. The run stopped; an exact, unique provider-history match recovered the existing audio and its two-credit charge without regeneration. Independent review approved the local reconciliation and the fix: SQLite WAL with FULL synchronization, a bounded busy timeout and an open-reader regression test. Progress audits now release the database before hashing files. Preserve that reconciliation evidence when resuming this campaign.

For existing English, Spanish and French A1/A2, `scripts/guided_refresh_api_adapter.py` imports current source modules and compares every spoken coordinate to the saved reference inventory before building a plan. `scripts/run_guided_refresh_campaign.py --plan <plan.json> --inventory <inventory.json> --rates <rates.json>` performs a fresh dry-run. Paid execution additionally requires `--commit --expected-input-sha256 <inspected fingerprint>` and `ELEVENLABS_API_KEY` loaded privately into the environment. The CLI, adapter, exporter, cache helpers and executor must match their committed versions. The refresh uses the same ledger and lock; it includes vocabulary items and preserves capitalization and edge-punctuation aliases with separate texts and cache keys for explicit publication resolution. Lexical, apostrophe and hyphen differences fail validation.

The [v4 Creative promotion](https://elevenlabs.io/pricing) is for the web/mobile products; [API pricing](https://elevenlabs.io/pricing/api) is separate. Two retained web recordings contain 7,253 submitted characters and show zero regular-credit charge in their history receipts. The browser displayed about 192.7K promotional credits remaining. They are a four-turn B1 pilot and 200 existing English A1/A2 core phrases with Serafina. The full recordings and raw alignment receipts remain under `review-artifacts/guided-audio-20261003/web-v4/`.

`scripts/analyze_guided_v4_cuts.py` matches exact source text and provider start alignment to decoded waveform gaps. It records source/audio hashes, preserves pauses, rejects ambiguous boundaries and reports timing anomalies without silently clamping speech. The 200-phrase compilation has 155 quiet-boundary candidates and 45 phrases requiring boundary review; **all 200 still require listening**. This analyzer produces candidate metadata only, not approved cuts. The provider's inconsistent end-time field is deliberately unused. Quiet gaps cannot prove correct alignment or pronunciation. The owner accepted this approach for later use of the promotion; individual API files remain the current production preparation workflow.

## Release sequence

1. Completed for this staged P1 scope: content arbitration, independent review and mechanical checks. Preserve the reviewed fingerprints; wording changes require renewed review and regenerated manifests.
2. Integrate language-specific B1 builders, register handling, grammar validators and deliberate count pins. Keep every shipped ID and recorded text unchanged.
3. Publish twelve complete explanation editions per changed target. The existing generator uses a separately budgeted translation provider; do not silently replace missing translations with English.
4. Prepare additive phrase-catalog and locale migrations with rollback tests. Never rewrite the already-applied September migrations. Obtain approval naming the new rows before applying production SQL.
5. Check pronunciation and playback of completed local v4 recordings, prepare the exact profile/asset/usage/storage scope, then obtain approval for production publication. Local generation approval does not authorize database or storage writes.
6. Regenerate the per-language runtime data and verify the B1 flow, accents, cloze input and both role-play turns at mobile and desktop sizes before activating paths. The owner’s physical-phone pass remains separate.

No runtime import, active path, database row, storage object or explanation edition is changed merely by committing this directory. Content is machine-authored; it is not presented as native-human-proofread.
