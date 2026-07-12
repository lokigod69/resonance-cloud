# FABLE — A2 Learning-Path Design (v1, owner review)

Date: 2026-07-12. Status: **DESIGN — no content authored yet.** This is the plan-first
document the owner asked for after the guided TTS batch shipped (STATE next-action 8c):
curriculum spine, path/lesson shape vs A1, technical integration, authoring contract,
per-language rollout order. Approve/adjust the decisions in §9 and authoring begins.

Grounding: `GUIDED_CURRICULUM_SPINE_V0.md` (2026-05-12, sketched 3 A2 paths when A1 had
only 5), the shipped A1 corpus (verified today by importing the module: **910 lessons —
100 per language for en/es/it/fr/pt/de/ceb/id/pl across 10 paths each, plus Korean P1**),
the 193-finding A1 quality review (`investigations/GUIDED_A1_CONTENT_QUALITY_REVIEW_2026_07_12.md`),
and a fresh code map of the step engine, progression, and TTS coupling (file refs inline).

---

## 1. What A2 is, in this product

A1 made the learner the **Traveler**: arriving, surviving single practical turns —
one phrase, one moment, walk away with it working. The 10 A1 paths cover first contact,
small help, transit, cafe, introductions, pharmacy, travel, hotel, meeting people, and
goodbyes.

A2 makes the learner the **Regular**: second week in town. The situations are largely
the same rooms — that's deliberate (spiral curriculum) — but the demand changes:

- **Two-turn exchanges.** The other person answers, and you respond to the answer.
- **Simple past reference.** "I already paid." "We arrived yesterday."
- **Preferences with reasons.** "This one, because it's cheaper."
- **Polite pressure and repair.** Returns, corrections, "actually I ordered…".
- **Basic self-story.** Where you're from, what you do, why you're learning.

Per the V0 difficulty ladder: A2 = short sequences, two-turn exchanges, simple past,
polite pressure, basic generation. Still banned (that's B1): connected discourse,
opinions with argument, subjunctive, passive, reported speech.

## 2. The A2 spine — 10 paths × 10 lessons per language

Same shape as A1: one shared functional spine, replicated per language, each language
realizing it natively (not calqued — the A1 review's central lesson). V0's three A2
sketches (Two-Turn Interactions / Preferences-Reasons-Constraints / Polite Disagreement
and Alternatives) are kept as paths 1, 2, and 5 and extended to ten:

| # | Path | Functional focus | New grammar load (realized per language) |
|---|---|---|---|
| 1 | **Back again** — two-turn exchanges | answering counter-questions, asking back, resolving partial answers | question/answer chains, object pronouns as fixed chunks |
| 2 | **This one, because…** — preferences & reasons | preferring, comparing, giving one reason | comparatives, "because" clause (the only subordinate allowed) |
| 3 | **Yesterday and just now** — first past | what you did, where you were, "I already…", "we just…" | whitelisted high-frequency past forms only (see §5) |
| 4 | **Plans and changes** — future & rescheduling | inviting, agreeing on time, moving/canceling | intentional future ("going to" equivalents), time expressions |
| 5 | **Actually, no** — polite disagreement & alternatives | returns, corrections, substitutions, soft no | fixed politeness formulas ("could we…" as chunks, not paradigms) |
| 6 | **Getting things done** — services & errands | laundry, repair, SIM/top-up, booking an appointment | need/until/ready-by constructions |
| 7 | **What do you recommend?** — describing & recommending | asking for and giving recommendations, describing places | adjective use beyond A1, "near/next to" chains |
| 8 | **How's it going?** — feelings & small talk | weather, tired/busy, reacting ("really?", "great!") | reaction particles, intensity words |
| 9 | **Something's wrong** — problems & solutions | broken/missing/late, explaining what happened, confirming the fix | past + present mixed in one exchange (the A2 capstone skill) |
| 10 | **Your story** — the Regular's goodbye | background, work/study, why this language, "see you when I'm back" | consolidation; no new grammar |

Progression logic inside the tier: paths 1–2 stay in present tense (the jump is
interactional, not grammatical), path 3 introduces the past in isolation, paths 4–8
each add one construction while recycling the past, path 9 mixes tenses deliberately,
path 10 consolidates. Trophy words may become "slightly more abstract" per V0:
connectors and pragmatic words (already, almost, actually, instead, because) join the
concrete nouns.

### 2.1 Grounding against institute inventories (verified 2026-07-12, owner ask)

The spine was checked against the four canonical A2 specifications — it is not a
vibes-based list. Per-path mapping:

| Path | Institute grounding |
|---|---|
| 1 Back again | CEFR-CV A2 *Information exchange*: "can ask and answer questions about habits and routines… can ask for and give simple directions"; PCIC A2 funciones 1: alternative questions (¿Qué/Cuál… o…?), answering with detail |
| 2 This one, because… | PCIC A2 gramática: full comparative system (más/menos/tan… que, mejor/peor); CEFR-CV A2: "can explain what he/she likes or dislikes and give simple reasons" |
| 3 Yesterday and just now | PCIC A2 gramática: pretérito indefinido + perfecto introduced AT A2 (ya/todavía no markers); CEFR-CV A2 spoken production: "can describe past activities and personal experiences" |
| 4 Plans and changes | PCIC A2 funciones: proposing (¿Qué tal si…?/¿Por qué no…?), inviting (Te invito a…), refusing politely (Lo siento + excusa); ir a + inf.; CEFR-CV A2: "can make and respond to invitations and suggestions… discuss what to do, arrange to meet" |
| 5 Actually, no | PCIC A2: attenuated requests (¿Puedes + inf.?), polite refusal with excuse; CEFR-CV A2 *Obtaining goods and services*. Full complaint rhetoric is B1 — path 5 stays inside A2 by using fixed politeness formulas as chunks, never argued disagreement |
| 6 Getting things done | Waystage/CEFR-CV A2 *Transactions*: "can ask for and provide everyday goods and services"; Cambridge A2 Key topics: shopping, services; Goethe A2 Prüfungsziele: routine situations, immediate needs |
| 7 What do you recommend? | Cambridge A2 Key topics: places and buildings, food and drink, travel; CEFR-CV A2: "can give short, basic descriptions of places" + simple recommendations as formulas |
| 8 How's it going? | Cambridge A2 Key topics: weather, personal feelings/opinions/experiences, health; CEFR-CV A2 *Conversation*: "can handle very short social exchanges… express how he/she feels in simple terms" |
| 9 Something's wrong | CEFR-CV A2: "can say when something is wrong / doesn't work"; PCIC A2 grammar supplies the mixed perfect+present toolkit. Extended complaint negotiation stays out (B1) — lessons resolve in one repair exchange |
| 10 Your story | Goethe A2 + CEFR-CV A2 spoken production: "can describe his/her family, living conditions, educational background, present or most recent job"; PCIC A2 funciones: formal introductions, written/spoken leave-taking |

Sources: CEFR Companion Volume 2020 A2 descriptors (Council of Europe), Plan
Curricular del Instituto Cervantes A1–A2 inventories (funciones, gramática, nociones
específicas — 20 temas), Cambridge A2 Key vocabulary/topic list (2025 revision,
~1,500 productive items), Goethe-Zertifikat A2 Wortliste (~1,300 lexical units) +
Prüfungsziele, and Waystage 1990 (van Ek & Trim) as the historical A2 spec. Vocabulary
selection per language follows §5 rule 8.

## 3. Lesson shape vs A1

**Unchanged: the 6-step engine.** The step sequence is a hardcoded constant
(`components/today/sessionSteps.ts`: scene → matchPairs → build → type → speak →
complete); nothing reads `lesson.steps` or `modeSet`. A2 v1 stays inside this shape —
**zero engine changes** — which keeps the entire risk in content, where we've proven we
can review and fix at scale. V0's future templates (Dialogue Turn, Choice/Constraint,
Scenario Mission) remain future; the two-turn pedagogy fits the existing shape because
`sceneCaption`/`speakTarget.baseCue` already carry the interlocutor's line — the scene
presents their turn, the learner builds/types/speaks the response.

Within the data, A2 scales up:

| Field | A1 norm | A2 norm |
|---|---|---|
| corePhrase | 3–7 words, one clause | 6–14 words, up to two sentences or clause + "because" clause |
| chunks | 3–4 | 4–6 |
| lessonItems | 4–5 | 5–7 |
| build chips | 5 (incl. distractors) | up to 7 (incl. 2 distractors) |
| typeRecall | one blank | one blank (engine constraint), targeting the path's new grammar element |
| trophyWord | concrete noun/verb | concrete OR pragmatic/connector word |

**Vibes: bright only**, `fallbackVibeId: 'bright'` — matching the shipped direction
(only English ever had wistful/sharp; they're discontinuation-bound; the TTS batch and
cross-vibe tooling are already bright-first).

## 4. Technical integration (verified against the code today)

1. **Type widening, two sites:** `GuidedPathMetadata.level` and
   `GuidedLessonDefinition.level` are the literal `'A1'` → widen to `'A1' | 'A2'`.
   Verified inert at runtime: no code branches on `level` anywhere in src/, so this is
   zero-behavior-risk. It becomes meaningful for the optional directory badge (§9-d).
2. **Ids:** paths `{language}-a2-practical-{1..10}`, lessons
   `{language}-a2-practical-{n}-{NNN}-{slug}` — same convention A1 settled on.
3. **Per-language modules, not the monolith:** author each language in
   `src/data/guided/{language}A2.ts` following the `koreanA1.ts` pattern (type-only
   imports from `guidedLessons.ts`, compact authoring-input array + builder that expands
   to `GuidedLessonDefinition[]`), then two integration lines in the monolith: spread
   into `GUIDED_LESSONS` and append the path metadata to `getGuidedTodayPathOptions()`
   **after that language's A1 paths**. `guidedLessons.ts` (3.6 MB) must not grow further
   by hand.
4. **Progression needs no gate.** `pickMissionPath()` (useTodayMission) walks the
   ordered path list: most-recently-touched incomplete path, else first untouched path.
   Because A2 paths are appended after A1 paths per language, a learner who finishes A1
   flows into A2 automatically — this also fixes today's dead-end where a finished A1
   just re-surfaces its last complete path. Progress stays in localStorage
   (`todayProgress.ts`); no schema work.
5. **Reviews/checkpoints generalize.** Segment reviews (lessons 1–5 / 6–10) and the
   8-item path checkpoint key off pathId and lesson data, not level. The trophy-fallback
   matrix test is A1-scoped and will need A2 rows when the pilot lands.
6. **TTS is a rerun, not new engineering.** Playback resolves on
   `(path_id, lesson_id, vibe, surface, surface_key)` with surfaces
   corePhrase/`__self`, chunk/`chunks[].id`, trophyWord/`__self`, and browser-speech
   fallback on any miss. A2 obeys the same contract: **chunk ids, lesson ids, and path
   ids are frozen once the TTS batch runs** — renaming one silently downgrades its audio
   to browser speech. Batch = seed `{lang}_a2_bright_p{n}_multiv2_v1` rotation profiles
   (`scripts/seed_guided_bright_rotation.py`) + rerun `scripts/run_guided_bright_batch.py`
   with a2 scopes. Rerun-safety was adversarially reviewed and hardened 2026-07-12
   (voice-id in storage paths, no failed-demotion of paid clips, provider 200-payload
   validation, verify scripts now gate via exit codes); before any new batch, run a
   one-language dry-run and expect 0 missing for already-generated scopes. Cost envelope: A1 measured 47k chars for 10 languages; A2 phrases run
   ~1.5–1.8× longer → **~70–85k chars for 9 languages**, comfortably inside the
   remaining ~247k credits. Sequencing rule from A1 stands: content review lands BEFORE
   any audio is generated.
7. **Bundle note (not v1 work):** everything guided ships in one dynamically-imported
   chunk. Full A2 roughly doubles it (~3.6 → ~7 MB). Home/first-paint is unaffected
   (chunk-boundary rule holds), but when /today load time starts to matter, the escape
   hatch is per-language dynamic modules. Flagging now so it's a known trade, not a
   surprise.

## 5. The A2 authoring contract

Every rule below is a scar from the 193-finding A1 review; they go into the builder
module header and the review checklist verbatim.

1. **Tense contract v2, explicit per path.** Present everywhere; past forms only from a
   per-language whitelist of high-frequency verbs (introduced path 3, recycled after);
   intentional future from path 4. Politeness conditionals ("could we…") only as fixed
   chunks, never as a paradigm. No subjunctive, passive, reported speech, or stacked
   subordinate clauses; "because"/"when" is the single allowed subordination.
2. **Locale hygiene is absolute.** Every `.de` field is German, every `.en` field is
   English — including `sceneCaption`, `placeholderMedia.caption`, and all metadata
   titles (the A1 systemic failure: 190 wrong-locale fields each in ceb/id). Real
   umlauts, never digraphs. No slash alternatives ("gehen/fahren") in any authored text.
   No English leaks ("Hi") into German fields.
3. **Gender-safe production.** This bites harder at A2: past participles and adjectives
   gender-agree in pl/it/pt/fr/es. Every typeRecall and lessonItem whose answer is
   gender-marked must either use a neutral construction or accept **all** speaker-gender
   forms in `acceptedAnswers` (A1's Polish masculine-default findings). Addressee-gender
   defaults (pan/pani) get both forms or a neutral phrasing.
4. **Register locked per path, documented per language** in the module header (du/Sie,
   tu/vous, informal-you policy) — no mid-path switches (A1 German P9 finding).
5. **Target-first authoring.** Write the native phrase for the situation, then the
   bases; never translate the English scaffold outward (bus-platform/checkout-calque
   findings). Per-language loanword policy documented where it matters (Indonesian
   "check-out" precedent: teach what works at the desk, exempt it from the anti-loanword
   test by lesson, not globally).
6. **Mechanical invariants** (all already enforced by suites): `before+answer+after ===
   build.targetText`; acceptedAnswers include the answer; chunks retain every lexical
   token of the core phrase; unique chunk AND lessonItem ids within a variant (47 A1
   English variants had item-id dupes); base tense matches target tense semantics (the
   Indonesian atemporal-target/past-base mismatch).
7. **Trophy discipline:** unique across the language's entire guided corpus (A1+A2
   together — the uniqueness suite spans `GUIDED_LESSONS` globally), level-appropriate,
   anchored to the lesson's production, with a grammatical example sentence.
8. **A2 vocabulary is inventory-anchored (owner rule, 2026-07-12).** Content words
   introduced in A2 lessons must be plausible members of the established A2 inventories
   — PCIC nociones específicas A1–A2 for Spanish, Goethe A2 Wortliste for German,
   Cambridge A2 Key list for English, and the CEFR-CV A2 thematic domains for languages
   without a national inventory (it/pt/pl/ceb/id/ko). Not every word needs a citation,
   but every lesson's lexical load must come from A2-typical categories (services,
   errands, weather, feelings, travel, biography), and anything a reviewer would flag
   as B1+ (abstract argument nouns, low-frequency register) gets swapped at review.

Gate per language, in order: author → the 15 guided suites green → a
`review-language-addition`-style adversarial content review → fixes → owner spot-check
→ TTS batch → deploy check. Audio never precedes review.

## 6. Rollout order (recommendation)

- **Phase 0 — pilot: Spanish A2 Practical 1** (10 lessons, one module). Spanish because
  its A1 is mature, its preterite stresses the past-tense contract hardest (if the
  whitelist model works in Spanish it works everywhere), the market is largest, and its
  voice roster/rotation is proven. Deliverable includes the builder + type widening +
  integration + tests, so every later language is content-only. → owner device check.
- **Phase 1:** Spanish A2 complete (P2–P10).
- **Phase 2:** French, Italian, Portuguese (Romance siblings; the Spanish grammar-ladder
  realizations adapt most directly).
- **Phase 3:** German, English.
- **Phase 4:** Polish, Indonesian, Cebuano.
- **Korean:** A2 deferred until Korean A1 P2–P10 ships (itself gated on the owner's P1
  device check). No A2 for a language whose A1 is incomplete.

Alternative pilot if the owner prefers dogfooding: **Polish** (the owner is actively
testing Polish-from-home; its gendered past is the nastiest authoring case, so the
contract gets stress-tested earliest). Trade-off: slower, harder first iteration.

## 7. Size and effort

Full A2 = 900 lessons (9 languages × 100), mirroring A1. The pilot is 10. Authoring
throughput precedent: the A1 languages were authored in single large batches and then
review-hardened; A2 follows the same motion but with the contract (§5) enforced at
authoring time, which the A1 review data says removes the two biggest defect classes
(locale leakage, tense drift) up front.

## 8. Explicitly out of scope for A2 v1

New step types or session templates (Dialogue Turn as an engine feature, Choice steps,
Scenario Mission), wistful/sharp variants, guided base-locale expansion beyond en/de,
Supabase-persisted guided progress, per-language chunk splitting (§4.7), B1 anything.

## 9. Owner decisions — ANSWERED 2026-07-12

1. **Spine sign-off:** ✅ approved, with the condition that the themes be grounded in
   real institute A2 inventories, not vibes — done, see §2.1 and §5 rule 8.
2. **Pilot language:** ✅ **Spanish.**
3. **Bright-only:** ✅ confirmed for all A2 content.
4. **Directory badge:** ✅ yes (recommended option).
5. **Korean A2 waits** for Korean A1 completion: ✅ yes.
6. **TTS cadence:** ✅ per phase, after that phase's content is signed off.

Owner also authorized (same message): Codex delegation wherever useful, and building
out as far as possible including the pilot TTS batch.
