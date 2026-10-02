# B1 expansion: English, Spanish and French

Prepared 2026-10-03. This is an authoring package, not a released course. The live app still has 100 A1 and 100 A2 lessons in each of twelve targets, plus 100 German B1 lessons. Eight targets are currently offered in the beta picker.

The first milestone is Practical 1: ten complete B1 episodes in each priority language. The accompanying plans allocate the full ten-path, 100-lesson progression per language. The remaining 270 beats are outlines, not authored lessons. B2 and C1/C2 are not part of this batch.

## What a learner practices

The existing seven-step B1 format is retained: hear the opening, match useful vocabulary, notice a grammar pattern, build the first reply, answer a new follow-up with two or three blanks, speak both replies, and review the episode. The later turn stays hidden until the learner needs to answer it. This reuses the approved Today design.

Practical 1 develops connected narration. English uses American English, moving from simple past into past continuous and present-perfect results. Spanish uses the existing Spain variety and contrasts completed events with background descriptions. French contrasts passé composé with imparfait. The French pilot uses gender-neutral constructions with avoir; it does not require the learner to adopt a voice actor's gender.

English explanations retain the existing German source convention. Spanish and French contain both German and English explanations. Publishing still requires complete editions for all twelve explanation locales.

The progression is an authored interpretation of the [CEFR Companion Volume](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions), the [Instituto Cervantes B1–B2 inventory](https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/niveles/02_gramatica_inventario_b1-b2.htm), and [France Éducation international's B1 descriptors](https://www.france-education-international.fr/document/cecrldescripteursb1). These support connected narration, explanations and interaction. Completing this short path is not evidence of achieving the whole CEFR B1 level.

## Files and validation

Review completed on 2026-10-03: Fable 5.1 at maximum effort personally read all thirty episodes and arbitrated the independent findings. Its 25 exact field corrections across nine lessons were applied and validated. The fresh independent reviewer returned **PASS**, with no unresolved findings, for the staged content and offline manifest. This includes fixing two Spanish blanks that previously admitted another grammatical person form. Full-tier plans beyond P1 remain proposals.

Verification: frontend `verify` passed with zero errors and two existing fixture warnings; 28/28 offline suites passed with five known-stale suites skipped; the production build passed; the final draft contract and 73 focused Python tests passed after arbitration. No rendered interface changed, so no new visual or device verification is claimed.

- `english.json`, `spanish.json`, `french.json`: complete, still-staged P1 lesson drafts.
- `*-plan.json`: proposed ten-path progression, 100 reserved trophies and lesson beats per language.
- `tts-snapshot.json`: validated audio input, tied to each source file by SHA-256.
- `tts-plan.json`: local inventory with proposed voices, exact playback coordinates, cache keys, recording counts and character forecasts. It cannot authorize or execute generation.
- `review-evidence.json`: source fingerprints, Fable's full read-through and arbitration, exact applied replacements, independent verdict and check results.
- `OPUS_POLISH_HANDOFF.md`: the prepared brief for later interaction polish; no Opus implementation has run in this milestone.

From `frontend`, run `npm run test:guided-b1-drafts`. The contract checks shape, explanation coverage, trophy collisions against the full shipped corpus, chapter allocation, sentence reconstruction, blank choices, speech tokens, and pattern highlights. It deliberately does not claim to prove natural language quality.

The frontend suite also verifies that the saved snapshot exactly matches the current source text and fingerprints. From `orchestrator`, run `.\.venv\Scripts\python.exe -m pytest tests/test_guided_b1_draft_plan.py -q` to rebuild and compare the complete saved manifest, and exercise rejection of missing scopes and audio surfaces. Regenerate both artifacts after content changes; never edit a count or hash to silence a failed check.

Regenerate the immutable inputs after any approved content edit:

```powershell
# From orchestrator/frontend (offline):
npx tsx scripts/prepare-guided-b1-drafts.ts content-drafts/b1-2026-10/tts-snapshot.json
# From orchestrator (offline):
.\.venv\Scripts\python.exe scripts/plan_guided_b1_drafts.py frontend/content-drafts/b1-2026-10/tts-snapshot.json --output frontend/content-drafts/b1-2026-10/tts-plan.json
```

The manifest includes core phrases, phrase chunks, vocabulary-item clips, trophy words, dialogue turns 1/3/4 and pattern examples. Vocabulary matching uses the existing chunk surface with `*-item-*` keys. That coverage must also be preserved in the production lesson exporter when these drafts are integrated.

## Audio and spending

Proposed P1 voices continue the existing rotation: Serafina for English, Lia for Spanish, Lilly for French. Multilingual v2 remains the reviewed integration. No v4 model swap is implied.

The reviewed text produces this offline forecast. Playback locations can share one cached recording.

| Target | Episodes | Playback locations | Unique clips | First-attempt characters |
|---|---:|---:|---:|---:|
| English | 10 | 177 | 157 | 3,708 |
| Spanish | 10 | 184 | 154 | 3,638 |
| French | 10 | 181 | 158 | 4,089 |
| Total | 30 | 542 | 469 | 11,435 |

The historical runner's conservative one-run retry ceiling is 41,868 characters. Neither number is an invoice or a verified credit cost. No ElevenLabs credits were spent preparing this package.

The owner supplied a ceiling of 200,000 ElevenLabs credits. This is a ceiling, not a target. The plan estimates one credit per character for Multilingual v2 before any unverified voice multiplier. [Some library voices have custom rates](https://elevenlabs.io/docs/help-center/product/voices/voice-library/what-are-custom-rates-and-credit-multipliers), so the voice rates must be checked before treating character counts as credits. The plan reports unique first-attempt text separately from the conservative single-run ceiling under the old runner's three-attempt retry policy; failed duplicate usages may be attempted again. These are forecasts, not a durable spending limit. A paid executor still needs reservations for every attempt and must stop after an ambiguous charge rather than blindly resubmit.

The [v4 Creative promotion](https://elevenlabs.io/pricing) is limited to the web and mobile apps. [API pricing](https://elevenlabs.io/pricing/api) is separate. The saved key is present and matches the owner's stated suffix. Account/model/voice GETs returned `missing_permissions` for `user_read`, `models_read` and `voices_read`; this is not evidence of an invalid key. The owner has been asked to enable those scopes on the same key. Synthesis has not been tested in this milestone. No key belongs in this package.

## Release sequence

1. Completed for this staged P1 scope: content arbitration, independent review and mechanical checks. Preserve the reviewed fingerprints; wording changes require renewed review and regenerated manifests.
2. Integrate language-specific B1 builders, register handling, grammar validators and deliberate count pins. Keep every shipped ID and recorded text unchanged.
3. Publish twelve complete explanation editions per changed target. The existing generator uses a separately budgeted translation provider; do not silently replace missing translations with English.
4. Prepare additive phrase-catalog and locale migrations with rollback tests. Never rewrite the already-applied September migrations. Obtain approval naming the new rows before applying production SQL.
5. Recheck the provider account and voices, approve the exact audio/profile/storage scope, then generate through a bounded executor and verify actual playback. The draft inventory is not an executable spending approval.
6. Regenerate the per-language runtime data and verify the B1 flow, accents, cloze input and both role-play turns at mobile and desktop sizes before activating paths. The owner’s physical-phone pass remains separate.

No runtime import, active path, database row, storage object or explanation edition is changed merely by committing this directory. Content is machine-authored; it is not presented as native-human-proofread.
