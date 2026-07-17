---
name: author-guided-tier
description: Author a full guided-lesson tier (100 lessons, 10 paths) for a language via the proven Codex⇄Fable pipeline — spec from A1 evidence, Codex drafts at xhigh, validator gate, Fable read-through, adversarial review, arbiter fixes, TTS batch, scoped commit. Use for any new A2 language, a future B1 tier, or a new language's A1 P2–P10. Encodes every tripwire learned on es/fr/it/pt/de/en A2 and ko A1. For registry wiring of a brand-new language use add-target-language first.
---

# Author a guided tier (the Codex⇄Fable content pipeline)

Proven on Spanish/French/Italian/Portuguese/German/English A2 and Korean A1 (700+
lessons, 2026-07-13/14). Design doc: `orchestrator/docs/Product/FABLE_A2_LEARNING_PATH_DESIGN.md`
(§5 authoring contract, §6 rollout). Roles are fixed: **Codex drafts and reviews,
Fable specs, arbiters, fixes, and verifies. Fable reads every lesson personally**
(owner rule: Codex never implements trust-critical fixes directly — Fable applies
them via surgical prompts it fully controls, or by hand).

Working artifacts (specs, batch prompts, review prompts, findings) live in
`D:\CODING\ResonanceTEST\tmp\` named `A2_{LANG}_...` — study the German/English set
(`A2_GERMAN_P1_P10_SPEC.md`, `A2_DE_BATCH1_PROMPT.md`,
`A2_DE_ADVERSARIAL_REVIEW_PROMPT.md`, `A2_DE_REVIEW_FIX_PROMPT.md`) as the canonical
shapes before writing new ones.

## Preconditions

- The language's A1 is complete (100 lessons) and device-checked — no A2 for an
  incomplete A1 (doc §6).
- Owner has picked this language/phase. TTS is a paid owner decision (per phase,
  after content sign-off — never before review).
- **TTS-frozen ids**: all shipped guided ids (es/fr/it/pt/de/en A2, all A1, ko A1)
  must NEVER be renamed. Text changes to frozen lessons need scoped audio reruns.

## Stage 0 — Evidence from A1 (before writing anything)

Import/read the language's A1 module (`src/data/guided/{lang}A1.ts` or the
guidedLessons sections) and extract:
- **Base locales**: which `GuidedBaseContentText` fields actually carry `.de`/`.en`.
  This varies! fr/it/pt carry both; German A1 is en-only (+ bilingual `situation`);
  English A1 is de-only; Korean A1 carries both (baseLanguage 'German'). The A2
  module must match its own A1, not the other languages.
- **Register evidence**: how A1 addresses service staff vs friends (German: Sie at
  counters / du social; pt-BR: você; fr: vous; it: Lei; ko: 요-form polite with
  죄송합니다/감사합니다 fixed formulas). Reviewers WILL get register direction wrong
  (the en reviewer wanted du toward waiters — service speech is formal); the spec
  must state the split so the arbiter can reject those findings.
- **Forbidden trophy list**: trophies are unique across the language's ENTIRE guided
  corpus. Generate by module import (all `vibeVariants.*.trophyWord.word`,
  lowercased), never by eyeballing. English A1's multi-vibe corpus (bright+wistful+
  sharp) yields ~271 forbidden words — expect brutal lists for multi-vibe languages.
- **Voice roster**: the A2 rotation continues the language's A1 roster
  (`seed_guided_bright_rotation.py` ROSTERS).

## Stage 1 — Module scaffold (Fable writes it)

Create `orchestrator/frontend/src/data/guided/{lang}A2.ts` copying the
`germanA2.ts` pattern exactly: header comment documenting the register/tense
contract; `{LANG}_A2_GUIDED_TODAY_STEPS`; variant input type;
`makeBright{Lang}A2Variant` (contentStatus 'draft', speak language code, threshold
0.8, genre string per language); `make{Lang}A2PracticalLessons` (id =
`{lang}-a2-practical-{n}-{global 001..100}-{slug}`); `{Lang}A2CompactLesson` +
`make{Lang}A2CompactLesson` (computes chunk/item ids from slug prefix, accepted-
answer variants, speak tokens). Adapt the accepted-answers helper to the script:
accent-stripped for Romance, umlaut-digraph for German, plain for English, identity
for Hangul. Codex APPENDS content only — it never touches the scaffold.

## Stage 2 — Per-language spec (Fable writes tmp\A2_{LANG}_P1_P10_SPEC.md)

Copy the German spec's skeleton. Must contain:
1. Base-locale rule up top, in bold, with the A1 evidence cited.
2. **Hard rules** (~17): two-turn shape (sceneCaption quotes the interlocutor's
   target-language line inside the base-locale caption; corePhrase = the response);
   locale hygiene (no digraphs, no slash alternatives, no English leaks); register
   locked PER PATH with the exact path split; tense contract; word-order/grammar
   checkpoints specific to the language; gender-safe production; typeRecall rules
   (never blank a pronoun, no apostrophes in the answer, before+answer+after ===
   targetText exactly, exactly 4 fallbackChoices); mechanical invariants; trophy
   discipline; inventory anchoring (Goethe/PCIC/Cambridge/CEFR-CV per language);
   sizing (corePhrase 6–14 words, chunks 3–6, lessonItems 5–7, buildChips = chunks
   + exactly 2 distractors, max 7); `speakRequired: [w1,w2,w3]` three single
   apostrophe-/hyphen-free words present in the corePhrase; no bare-article/
   preposition chunks; ASCII slug scheme (transliterate/romanize); TTS-clean text;
   no new types/builders/helpers, no loops, one compact-lesson call per lesson.
3. **Gender-safe past whitelist** — think per language, don't copy blindly:
   Romance être/essere passé composé BANNED (participle agrees with speaker);
   German sein-Perfekt ALLOWED (no agreement); Korean 았/었어요 safe (no gender);
   **Polish is the hard case** — past tense itself is gendered (-łem/-łam), so every
   past-tense learner line needs both-gender acceptedAnswers or a neutral
   construction, and typeRecall must never blank a gendered verb form (doc §5.3).
4. Per-path exports section (names, metadata fields, builder calls — exact).
5. **Forbidden trophy list** (from Stage 0) + "known traps" naming which obvious
   trophy choices are already taken and suggesting alternates.
6. Per-path specs: the shared A2 spine (P1 Back again · P2 This one, because… ·
   P3 Yesterday and just now · P4 Plans and changes · P5 Actually, no · P6 Getting
   things done · P7 What do you recommend? · P8 How's it going? · P9 Something's
   wrong · P10 Your story), each with register, grammar scope, and a 10-beat arc
   realized NATIVELY for this language (target-first, never calqued from the
   English/Romance arcs).

## Stage 3 — Validator config (Fable edits)

Add the language to `CONFIGS` in
`orchestrator/frontend/scripts/validate-guided-draft-a2-phase2.ts`: key,
targetLanguage, modulePath, exportPrefix, pathIdPrefix, speakLanguage,
objectPronouns (the never-blank list), spaceBeforePunctuation (true only for
French), bannedTargetPatterns (register bans, tense bans, variety bans — turn every
spec ban into a regex tripwire where possible), baseLocales, recallVariant,
allowCapitalizedTrophies (German only so far). The validator already enforces:
chunk concat === targetText, no leading/trailing spaces in chunk strings, unique
chunk/item ids, trophy uniqueness vs the whole corpus, sizing, quote-glyph scene
captions, recall exactness, speak-token presence. Run it after every batch; when a
new failure mode appears, add a permanent tripwire for it in the same commit.

## Stage 4 — Codex drafting (4 batches per language)

**Cap: 2–3 paths per Codex run** (project memory: quality collapses beyond that).
Standard split: P1–P3, P4–P6, P7–P9, P10 (or 3/3/2/2). Parallel across languages is
fine; batches within one language are sequential (later batches must respect
trophies already used). Model: strongest configured, reasoning **xhigh**.

Prompt shape (copy `A2_DE_BATCH1_PROMPT.md`): `<known_failure_modes>` +
`<task>` + `<verification_loop>` + `<compact_output_contract>`. Non-negotiable
contents:
- The known_failure_modes block verbatim-adapted (diff markers; trophyWord shape —
  meaning/example/whyThisWord are SIBLINGS, never nested; template collapse;
  mechanical 3-word chunks; bare-function-word terms; trivial recall blanks;
  trophies absent from corePhrase) + **"no leading/trailing spaces in ANY chunk
  string"** (every de/en batch violated this until instructed explicitly) +
  **"the sceneCaption is the PROMPT of the two-turn exchange, never the
  resolution"** (Korean P9 failure: captions like "I'll call you another taxi" /
  "here is a new room" pre-resolved the learner's request; the caption must set
  up the problem or ask the question the corePhrase answers) + **no proper-name
  trophies and no particle-attached trophies unless the particle IS the lesson's
  teaching point** (Korean batch 1: 마틴, 신발이, 과일을, 동네를 all needed
  arbiter swaps) + **fallbackChoices must not contain synonyms that would also
  complete the sentence correctly** (Korean batch 1: 전부/모두/전체/다).
- Point at an accepted prior language's module P1–P2 as the quality bar, noting any
  base-locale differences ("do not copy that aspect").
- "If you cannot match the bar for all N lessons, produce fewer paths at full
  quality."
- Append-only to the module; no other file; no helper-factoring, no loops; do not
  commit; **do not run tsx or tests** (Codex sandbox cannot spawn esbuild — Fable
  re-verifies everything locally).
- UTF-8 discipline: no PowerShell text piping; verify no `Ã` mojibake.
- Straight quote conventions per language („…“ for German, “…” elsewhere) — wrong
  glyphs recur in fixes too.
- Output contract: one table (path | lesson# | slug | corePhrase | trophy) + one
  register/past-forms line per path. Nothing else.

Job results land under
`~\.claude\plugins\data\codex-openai-codex\state\orchestrator-*\jobs\` in the job
JSON's `result.rawOutput` — NOT the repo-root state dir. The job registry is
workspace-scoped.

## Stage 5 — Gate + Fable read-through (per batch)

After each batch: run the validator (language-filtered:
`npx tsx scripts/validate-guided-draft-a2-phase2.ts {key}`). Fix mechanical
failures surgically (a trim script for chunk whitespace exists in scratchpad
history — trivially rewritten). Then **Fable reads every lesson** against the spec:
nativeness, arc fidelity, register, two-turn coherence, gloss quality. Batch-level
rejection (re-draft with a sharpened prompt) beats piecemeal repair when quality is
systemically off — the fr/pt first batches were rejected outright and the V2
prompts fixed it.

## Stage 6 — Adversarial review + arbitration (per language)

Codex reviews READ-ONLY (copy `A2_DE_ADVERSARIAL_REVIEW_PROMPT.md`): nativeness
first, base-locale naturalness, register/tense contract, two-turn coherence,
pedagogy, level fit. Tell it NOT to re-check machine-verified invariants. Findings
format: `severity | P{n} {slug} | field | current → proposed | reason`.

**Fable arbiters every finding** — accept / adapt / reject with a reason. Real
reviewer failure modes to watch: register-direction errors (recommending informal
toward service staff), "fixes" that break trophy anchoring (proposed corePhrase no
longer contains the trophy), proposals that violate the tense whitelist, wrong
quote glyphs in proposed text. Accepted fixes go to Codex as a surgical fix prompt
containing the EXACT final wording per edit (no discretion), or Fable applies them
directly. Re-run the validator + read the diff after.

## Stage 7 — Integration + suites

Integrate into `src/data/guidedLessons.ts` after the language's A1 (import + spread,
matching fr/it/pt/de/en A2 precedent). Respect the chunk boundary: dashboard code
touches guided data ONLY via the dynamic import in useTodayMission. Then all green,
from `orchestrator/frontend`:
`npm run typecheck` · validator (24,700+ and growing, 0 failed) ·
`npx tsx scripts/test-guided-today-data.ts` ·
`npx tsx scripts/test-guided-trophy-fallback-matrix.ts` ·
`npm run lint` (0 new) · `npm run check:i18n`.
Known pre-existing failures (6 A1 trophy repeats en/es/it/pt; stale
guided-today-path-overview asserts) are documented staleness — don't chase, don't
worsen.

## Stage 8 — TTS (owner-gated, per phase)

Ask via AskUserQuestion, naming the cost forecast (chars ≈ sum of corePhrase +
chunks + trophy word texts; ~12k chars/language cap; speakTarget deliberately not
generated). On approval: `seed_guided_bright_rotation.py` (voice rotation continues
the A1 roster, one profile per path, `{lang}_a2_bright_p{n}_multiv2_v1`) then
`python scripts/run_guided_bright_batch.py --level a2 --language {lang}` (dry-run
first, expect exact clip count; idempotent — reruns fill only missing). Node
scripts hitting Supabase need `NODE_OPTIONS=--use-system-ca` on this machine.
Verify: verify scripts green + audio spot-checks that actually serve audio.
**After the batch, the language's ids are frozen.**

## Stage 9 — Commit + checkpoint

Scoped commit (never `git add -A` — the tree usually holds another workstream's
files; stage exactly the module, guidedLessons.ts, validator, and any test-baseline
files you changed). Push on owner call. Then the protocol closing ritual: brain
save, NEXT_STEP, LOG. Add any NEW tripwires discovered this run to **this skill**
— that's the whole point of it.

Fix-prompt tripwire (Phase 4): when a fix renames or replaces a taught word
(trophy/term swap), the fix list MUST also cover `pedagogicalGoal`, distractors,
and any whyThisWord that mention the old word — three remnants survived the
Phase-4 fix pass in exactly those fields. Sweep with a contains-check per
replaced word after applying.

Codex-ops (Phase 4): companion `status <id> --json` nests everything under
`.job` — a watcher parsing top-level `.status` reads 'unknown' forever.
`seed_guided_bright_rotation.py` and `run_guided_bright_batch.py` take
`--languages a,b,c` as ONE comma-separated arg. The batch runner's dry-run
char total should match the module-derived forecast exactly (Phase 4: 31,391
to the char) — a mismatch means the wrong snapshot is loaded.

Test-suite tripwire: `test-guided-trophy-fallback-matrix.ts` has an explicit
`A2_LANGUAGES` list that does NOT grow automatically — extend it in the same
commit as integration (phase 3 forgot de/en/ko; Phase 4 backfilled).

New-language A1 accretions (2026-07-16, ru+ja run):
- A NEW language's A1 P1–P10 works as 4 batches (3/3/3/1) with the SAME prompt
  shape; quality bar reference = koreanA1 P1–P2. Write a per-language draft
  validator (`validate-guided-draft-{lang}-a1.ts`, korean-a1 pattern) — the
  shared a2-phase2 validator is A2-shaped (two-turn captions).
- Tell adversarial reviewers the buildChips convention UP FRONT: distractors
  forming valid DIFFERENT-MEANING sentences are the corpus norm (the build
  step is meaning-anchored); only same-meaning synonym substitutions are
  defects; ungrammatical distractor chips are banned. The ru review burned 55
  findings on this class before the addendum existed.
- typeRecall may blank an adjective when the adjective IS the teaching point
  (spec-rule amendment; contract-literal noun/verb/adverb-only produced
  pedagogy-false findings).
- corePhrase shortenings proposed by reviewers must keep ≥3 spaced units
  (speakRequired needs 3 tokens) and must not strip the trophy from the
  phrase — check BOTH before accepting.
- Fix-script hazard: NEVER re-run a replacement script whose new string
  CONTAINS the old string (insertions duplicate — a wifi item landed 4×).
  Batch-1 lessons may use multiline typeRecall formatting while later batches
  are single-line — capture exact context before writing replacements.
- codex-companion job-registry records can vanish (observed after a day
  boundary): save `result` output to tmp IMMEDIATELY on completion and gate
  batches on files+validators, never on the registry.

A2-for-new-languages accretions (2026-07-16, ru+ja A2 run):
- **Draft jobs edit lessons in their verify loop AFTER writing them** — a
  Fable read taken while the job still shows `running` can go stale (ja P4·2
  was rebuilt post-read). Read only after the job closes, or re-extract the
  slug|corePhrase|trophy table at the end and re-read changed rows.
- Validator regex false-positive classes to design around: ja かな matches
  inside na-adjectives (ban it sentence-finally only: かな[。?!]); ru
  speaker-gender token bans hit subject-agreeing short forms (Мой телефон уже
  готов) — the validator cannot know the referent, so keep the tripwire strict
  and swap the offending speak token instead of weakening the ban.
- Reviewer failure modes that recur even when the prompt warns: caption-
  whitelist findings (interlocutor lines flagged for learner-tense bans) and
  per-lesson over-generalization of the P9 "past+present mixed" capstone (the
  mix is a PATH-level property — Korean precedent has present-only repair
  beats). State "the capstone mix is path-level" in future review prompts.
- Review-proposed replacement captions can DUPLICATE a sibling lesson's
  content (ru P8: proposed news line = L1's news; proposed weather question =
  L2's) — arbiter must cross-check the path before accepting caption swaps.
- Parallel-language batching works: ja and ru batches ran concurrently the
  whole way (distinct files), halving wall-clock; batches within one language
  stay sequential.
- `npx rg` is NOT ripgrep (bogus rg@0.0.2 npm package) — use the harness Grep
  tool or a real ripgrep install.

## B1 branch (2026-07-16 — episode tier; German pilot)

B1 is NOT A2-with-harder-words: the lesson is a four-turn EPISODE and the session
runs 7 steps (scene → matchPairs → **pattern** → build → **complication** (multi-
blank cloze) → **rolePlay** (speak both turns) → complete). Design doc:
`orchestrator/docs/Product/FABLE_B1_LEARNING_PATH_DESIGN.md`; per-path contract:
`tmp\B1_GERMAN_P1_P10_SPEC.md` (anchor staging, episode shapes, blank schemas,
100-trophy pre-allocation). Everything in stages 0–9 above still applies; the
deltas:

- **Preconditions (extra):** the language's A2 is complete AND the owner has
  approved the B1 design §8 + the Phase-0 device gate (handwritten cloze/rolePlay
  lessons proven on the owner's phone) BEFORE any Codex batch.
- **Scaffold:** copy `germanB1.ts`, not `germanA2.ts` — the compact input adds
  `register` (per LESSON, supersedes A2's per-path lock), `dialogue` (4 turns,
  you₁ auto-becomes corePhrase), `pattern` (label + 1-sentence rule + 2–3
  highlighted examples), and `cloze` (parts array: strings are text segments,
  objects are blanks with kind/answer/cue/4 choices). estimatedMinutes 7, speak
  15 s. dialogue turn 4 and the cloze are authored SEPARATELY — keep
  you₂ === cloze concat by hand; the validator enforces the identity.
- **Spec must declare per path:** the anchor-family STAGING across L1–L10 (one
  family per path, staged, recycling map), the episode shape (A complication /
  B interested listener / C negotiation — them₂ must ADD content, and in shape B
  the two you-turns read as ONE connected piece of discourse), the blank schema
  (allowed kinds + which kind targets the anchor), register tendency, and the
  trophy pre-allocation for ALL 100 lessons up front (checked mechanically
  against the language's whole corpus — no batch-by-batch trophy scavenging).
- **Batch-prompt additions** (on top of the A2 known_failure_modes): the scene
  shows them₁ ONLY — never author them₂ as something the scene already reveals
  (delayed complication is the tier's core move); cloze blanks never bare
  pronouns/articles (typed kinds), every blank ships exactly 4 same-category
  never-also-correct chips; choice-kind ONLY where typing tests spelling not
  grammar (relative pronouns, als/wenn); pattern examples must reuse ≥ 1 episode
  line and carry a contiguous highlight substring; multi-word blank answers ≤ 3
  words (verb-final clusters encouraged where the anchor is word order);
  typeRecall still reconstructs you₁ exactly (checkpoints consume it).
- **Validator:** `npx tsx scripts/validate-guided-draft-b1.ts` (episode-shaped;
  the a2-phase2 validator stays A2-only). It owns dialogue shape, you₁/corePhrase
  and cloze-concat identities, blank taxonomy vs the spec's schema table, pattern
  honesty, per-lesson register consistency (mid-sentence formal address in
  du-lessons, du-forms in Sie-lessons), German rails, and cross-corpus trophy
  uniqueness. New failure mode → permanent tripwire, same commit.
- **Suite baselines:** `test-guided-today-data.ts` (germanB1PathIds + explicit
  per-path lesson COUNT — Phase 0 pins 3) and the trophy matrix's `[B1 matrix]`
  block (pins segment-1 card count) grow with every batch — update them in the
  integration commit or the suites fail loudly.
- **Review-prompt additions:** B1 reviewer failure modes = flagging interlocutor
  turns against learner rails (them-turns are exempt, as at A2), proposing
  cloze rewrites that break the concat identity or blank count, "fixing"
  register by flattening du-lessons to Sie, and demanding the complication be
  foreshadowed in the scene (it must NOT be). State all four in the prompt.
- **TTS:** two NEW surfaces — `dialogue` (`turn-1`/`turn-3`/`turn-4`; you₁ stays
  corePhrase `__self`) and `pattern` (`ex-1..3`). ~20–25k chars for a full
  B1 language (+60% vs A2). Seeder/batch-runner/verify scripts need the surface
  enumeration extended BEFORE the first B1 batch run. Ids unfrozen until then.
- **Engine note:** the session engine keys on `lesson.level`, not the authored
  `steps` array — a B1 module MUST set `level: 'B1'` in its path metadata or the
  lesson silently runs the A1/A2 5-step flow.
- **Cloze-chip tripwires (2026-07-17, de P1 L4–L10 run):** connector-blank chip
  sets must never mix near-synonymous sequencers (dann/danach — Codex did it in
  5 of 7 lessons); safest clearly-wrong fills are zuerst (when already used in
  the sentence), endlich, damals, trotzdem — and re-check EVERY proposed chip
  for causal plausibility in ITS slot (deshalb/später fit most narrative slots;
  the adversarial reviewer itself proposed deshalb into two causally-friendly
  slots). Modal-blank 4th chip = durfte, never hatte (hatte + infinitive is
  ungrammatical and tests nothing). sein-Perfekt participle blanks need
  sein-verb chips (bin + eingekauft is ungrammatical — form-matched includes
  auxiliary-matched).
- **Episode-tense coherence (same run):** a past-narration episode must not
  answer a live present-tense them-turn with past narration (L5 drafted "Ich
  hatte ... nicht dabei" against a live "Haben Sie ... dabei?"). Fix by
  reframing the them-turns as retrospective (next-day visit) — keeps you₁/you₂
  and every mechanical field untouched. Watch for it whenever the anchor forces
  past tense onto a service-counter scene. Reviewers can miss this class —
  Fable's read-through owns it.
- **P2–P10 accretions (2026-07-17, de B1 full-tier run):**
  - Reconcile the spec's trophy table against the staging table BEFORE writing
    any batch prompt — the de spec shipped three conflicts (hätte trophy L4 vs
    staging L5–7; ob trophy L4 vs L5–7; damit trophy L1 vs L6–8). Realign
    staging to the trophy table, or swap trophies (damit↔klappt precedent),
    and add validator staged-form tripwires for the new anchors in the same
    commit.
  - **Learner you₂ must never assert a service action only the interlocutor
    can decide** ("Dann wird ein neuer Auftrag geschickt." from the customer's
    mouth). Five instances across P6/P9 drafts. Question-form passives are the
    fix ("Wird … geschickt?"); say it in shape-A batch prompts explicitly.
  - Purpose-clause chunking trap: Codex glosses a final 'zu verteilen.' chunk
    as bare punctuation. Chunk um…zu as 'um' | '… zu verteilen.' with real
    glosses — 5 instances, all P7.
  - als/wenn choice blanks are only valid when the slot FORCES one reading —
    add Immer wenn / Jedes Mal / zum ersten Mal style forcers; a bare "Wenn es
    heiß war" also parses as als.
  - Recurring ungrammatical distractor template: present tense + gestern
    ("Ich fahre gestern") — Codex stamped it 4× in P3. Ban the template by
    name.
  - Coarse per-path blank schemas break when late lessons stage a different
    layer (P8 L8–10 comparatives have no als/wenn slot) — the validator may
    need lesson-range anchor alternatives, not a weaker path rule.
  - Saga paths: check every relative day word against the beat calendar
    (P9 L6 "gestern" on a Monday beat pointed at Sunday).
  - Review-prompt shape checks pay off: naming the per-shape dramaturgy
    contract (B continues / A resolves / C accepts-with-modification) and
    cross-path trophy dilution got the reviewer to catch assert-class you₂
    turns and Modell-dilution that mechanical checks cannot see.
- **Codex-ops (same run):** companion jobs land under
  `~\.claude\plugins\data\codex-openai-codex\state\{cwdBaseName-hash}\jobs\`
  — the hash dir is cwd-dependent (repo root → `ResonanceTEST-*`, orchestrator
  → `orchestrator-*`), and `status <id>` from one cwd cannot see another's
  jobs; poll the job JSON file directly. The `%TEMP%\codex-companion` dir is a
  stale legacy registry. The codex:codex-rescue subagent is a fire-and-return
  forwarder — it launches `--background` and CANNOT babysit; poll from the
  main thread.

## Per-language notes (accreting)

- **Spanish**: pilot language; preterite whitelist proved the model.
- **French**: space before ?/! required; vous throughout; avoir-only past.
- **Italian**: Lei; avere-only past; no `scusa`.
- **Portuguese**: BRAZILIAN (você, ônibus, trem, celular, café da manhã); no
  compound perfect (iterative meaning in BR); `desculpe` not `desculpa`.
- **German**: base-EN only (+ situation.de in du-form); Sie P1–3/5–7/9, du
  P4/8/10; sein-Perfekt allowed; war/hatte only Präteritum; no werden-future;
  weil verb-final; nouns keep capitals in trophies; digraph recall fallbacks.
- **English**: base-DE only; AMERICAN variety (en-US); no will-future (going to;
  I'll as fixed chunk); no experiential present perfect ("have you ever" = B1);
  271-word forbidden-trophy list from the multi-vibe A1 corpus.
- **Korean** (A1 evidence; A2 pending): base de+en both (baseLanguage 'German');
  요-form polite + 죄송합니다/감사합니다 formal fixed phrases; romanized-Korean
  slugs (`cheoncheonhi-please`); Hangul accepted answers are identity (no
  case/accents); past 았/었어요 gender-free; speech check is Unicode-aware
  (Hangul-safe since the guidedSpeechCheck fix).
- **Polish** (A2 shipped 2026-07-15): the §5.3 gendered past SOLVED by matching
  each path's TTS voice gender (rotation math: A2 Pn voice =
  roster[(10+n-1) % len]; P3/P9 female → -łam, P10 male → -łem callback);
  gendered terms teach the pair via the scaffold's `alsoAccept`; recall/
  speakRequired/trophies never gendered (validator hooks
  bannedRecallAnswerPatterns/bannedRequiredTokenPatterns); ALL -by-
  conditionals and będę+participle BANNED (gendered) — future = perfective
  non-past; ponieważ banned (bo only); NFD accent-stripping misses ł (no
  decomposition) — use the polishFold helper / validator recallVariant
  'polish'. Known false positive: the recall gendered-form regex also matches
  present-tense -łać verbs (wysyłam) — over-strict, acceptable. Case-matched
  fallbackChoices (genitive blank → genitive distractors) is the A1-carried
  pattern reviewers expect.
- **Indonesian** (A2 shipped): atemporal base-tense licensing is THE rule —
  every past/perfect/future base needs an explicit target marker (sudah/belum/
  tadi/kemarin/baru saja; mau/akan/nanti/besok); polite standard SPOKEN
  register, not bookish (sudah bayar > membayar at counters — the reviewer
  flagged mencari→cari); Malay (awak/sila/tandas/macam mana/nak), Jakarta
  slang (gak/udah/banget/dong/deh/sih), and telah are validator-banned;
  di- passives only as lexicalized fixed chunks (dibungkus), never recall
  targets; ter- state verbs read as B1 (tersambung → pakai); struk not bukti
  for receipts; loanword policy per lesson (check-out precedent).
- **Russian** (A1 committed `353253cf`; A2 shipped `2b58fd94` 2026-07-16): A1 is 100%
  GENDER-FREE by design (no past tense, no рад/рада — neutral recasts:
  Извините за опоздание / Мне пора отдыхать / Я всё лучше понимаю русский);
  ё kept in target text with е-fold via scaffold `russianAccepted`; вы
  throughout; TORFL-A1 scope; trophy-example containment needs declension
  stems + -ть/-ться/-ти/-чь infinitive exemptions in the validator. **A2
  requires the Polish-style per-path voice-gender PLAN BEFORE authoring**
  (no TTS roster exists — content will dictate the roster's genders).
  **A2 DONE under that plan** (tmp\A2_RUSSIAN_VOICE_GENDER_PLAN.md): odd paths
  FEMALE, even MALE (P3/P9 F past, P10 M Я приехал callback); `genderForms
  {voiced, other}` scaffold field generates swapped speak/type variants; бы
  banned outright; futures gender-FREE (буду+inf, perfective non-past) — P4
  uses real futures, easier than Polish; потому что only; вы all 10 paths;
  future roster needs ≥2F+2M voices mapped odd-F/even-M, A1 unconstrained.
- **Japanese** (A1 committed `353253cf`; A2 shipped `2b58fd94` 2026-07-16 —
  です・ます ALL paths incl. friends, past ました whitelist P3/P9 + marked
  recycling, plans = present + time word (no morphological future/つもり/
  でしょう), から-only reasons — ので/と思います banned, ています named-budget
  per path, kanji numerals never digits, targetKana/kana fields feed kana
  speak+type variants): WAKACHIGAKI in
  every target sentence field (particles attached, punctuation attached, か
  attached to its verb — spaced か is a floating-particle validator fail);
  survival-kanji + kana orthography, Hepburn readings in item glosses, kana
  variants via `japaneseAccepted` + all-kana speak acceptedAnswers;
  conjugation whitelist です/ます + fixed て-ください chunks + 行きたい/
  戻りたい + budgets (ね≤1, ましょう≤2, ています named-only per path) +
  わかりました/助かりました as only past formulas; ja-JP ASR is unspaced —
  guidedSpeechCheck.ts CJK branch handles it (Hangul excluded); trophies
  particle-free; topic-particle chunk glosses must be natural noun phrases,
  never "as for X" metalanguage; no TTS voices exist yet — ids unfrozen.
- **Cebuano** (A2 shipped): locale hygiene held clean this time but keeps
  extra review weight; aspect licensing (ni-/naka- + na, wala pa, mo-/mag- +
  time word) mirrors the Indonesian rule; Tagalog banned (po/opo/pakisuyo/
  kayo/hindi) + tungod kay; friendly particles uy/lagi/bitaw ONLY in friend
  paths ≤1/lesson, and agreement bitaw/lagi sits early (Bitaw, ulan na pud —
  not clause-final); full service questions need ang (Unsa ANG problema…);
  wala + ka- form is the natural negated past (Wala ko katulog og maayo, not
  Natulog og dili maayo); dili ko kalugar = idiomatic "can't make it";
  hyphenated words (kanus-a, bag-o) never in speakRequired/recall answers/
  trophies — the tokenizer splits them; nakatilaw/naka-order etc. are fine in
  INTERLOCUTOR caption lines (whitelists bind learner lines only — reject
  reviewer findings against captions).
