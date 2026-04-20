# Gemini Levels Baseline — Before/After Greeting Redesign

**Date:** 2026-04-21
**Scope:** Gemini user-role greeting and system-prompt rules.
**Fixture:** EN→DE (target German, native English), vibe = Calm (mode id `calm`).

## Context

Pre-refactor, Gemini shared `buildGreetingInstruction` with the generic non-character path in `voice-chat.ts`. That path was designed for Voxtral's "speak, don't act" constraint and enforced a rigid `LEVEL: weave one word + end with question + N sentences` structure that produced trivial "hello" teachings and DE→EN language inversion for L0. It also injected a Voxtral-specific parenthetical / stage-direction ban via `generalRules`, suppressing Gemini's prosodic vibe expressivity.

After the refactor, Gemini has its own module (`api/prompts/gemini.ts`) with:

- `geminiRules` that OMITS the parenthetical and stage-direction bans and leads with an explicit license for mood/prosodic coloring (`Your voice is performed with mood and prosodic coloring. Let your personality come through naturally in how you say things.`).
- `buildGeminiGreeting` that picks a level-appropriate language mix and trusts the system-prompt PERSONALITY block to do the rest — no forced sentence count, no forced question, no forced structure.

## Greeting — before/after per level

### L0 — `zero`

**Before (pre-refactor):**

> "Open in English with a short welcome. Introduce one German word: say the word, give its English meaning, and use it in one short sentence. End with a simple question. Keep it to two or three short sentences."

**After (refactored):**

> "Open the conversation with the student. Use English and German together naturally — mix them however feels right. Let your mood come through."

### L1 — `beginner`

**Before (pre-refactor):**

> "Open in English. Weave in one German word naturally — not as a vocabulary lesson. End with one question. Three sentences."

**After (refactored):**

> "Open the conversation with the student in German, with some English for scaffolding. Let your mood come through."

### L2 — `intermediate`

**Before (pre-refactor):**

> "Open the conversation in German with light English support where helpful. Be conversational and brief. End with one question."

**After (refactored):**

> "Open the conversation with the student in German. Let your mood come through."

### L3 — `advanced`

**Before (pre-refactor):**

> "Open the conversation in German. Be true to who you are. Keep it natural."

**After (refactored):**

> "Open the conversation with the student in German. Let your mood come through."

## StudyWord variants (permissive, not mandatory)

### L0 with studyWord `{Mädchen, girl}`

**Before:**

> "Open in English with a short welcome. Naturally weave in the German word \"Mädchen\" (meaning \"girl\") — say it, give its meaning, use it in a short sentence. End with a simple question. Two or three short sentences."

**After:**

> "Open the conversation with the student. Use English and German together naturally — mix them however feels right. Let your mood come through. If it fits your opening, you can weave in the word \"Mädchen\" (girl)."

### L1 with studyWord `{Mädchen, girl}`

**Before:**

> "Open in English. Weave the German word \"Mädchen\" (meaning \"girl\") into your greeting naturally. End with one question. Three sentences."

**After:**

> "Open the conversation with the student in German, with some English for scaffolding. Let your mood come through. If it fits your opening, you can weave in the word \"Mädchen\" (girl)."

### L2 / L3 with studyWord

No change — studyWord is only woven at L0/L1. L2 and L3 drop the addendum entirely.

## Refactored Gemini payload hashes (EN→DE, Calm, no studyWord)

SHA-256 of `systemPrompt + "\n---GREETING---\n" + greetingInstruction`:

| Level | Hash |
|-------|------|
| L0 (zero) | `e19a3f6bec98cba1ea34fc009e478ebed4e99bb878fe97301aed59b71a8f95e6` |
| L1 (beginner) | `bde1d7d998c7088acf4a5668e0a45ab1e3b704690ff5b8bb7dc6d99f26959e3d` |
| L2 (intermediate) | `765c79d48e0a7ee0e0283d2cfd336fc64c0bb9715da97fab4418104d354aa2bc` |
| L3 (advanced) | `b54b8c86e329451353c218575127b1ee7fb93a80fe055deea867d969589c0874` |

**Parenthetical / stage-direction audit:** `geminiRules` contains no `parenthetical`, `stage direction`, or `cannot act, only speak` tokens. Automated grep run over the full Gemini L0–L3 system prompts and greetings for those tokens returned zero matches.

## Design notes carried forward

- **Symmetry between L2 and L3 is intentional.** Both collapse to "Open the conversation with the student in ${targetLangName}. Let your mood come through." The system-prompt `getLevelInstructions` already differentiates L2 (80/20 mix, softer) from L3 (95–100% target, native complexity). Re-stating the level in the greeting was redundant verbiage from the Voxtral-derived template.
- **L0 intentionally drops any "introduce one word" scaffolding.** The system-prompt `LANGUAGE MIX: 70% native / 30% target` + level instructions already tell the LLM to weave 1–2 new words naturally. The greeting layer should open the door, not run the pedagogy.
- **No forced question count.** Gemini mood tiers differ widely (Depressed → flat monotone that trails off; Concierge → bright crisp upspeak). A forced "end with a question" drags every vibe toward the same closing cadence.
