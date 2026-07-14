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
- **Polish** (pending): gendered past (-łem/-łam) — the §5.3 hard case; both-gender
  acceptedAnswers or neutral constructions; never blank a gendered form in recall.
- **Indonesian**: atemporal — watch base-text tense matching (the A1
  atemporal-target/past-base mismatch finding); loanword policy per lesson
  (the "check-out" precedent: teach it, exempt that lesson from the anti-loanword
  test by id).
- **Cebuano**: A1 had systemic wrong-locale sceneCaption.de findings — locale
  hygiene needs extra review weight.
