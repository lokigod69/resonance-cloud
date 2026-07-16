# FABLE — B1 Learning-Path Design (v2, post-review, for owner sign-off)

Date: 2026-07-16. Status: **DESIGN — no content authored, no engine code written.**
v1 was adversarially reviewed by Codex (gpt-5.x, same session, 17 findings); Fable
arbitered all 17 as accept/adapt — the largest (the scene revealed the episode's
complication before the learner produced anything, killing the communicative need)
restructured the session flow in §3.1. This v2 is the buildable version.

Successor to `FABLE_A2_LEARNING_PATH_DESIGN.md` (approved 2026-07-12, shipped for 12
languages by 2026-07-16). Owner directive (2026-07-16): design B1 with its own, more
sophisticated lesson shape — "not the same flow as A1/A2, but still a specific,
repeatable system across Practical 1–10" — decide the grammar question from language
science, pilot in **German** (the owner is a native speaker and verifies personally),
skip new languages for now.

Grounding: the shipped A1+A2 corpus (~2,400 lessons, 12 languages), the A2 design doc,
the step engine as of today (`components/today/sessionSteps.ts`, `TodaySession.tsx`,
`GuidedCheckpoint.tsx`, `lib/guidedAudio.ts`, `data/guidedLessons.ts` — re-verified
2026-07-16), and CEFR-CV 2020 B1 descriptors + Goethe-Zertifikat B1
Prüfungsziele/Wortliste as the German inventory anchor.

---

## 1. What B1 is, in this product

The persona ladder so far: A1 made the learner the **Traveler** (arrive, survive one
practical turn); A2 made them the **Regular** (second week in town, two-turn exchanges,
first past tense, preferences with one reason). B1 makes them the **Local**: they live
there now. They have an apartment, a routine, appointments, neighbors, opinions, and —
crucially — *stories*. The situations stop being counters and start being episodes:
something happens, it needs telling, explaining, negotiating, and resolving across
several turns.

CEFR B1 ("Threshold") in one sentence: the learner can **narrate** (experiences,
events, a film's plot), **sustain an opinion** (reasons and brief explanations),
**handle the unexpected** (complaints, changes of plan, officialdom), and produce
**connected discourse** — sentences joined by real connectors, not stacked one-liners.
That is exactly the delta we build: A2 banned connected discourse, opinions with
argument, subjunctive/conditional, passive, and reported speech *because they are B1*.
B1 unbans them, one per path, under the same whitelist discipline that made A2
authorable at scale.

### 1.1 The grammar question (owner asked; answered from SLA research)

Do we introduce grammar lessons? **No standalone grammar lessons — but yes, explicit
grammar, embedded.** What the research actually licenses (review-corrected framing):

- **Explicit beats implicit** — the established meta-analytic finding (Norris & Ortega
  2000; confirmed since, incl. Spada & Tomita for both simple and complex features):
  explicit instruction reliably outperforms exposure alone. Note honestly: the same
  meta-analysis found *isolated* explicit grammar (focus-on-formS) also produces large
  effects — "embedded beats isolated" is not a meta-analytic result. Embedding is our
  **design choice**, made for transfer-to-use arguments (Long's focus-on-form) and for
  product coherence: Lingwave lessons are communicative episodes, and a separate
  grammar-unit track would fork the product shape for an unproven gain.
- **Pushed output (Swain):** learners proceduralize syntax only when a task *forces*
  syntactic processing — retrieving a word is not enough; they must build the form.
  A1/A2's single-blank recall pushes lexis; B1's production tasks push morphosyntax
  (inflect this, connect these clauses, place the verb).
- **Skill acquisition (DeKeyser):** declarative knowledge converts to procedural skill
  through repeated production of the same structure in varied content — but practice
  research also favors **distribution and interleaving** over pure blocking, so B1
  recycles earlier anchors inside later paths (§5.7) rather than drilling one structure
  in isolation for ten lessons and never again.
- **Noticing (Schmidt):** a brief explicit highlight of the form in the input
  accelerates acquisition vs hoping the learner spots it.

So the B1 design: **each path owns ONE grammar anchor family** (§2), every lesson
surfaces a **Pattern spotlight** (2–3 highlighted examples + a one-line rule, no
tables, no metalanguage beyond one term), every production task in the lesson forces
that anchor, and the spotlight stays reachable during production (a "show pattern
again" affordance in the cloze step) so repeated failure has a remediation path.
Numbers like "~20 seconds" are design targets, not research claims. Grammar is taught,
visibly — but never leaves the communicative episode.

## 2. The B1 spine — 10 paths × 10 lessons per language

Same replication model as A1/A2: one shared functional spine, realized natively per
language (never calqued). Each path = one discourse function + one **anchor family**
— a small set of related forms that the path's spec must stage lesson-by-lesson
(review finding: "exactly one anchor" was false advertising; P1's narration toolkit
is Perfekt + three Präteritum classes + connectors, and pretending otherwise either
overloads lesson 1 or flattens lessons 6–10). The German column is the pilot
realization; other languages map their own anchors onto the same functions.

| # | Path | Discourse function | Episode shape (§3) | German anchor family (staged across L1–L10 in the spec) |
|---|---|---|---|---|
| 1 | **What happened** — telling a past episode | sequenced narration with connectors | B (listener) | Perfekt as narrative default → war/hatte → modal Präteritum → mixed narration; zuerst/dann/danach/plötzlich |
| 2 | **In my opinion** — opinion, reason, concession | stating a view, defending it lightly | B (listener) | weil/deshalb (recycled from A2) → **obwohl/trotzdem** (verb-final vs verb-second contrast) |
| 3 | **If I could** — wishes, hypotheticals, soft requests | upgrading requests, imagining alternatives | A (complication) | Konjunktiv II: würde + Inf. → hätte/wäre → könnte/müsste (high-frequency forms as a productive pattern, not the paradigm) |
| 4 | **The one that** — describing precisely | specifying which one; describing people/places/things | C (negotiation) | relative clauses: der/die/das Nominativ → Akkusativ (Dativ/genitive relatives stay out) |
| 5 | **Could you tell me…** — navigating officialdom | indirect questions, polite info-seeking, forms & appointments (Bürgeramt, Anmeldung — the Local's rite of passage) | A (complication) | indirect W-questions (wo/wann/wie + verb-final) → ob → dass-clauses |
| 6 | **It's being handled** — processes & status | describing processes, chasing status of repairs/orders/paperwork | A (complication) | Passiv Präsens (wird + Partizip II) → Passiv Präteritum (wurde) — receptive-first, productive in fixed frames |
| 7 | **So that it works** — plans with purpose | arranging things with intent, explaining why-for | C (negotiation) | um…zu → damit; Futur I receptive only (present + time word stays the production default) |
| 8 | **Back then** — past habits, then vs now | comparing life stages, "when I was…" | B (listener) | als vs wenn (past) → früher/heute contrast → comparatives in connected discourse |
| 9 | **Sorting it out** — the complaint capstone | a real multi-turn negotiation: something went wrong, argue it through to a fix | A (complication) | **no new grammar** — path-level mix recycling KII politeness (P3), passive status (P6), narration (P1) |
| 10 | **Your year here** — the Local's story | connected self-narrative: how the year went, what changed, what's next | B (listener) | consolidation; no new grammar |

Progression logic: P1 unlocks narration (the single most useful B1 skill), P2 opinion
structure, P3–P8 each add one family while recycling everything earlier, P9 is the
deliberate mixed capstone (mirroring A2's P9 — the mix is a **path-level** property,
per the established reviewer-failure lesson), P10 consolidates (mirroring A2's P10).
The A2→B1 rhyme is intentional: learners recognize the shape of the tier.

### 2.1 Institute grounding (German pilot)

- CEFR-CV 2020 B1: "Can narrate a story" / "can give brief reasons and explanations
  for opinions, plans and actions" / "can make a complaint" / "can deal with most
  situations likely to arise when travelling" / "can enter unprepared into
  conversation on familiar topics" — paths 1, 2, 9, 5/6, 8/10 respectively.
- Goethe-Zertifikat B1 Prüfungsziele: Sprechen Teil 2 (describing experiences,
  narration), Schreiben Teil 1 (connected personal text), Teil 3 (semi-formal
  complaint/request) — paths 1/10, 10, 5/9.
- Goethe B1 grammar inventory: Konjunktiv II (würde/hätte/könnte), Passiv
  Präsens/Präteritum, Relativsätze, indirekte Fragen, obwohl/trotzdem, als/wenn,
  Präteritum of modals — every anchor family is on the list; nothing beyond it enters
  production.
- Vocabulary: Goethe B1 Wortliste (~2,400 units) is the inventory anchor (A2 contract
  §5 rule 8 carries over, pointed at B1 lists). Abstract nouns the A2 review would
  have flagged (Erfahrung, Meinung, Termin, Vorschlag) are now legal — as trophies too.

## 3. Lesson shape vs A2 — the four-turn episode

The owner's core ask: a visibly more sophisticated, still strictly repeatable lesson
system. The structural upgrade:

**A2 lesson = one two-turn exchange (their line → your line).
B1 lesson = one four-turn EPISODE (their line → your line → their reaction →
your follow-up) — and the learner produces BOTH of their turns.**

Critically (the review's central correction): the episode is **not shown up front**.
The lesson establishes the situation and the interlocutor's opening line, the learner
works toward their first turn, and only THEN does the interlocutor's reaction land —
as a genuine surprise the learner must handle. Communicative need precedes the target;
"handling the unexpected" happens in the lesson's dramaturgy, not just its content.

### 3.1 Episode shapes — one engine, three dramaturgies

A single them/you/them/you template would fit negotiation but distort narration and
opinion, and by lesson 47 authors would be manufacturing fake complications to satisfy
the shape (review finding). Same data model, same engine, three licensed shapes,
assigned per path in §2:

- **Shape A — Complication** (P3, P5, P6, P9): them₂ raises a problem, condition, or
  counter-question; you₂ resolves it. The transactional default.
- **Shape B — Interested listener** (P1, P2, P8, P10): them₂ is a genuine follow-up
  ("Und dann?", "Warum denn?", "Und heute?"); you₂ *continues* the narration or
  opinion. The learner's two turns form one connected piece of discourse — narration
  as it actually happens in conversation.
- **Shape C — Negotiation** (P4, P7): them₂ offers an alternative or names a
  constraint; you₂ accepts with a modification.

In every shape: **them-turns set up, you-turns carry the discourse.** them₂ must add
something (question, problem, offer) — never rubber-stamp you₁.

### 3.2 The B1 session — 7 steps

A2 runs the hardcoded scene → matchPairs → build → type → speak → complete. B1 runs
its own fixed 7-step sequence, identical in every B1 lesson:

| # | Step | What happens | Engine work |
|---|---|---|---|
| 1 | **scene** (setup mode) | The situation + **them₁ only** (audio + text + base), and what you need to achieve. The episode's outcome is NOT visible. | SceneStep gains a B1 branch; A1/A2 rendering untouched |
| 2 | **matchPairs** | Lexical anchoring first (6–8 items drawn from the whole episode) — vocabulary lands before the rule that uses it. | none |
| 3 | **pattern** | The grammar spotlight: anchor name, one-line rule, 2–3 highlighted examples with audio — at least one of them IS this lesson's you₁ line's structure. | NEW component (display-only) |
| 4 | **build** | Assemble you₁ from chips (8–16 words, the anchor structure lives here — for verb-position anchors, build IS the word-order task). | none |
| 5 | **complication** | them₂ **lands now** (audio plays, text reveals) — and the learner answers it: the cloze completes you₂ (2–3 blanks, §3.3). Surprise and resolution on one screen. "Show pattern again" stays reachable. | NEW component (cloze + reveal) |
| 6 | **rolePlay** | Play the whole scene: them₁ audio plays → learner **speaks you₁** (ASR-checked); them₂ plays → learner **speaks you₂**. Both turns produced orally, in sequence, cued by the interlocutor — the episode performed end-to-end. Per-part retry; pass/continue semantics as today's speak. | NEW component (two-part generalization of SpeakStep) |
| 7 | **complete** | Trophy as today + the full 4-turn episode as recap — "this is the conversation you just had". | CompleteStep gains an optional recap block |

Pedagogical order: need + input (1) → lexical anchoring (2) → noticing (3) →
structured assembly (4) → pushed-output response to new information (5) → full oral
performance (6) → consolidation + reward (7). The session ends speaking, like every
tier — but at B1 the finale is the *episode*, not a sentence. Estimated ~7 minutes
(`estimatedMinutes: 7`).

### 3.3 The cloze — blank taxonomy, not one-size-fits-all

The review killed v1's "always one lemma-cued morphology blank": several German
anchors are syntactic (verb position, pronoun choice), not inflectional — and v1's own
example («Gestern ___ (kaufen) ich») violated the Präteritum rail. Three licensed
blank kinds; each path's spec declares its schema:

- **Form blank** (typed, lemma-cued): produce the anchor morphology —
  «Ich habe den Schlüssel ___ (verlieren)» → *verloren*; «Ich ___ gern mehr Zeit
  (haben)» → *hätte*. For verb-final anchors the blank sits at the clause-final slot,
  so filling it makes the word-order decision («…, weil ich den Bus ___ (verpassen)»
  → *verpasst habe* — multi-word answers allowed, ≤ 3 words).
- **Connector blank** (typed, no cue): weil/obwohl/dann/deshalb… — only
  path-licensed connectors.
- **Choice blank** (chips, no typing): closed-class selections where typing tests
  spelling instead of grammar — relative pronouns (der/die/das/den), als/wenn. Exactly
  4 chips, same-category, case-matched, never also-correct (the Korean synonym
  tripwire, per blank).

Per lesson: 2–3 blanks, at least one targeting the path anchor; blanks never bare
pronouns/articles; per-blank acceptedAnswers with umlaut-digraph variants; 4 fallback
chips appear on a miss (typed kinds), `usedFallback` tracked as today.

### 3.4 What every lesson authors

- `dialogue`: exactly 4 turns — them₁ / **you₁** / them₂ / **you₂** ({speaker,
  targetText, baseText}). you₁ === `corePhrase.targetText` (built, spoken,
  TTS-anchored); you₂ === the cloze's full text (6–12 words, spoken in rolePlay).
- `pattern`: {label, rule (one base-language sentence), 2–3 examples {targetText,
  baseText, highlight}} — level-legal vocabulary, ≥ 1 example from this episode.
- `cloze`: you₂ as segments (text | blank), blank = {answer, acceptedAnswers, kind,
  cue?, choices}.
- `register`: `'Sie' | 'du'` **per lesson** (supersedes A2's per-path lock — B1 paths
  mix scenes; the interlocutor is ONE person per lesson and all four turns must agree;
  validator-checked, reviewer checks distribution across the path).
- `typeRecall`: **kept, single blank, unchanged shape** — not used in the B1 session
  flow, but segment reviews and checkpoints consume `lesson.typeRecall` directly
  (`GuidedCheckpoint.tsx:81,448`); it targets the anchor element of you₁.
- Everything else keeps its A2 shape: chunks (you₁, 4–7), lessonItems (6–8, from the
  whole episode), buildChips (chunks + exactly 2 distractors, ≤ 9), speak thresholds
  (§4), trophyWord (B1-legal: connectors, abstract nouns, pragmatic verbs; unique
  across the language's ENTIRE corpus), bright-only vibes. `sceneCaption` carries
  them₁ (so A1/A2-shaped consumers keep working); the dialogue is the B1 source of
  truth.

### 3.5 Sizing vs A2

| Field | A2 norm | B1 norm |
|---|---|---|
| corePhrase (you₁) | 6–14 words, ≤ 1 subordinate clause | 8–16 words, anchor structure allowed |
| dialogue | — (sceneCaption carried them₁) | exactly 4 turns; them-lines 5–12 words |
| you₂ (cloze text) | — | 6–12 words, 2–3 blanks |
| chunks | 4–6 | 4–7 |
| lessonItems | 5–7 | 6–8 |
| typeRecall | one blank (the in-lesson step) | one blank (reviews/checkpoints only) |
| trophyWord | concrete or pragmatic | + abstract B1 nouns, connectors |
| speaking | speak you₁, 0.8, 12 s | rolePlay both turns, 0.8, 15 s per turn |

## 4. Technical integration (review-hardened)

1. **Level union** widens to `'A1' | 'A2' | 'B1'` (`GuidedPathMetadata.level`,
   `GuidedLessonDefinition.level`, guidedLessons.ts:423/527) + the directory badge.
2. **Step engine.** `sessionSteps.ts` gains `getSessionSteps(lesson)` returning the B1
   sequence for `level === 'B1'`, else the legacy constant; `TodaySessionStep` union
   gains `'pattern' | 'complication' | 'rolePlay'`. We key on `level`, **not**
   `lesson.steps` — authored `steps` arrays have never been read (verified) and
   activating them would put ~2,400 frozen rows in the behavior path for nothing.
   **Full TodaySession plumbing is enumerated work, not a footnote** (review):
   per-lesson step list in step lookup, progress-rail denominator/nodes, count pill,
   complete-index; `canContinue` rules for the three new steps; new state slots
   (clozeState, rolePlayState) + result wiring; rendering branches; `stepIconMap`,
   `getStepTitleKey`, `getStepVisualState` exhaustive-map extensions
   (TodaySession.tsx:76-81, 150-166, 189-196, 236-271, 215-231).
3. **Data model — two layers** (review: v1 missed the second). (a)
   `GuidedLessonVibeVariant` gains optional `dialogue` / `pattern` / `cloze` /
   `register`; (b) the resolved **`GuidedLesson` type hand-picks variant fields**
   (guidedLessons.ts:551-567) and `resolveGuidedLessonVariant` copies them explicitly
   — both must gain the new fields or the step components have no typed runtime data.
   Optional fields → ~2,400 existing lessons untouched; the B1 validator makes them
   mandatory for B1.
4. **Session results:** cloze feeds `typeAttempts`/`typeUsedFallback` (summed / any-
   blank) and rolePlay feeds the existing speak fields (worst-of-two-turns), so
   `todayProgress.ts` consumers need no changes; optional
   `clozeBlanksTotal`/`clozeBlanksFirstTry`/`rolePlayTurnsPassed` added for stats.
5. **Reviews & checkpoints: data-compatible, one UX branch.** Segment reviews render
   `typeRecall` before/after and work as-is. The path-checkpoint mode, however,
   prompts with the WHOLE core phrase's translation while checking the single-blank
   answer (`GuidedCheckpoint.tsx:409-412,464-483`) — tolerable at A1/A2 where the
   blank is most of the phrase, wrong at B1 where it's one element of 16 words. B1
   lessons get the segment-style before/blank/after rendering in path-checkpoint mode
   too (small branch). The trophy-fallback matrix test's explicit language×level
   lists gain B1 rows in the same commit as integration (the A2 tripwire).
6. **Progression needs no gate** — B1 path metadata appends after the language's A2
   paths in `getGuidedTodayPathOptions()`; finishing A2 flows into B1 automatically
   (`useTodayMission.ts` picks the first unfinished path in order).
7. **TTS.** `GuidedAudioSurface` is a closed union `'corePhrase' | 'chunk' |
   'trophyWord'` (`guidedAudio.ts:5`) — it widens with `'dialogue' | 'pattern'`
   (keys `turn-1`/`turn-3`/`turn-4`, `ex-1..3`); lookup/caching already handle
   arbitrary surface keys once the union widens (guidedAudio.ts:62-95). The **whole
   audio toolchain** follows, explicitly scoped: seeder scopes, batch-runner surface
   enumeration, verify scripts, playback-row uniqueness across the new surface/key
   matrix. Browser-speech fallback covers every miss, so B1 ships silent-safe like
   ru/ja; ElevenLabs batch on owner sign-off; **ids UNFROZEN until then.** Cost,
   German pilot: episode turns + pattern examples ≈ +60% chars vs A2 → ~20–25k chars
   for German B1 P1–P10; paid only after content review, per standing rule.
8. **Validator:** new `scripts/validate-guided-draft-b1.ts` (the a2-phase2 validator
   is two-turn-shaped). Invariants: dialogue exactly them/you/them/you;
   `dialogue[1].targetText === corePhrase.targetText`; cloze segments concatenate to
   `dialogue[3].targetText`; every blank's answer ∈ its acceptedAnswers; ≥ 1
   anchor-targeting blank; blank kinds ∈ the path's declared schema; blanks never
   pronouns/articles; choice blanks have exactly 4 same-category chips; pattern
   examples contain their highlight; register consistency across all 4 turns;
   chunk-concat === you₁; trophy unique across A1+A2+B1; German banned-pattern
   regexes (werden-future in learner production, genitive/dative relatives,
   Konjunktiv I, agented passive von-phrases).
9. **i18n:** new step keys (`today.pattern.*`, `today.complication.*`,
   `today.rolePlay.*`, recap strings) ×3 locales, through `check:i18n`.
10. **Module:** `src/data/guided/germanB1.ts` on the `germanA2.ts` scaffold pattern
    (compact input type + builders; ids `german-b1-practical-{n}-{NNN}-{slug}`);
    Codex appends content only. Bundle note from the A2 doc stands.
11. **Progress persistence (escalated to an owner decision, §8).** Guided progress
    lives only in user-keyed localStorage (`todayProgress.ts`). At 300 cumulative
    lessons per language, a lost browser profile or a device switch wipes months of
    visible progress. Supabase-persisted guided progress stops being "out of scope"
    and becomes a named launch decision for the B1 era.
12. **Pipeline branch (review finding — do this BEFORE drafting).** The
    author-guided-tier skill is A2-shaped end-to-end (two-turn captions, 6–14-word
    sizing, single typeRecall, a2-phase2 validator, A2 batch-prompt contract). Stage
    0 of the B1 rollout adds a **B1 section to the skill**: B1 scaffold shape, spec
    skeleton (episode shapes per path, anchor staging, blank schemas, trophy
    pre-allocation), B1 batch-prompt contract, B1 review-prompt contract, B1
    validator reference. Without it, later Codex batches will regress B1 drafts
    toward A2 shape.

## 5. The B1 authoring contract (delta over A2's §5)

A2 rules carry over (locale hygiene, gender-safe production, target-first authoring,
mechanical invariants, trophy discipline, inventory anchoring — now Goethe B1
Wortliste) **except the per-path register lock, which §3.4's per-lesson register
contract supersedes.** B1 adds:

1. **One anchor family per path, staged.** The path's spec stages its family across
   the 10 lessons (e.g. P1: L1–3 Perfekt only → L4–5 + war/hatte → L6–7 + modal
   Präteritum → L8–10 mixed narration) with an explicit recycling map. Learner turns
   use only: this path's family as staged, A1/A2-attested structures, and earlier B1
   paths' anchors. Forward references banned; P9/P10 introduce nothing.
2. **Episode coherence per shape** (§3.1). them₂ must add real content (question /
   problem / offer); you₂ must respond to it specifically. The A2 "caption is the
   prompt, never the resolution" tripwire generalizes: them-turns set up, you-turns
   carry.
3. **Cloze discipline** (§3.3): blank schema per path, declared in the spec;
   anchor-targeting blank mandatory; distractor chips same-category, form-matched,
   never also-correct.
4. **Pattern honesty:** the card teaches exactly the anchor, in level-legal
   vocabulary, one-sentence rule, ≥ 1 example drawn from the lesson's own episode.
5. **German register:** per lesson (`register` field): Sie with officials/services/
   strangers, du with friends/neighbors; one interlocutor per lesson; no mid-episode
   switches. Path-level tendencies (P5/P6/P9 mostly Sie; P2/P7/P8/P10 mostly du;
   P1/P3/P4 mixed) live in the spec as distribution guidance, not hard locks.
6. **German grammar rails:** Perfekt is the spoken-narrative default; Präteritum only
   sein/haben/werden + modals (+ es gab); Konjunktiv II only würde+Inf and
   hätte/wäre/könnte/müsste (no archaic synthetic forms, no Konjunktiv I); relatives
   Nom/Akk only; passive without agent (no von-phrases); Futur I never required in
   production. Validator-regexed where possible — learner turns only; interlocutor
   turns are whitelist-exempt (the established caption rule).
7. **Recycling blanks:** in lessons 6–10 of each path, one cloze blank MAY target an
   earlier path's anchor (spec-staged) — deliberate interleaving; segment reviews
   and checkpoints provide the delayed-retrieval layer.
8. **Trophy pre-allocation:** the German spec reserves all 100 B1 trophies UP FRONT,
   checked against the ~200 already used across German A1+A2, frequency-checked
   against the Goethe B1 Wortliste, each anchored in its lesson's episode. No
   batch-by-batch trophy scavenging (the lesson-47 uniqueness squeeze).

## 6. Rollout

- **Phase 0 — engine + pipeline branch + pilot spec.** Fable builds: §4 items 1–5 and
  8–9 (step plumbing, data model both layers, cloze/pattern/complication/rolePlay
  components, checkpoint branch, validator, i18n), the germanB1 scaffold, the B1
  section of the author-guided-tier skill (§4.12), and
  `tmp\B1_GERMAN_P1_P10_SPEC.md` (anchor staging, episode shapes, blank schemas,
  trophy pre-allocation). **Gate: the cloze and rolePlay steps get a device check on
  2–3 handwritten sample lessons BEFORE any Codex batch** — the mobile interaction
  contract (blank focus order, keyboard behavior, chip insertion, two-part ASR flow)
  must be proven before 100 lessons are shaped around it.
- **Phase 1 — German B1 P1 pilot** (10 lessons, Codex-drafted per the branched
  pipeline, validator-gated, Fable read-through, adversarial review, arbitration).
  Owner device-checks P1 **natively** — the cheapest quality gate the tier will ever
  get.
- **Phase 2 — German B1 P2–P10** (4 Codex batches, the proven motion).
- **Phase 3+ — other languages by owner pick** (Spanish first by market logic; each
  needs its own anchor mapping). Explicitly not now.
- TTS per phase after content sign-off; German B1 ids frozen only after its batch.

## 7. Out of scope for B1 v1

Branching dialogues / free-response AI turns (the Speak tutor's job), listening
comprehension as a separate step type, writing/composition tasks, wistful/sharp
vibes, guided base-locale expansion, adaptive difficulty beyond the pattern-recall
affordance (§1.1), B2 anything, retro-fitting the episode shape onto A1/A2.

## 8. Owner decisions requested

1. **Spine + German anchor families** (§2) — you can judge these natively.
2. **Four-turn episode with delayed complication + 7-step session** (§3) — the core
   flow. v1's flow was revised on review; §3.2 is the version to bless.
3. **Grammar approach** (§1.1: embedded pattern spotlights, staged anchor families,
   no standalone grammar lessons).
4. **German as pilot with the Phase-0 device gate** (§6).
5. **Guided progress persistence** (§4.11): keep localStorage-only through the B1
   era, or schedule Supabase-persisted progress before B1 ships wide?
6. **TTS cadence** unchanged (per phase, post-review) — confirm.
