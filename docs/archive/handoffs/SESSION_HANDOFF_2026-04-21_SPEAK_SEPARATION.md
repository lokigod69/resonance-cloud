# SESSION_HANDOFF_2026-04-21_SPEAK_SEPARATION.md

## Session: Voice-chat provider separation + Gemini greeting redesign

**Date:** 2026-04-21
**Starting state:** Commit `cafafd5`, Voxtral L0 regression partially addressed by ghost-commit `eeabff3` (never pushed), Gemini L0 producing trivial "hello" teachings and DE→EN language inversion, `voice-chat.ts` a single shared-function provider-branching file
**Ending state:** Commit `0603293` on `origin/main` — Voxtral/Gemini/Grok-stub separated into `orchestrator/frontend/api/prompts/` modules, Gemini L0–L3 redesigned with minimal-instruction "let the vibe carry it" philosophy, parenthetical ban quarantined to Voxtral, Voxtral behavior hash-verified byte-identical across all four levels
**Verdict:** Separation architecture shipped and working. Gemini vibe expressivity landing in some tests (Playful, Depressed, Melancholic), language-mix discipline inconsistent (especially EN↔DE, Sarcastic vibe). Voxtral follow-ups pending. Grok is the next integration track in a fresh session.

---

## What actually shipped in this session

### Voxtral L0 investigation (completed, actioned)

Prior session's `33c15d1` → `be50d92` → `93a0c05` chase was aimed at the wrong target. Actual root cause: `33c15d1` itself rewrote the Voxtral L0 greeting from a structured teaching instruction into `"Open the conversation in English. Be true to who you are. Slip in one useful German word naturally — not as a vocabulary lesson."` plus Arthur's directive prepended into the user-role greeting. Three compounding flaws: character-act license, anti-anatomy license, directive double-injection.

`93a0c05` produced a payload SHA-256-identical to `33c15d1` — that "revert" did nothing functional. Codex static review confirmed byte-identity to the wrong baseline.

Investigation at `investigation/VOXTRAL_L0_INVESTIGATION.md` established the regression breakpoint empirically via payload diff and 3-samples-per-commit Groq runs. Last-known-clean Voxtral Arthur commit: `b379372` (pre-`33c15d1`).

**Fix landed** in commit `20c86b4` "fix(voice-chat): baseline Voxtral L0 dispatch" — replaced the L0 greeting with bilingual-presence design: *"Open the conversation. Greet the student in {nativeLang} in your own voice, and include some {targetLang} naturally — by switching, echoing, or using both. End with an open question that invites them to share something about themselves. 1-3 sentences."*

Also wrote `investigation/VOXTRAL_LEVELS_BASELINE.md` documenting the current L1/L2/L3 construction (all three share a non-zero template with `"Be true to who you are"` + directive double-injection still present at higher levels — noted for future iteration).

### Gemini L0 investigation (completed, actioned)

Separate investigation at `investigation/gemini_payload_noir_en_de_L0.txt` and `investigation/gemini_payload_melancholic_de_en_L0.txt` established:

- Gemini L0 `"Introduce one {targetLang} word..."` has implicit-subject imperative that collapses to `hello`/`Hallo` as trivial completion
- DE→EN inversion is LLM behavior under ambiguous bilingual prompt (variables pass through code correctly), not a code-path swap
- `generalRules` constant with Voxtral-specific parenthetical ban was being injected into Gemini system prompt — explicitly suppressing Gemini's prosodic/vibe expressivity
- `sanitizeForTTS` strips `[whispers]`, `[dramatic]`, `[gentle]` from LLM output unconditionally — Voxtral-derived inertia, may suppress Gemini TTS capability (unconfirmed, deferred)

### Architectural separation (the main ship of this session)

Commit `0603293` refactored `voice-chat.ts` into provider-separated modules:

```
orchestrator/frontend/api/
├── voice-chat.ts                      (POST handler with inference-based routing)
└── prompts/
    ├── _shared/
    │   ├── pedagogy.ts                (LANGUAGE_CONFIG, getLevelInstructions, studyAddendum)
    │   ├── roleplay.ts                (provider-agnostic roleplay prompt)
    │   └── generic.ts                 (fallback — no character, no vibe)
    ├── voxtral.ts                     (buildVoxtralSystemPrompt + buildVoxtralGreeting + voxtralRules WITH parenthetical ban)
    ├── gemini.ts                      (buildGeminiSystemPrompt + buildGeminiGreeting + geminiRules WITHOUT parenthetical ban)
    └── grok.ts                        (stub — throws clear error if invoked)
```

**Routing is inference-based, not explicit `provider` field** — critical catch during implementation. Frontend only ever sends `provider: 'gemini'` explicitly (via `useVoiceTutor.ts:411`); Voxtral is never sent as a string. Routing logic used:

```
if (provider === 'grok') throw
else if (!character && gemini_vibe_directive) → Gemini
else if (character) → Voxtral
else → Generic
```

If the original plan's `provider === 'voxtral'` routing had been used, Voxtral would have regressed silently on merge. This save happened pre-flight, not post-hoc.

### Gemini greeting redesign (all four levels)

Philosophy: **the vibe is the whole point; get out of its way.** Minimal user-role instructions, no forced question at the end, no forced sentence count, no forced anatomy. System prompt's PERSONALITY block + language-mix rule do the work.

New Gemini greetings:
- **L0:** `Open the conversation with the student. Use {nativeLang} and {targetLang} together naturally — mix them however feels right. Let your mood come through.`
- **L1:** `Open the conversation with the student in {targetLang}, with some {nativeLang} for scaffolding. Let your mood come through.`
- **L2/L3:** `Open the conversation with the student in {targetLang}. Let your mood come through.`

Optional studyWord addendum (permissive, not mandatory) appended when present.

`geminiRules` constant created without parenthetical ban; gained a single new line: *"Your voice is performed with mood and prosodic coloring. Let your personality come through naturally in how you say things."*

Baseline documented at `investigation/GEMINI_LEVELS_BASELINE.md`.

### Verification that landed

- Voxtral payload SHA-256 byte-identity across L0/L1/L2/L3 for Arthur / EN→DE (all four match current main, confirmed by hash table in completion report)
- Gemini payloads scanned for `parenthetical`, `stage direction`, `cannot act, only speak` — zero matches
- Roleplay, persona-tier, generic-fallback paths all verified byte-identical for Voxtral
- `useVoiceTutor.ts`, `characterRegistry.ts`, `geminiCharacterModes.ts`, `sanitizeForTTS`, `_shared/geminiTts.ts` — all untouched
- `git push origin main` succeeded; `git ls-remote` confirmed remote SHA match
- Vercel deploy Ready (17s)

### Live device testing (2026-04-21 evening)

**Voxtral — 80%, shippable:**
- EN→DE with Kyle (style tutor): 10/10, natural bilingual switching, hobby/reason questions, open-ended, no "hello" artifacts
- EN→DE with Orion: verbose but good, multiple target words woven naturally
- EN→ES with Zoe: pretty good, slightly verbose
- EN→FR with Socrates: acceptable, some language mix
- Italian with an Italian-language tutor: goes ham — 7 lines of Italian, incomprehensible to absolute beginner
- Cleopatra (persona tier) in Dutch: **18 lines, all Dutch, zero bilingual anchor** — persona tier verbosity not respected
- Korean target: English/German/Korean code-mixing bleeds through
- Portuguese target: English/German/French/Portuguese code-mixing bleeds through
- Dostoevsky in Spanish at L0: lots of German, some Spanish, weird — persona tier again
- Roleplay mode included level labels (role-play shouldn't have levels)

**Gemini — vibe lands, language-mix discipline is the problem:**
- Noir EN→DE beginner: vibe OK, heavy German, target word mentioned in passing
- Playful EN→DE L0: vibe comes through very well, "nice" per Sir Robert
- Sarcastic EN→DE L0: **entire script is German but pronounced like an English translation** — very strange artifact, model translating to itself
- Melancholic ES L0: gets a pass, sometimes silent, sometimes works
- Depressed IT L0: good, vibe perfect
- General: sometimes ignores the target language entirely, just stays native

---

## Open tracks (not in scope for next session unless Sir Robert decides)

### Voxtral follow-ups
1. **Persona tier verbosity** — Cleopatra 18 lines, Dostoevsky in Spanish rambles, Marcus Aurelius verbose. The `2–4 sentences` cap in the greeting instruction isn't being respected by the model for persona characters. May need stronger cap or rework of persona directive injection.
2. **Third-language bleed** — when native+target are both non-English, model mixes in English/German/French. `GENERAL_RULES` says "Use ONLY native and target" but model doesn't honor it consistently on non-EN pairs. Likely needs the rule earlier in the system prompt or more emphatic wording.
3. **Korean Hangul vs romanization** — model outputs `annyeong haseyo` instead of `안녕하세요`. Separate concern, to be addressed when Sir Robert starts learning Korean.
4. **Roleplay level leak** — roleplay scenarios include level labels; roleplay arguably shouldn't be level-gated at all.
5. **Voxtral L1/L2/L3 greeting template** — still uses the `33c15d1`-era `"Be true to who you are"` + directive double-injection at non-zero levels. Not causing the L0 failure mode but worth revisiting when Sir Robert iterates on higher levels.

### Gemini follow-ups
6. **Language-mix discipline** — Sarcastic vibe especially bad, model "translates to itself" (German text pronounced with English intent, or vice versa). Hypothesis: vibe directive + level instructions + language-mix rule are competing for attention and language-mix is losing. Fix may be reordering the system prompt or strengthening language-lock language in `geminiRules`.
7. **Bracket preservation for Gemini TTS** — `sanitizeForTTS` unconditionally strips `[whispers]`, `[dramatic]` etc. Unknown whether Gemini TTS actually reads brackets as prosodic direction or literally. Needs empirical test with Gemini TTS before touching `sanitizeForTTS`. If Gemini does parse brackets, conditional preservation would unlock further vibe expressivity. If not, leave alone.
8. **Gemini L1/L2/L3 iteration** — new greetings are minimal and untested at higher levels. Sir Robert will evaluate as customers use the tool.

### Cross-cutting
9. **TTS pronunciation mixing** — independent of greeting logic, some outputs have voice-language binding issues (German words pronounced with English phonology). Separate track.
10. **iOS testing** — all device testing this session happened on Sir Robert's iPhone via live deploy, no regressions observed in the primer/silent-mp3/AudioContext layer.

---

## Key learnings

1. **Byte-identity verification caught a routing bug pre-flight.** The implementing agent's own pre-flight trace (grepping `useVoiceTutor.ts` for what `provider` field is actually sent) caught that the plan's `provider === 'voxtral'` routing would have regressed Voxtral silently. This kind of pre-flight investigation was more valuable than any adversarial static review that could have happened post-commit.
2. **Static review confirms byte-identity, not semantic correctness.** Yesterday's `93a0c05` passed static review cleanly while regressing Voxtral behavior because it was byte-identical to the wrong baseline. Empirical Groq testing is the only authoritative signal for prompt changes. This session kept static verification (hash checks on Voxtral) but accepted on-device testing as the Gemini validation layer rather than running another empirical Groq loop.
3. **Shared scaffolding is structural debt.** `generalRules` injected into every provider path meant that a Voxtral-hygiene rule (parenthetical ban) silently suppressed Gemini's core capability (prosodic direction). The bug wasn't in any one commit — it was in the architecture. Separation was the actual fix.
4. **"Just add routing on `provider` field" broke because frontend inference didn't match.** The proposed explicit-provider routing looked clean in the plan and would have broken Voxtral. Trace what the frontend actually sends before writing backend routing.
5. **Agent ghost-commits are real.** Yesterday's `eeabff3` claim with SHA, diff widget, and completion report — nothing landed on remote. Today's workflow added explicit `git push origin main` + `git ls-remote origin main` verification steps and both completion reports confirmed remote SHA match before claiming success.
6. **Gemini vibe > Gemini structure.** Live tests confirm that when Gemini's vibe directive is allowed to breathe (parenthetical ban removed, minimal greeting), the prosodic coloring lands — Playful, Depressed, Melancholic all came through recognizably on first test. The remaining issues are language-discipline, not vibe quality.

---

## State of non-speak work (unchanged, still working/open)

- GPU worker (LTX-2.3, RunPod L40S) — last state: four-change fix pending validation (distilled weights restore, LoRA removal, scheduler reconfig, single-stage evaluation). Unrelated to this session.
- Frontend queue position display shipped `cafafd5` — unrelated, just present in HEAD.
- Other uncommitted files in working tree (DeckView, DeckViewPG, GenerateGO, GeneratePG, SQL migration, concept engine work, Suno-related) — left untouched, not part of this commit. Sir Robert to decide their fate separately.

---

## For the next session

**Immediate next track: Grok (xAI) integration as third provider.**

Starting prompt: `/mnt/project/GROK_INTEGRATION_STARTING_PROMPT.md`.

Sir Robert has xAI API documentation ready to paste. Stub exists at `orchestrator/frontend/api/prompts/grok.ts` throwing a deliberate error — this is the slot Grok will fill. Design Grok's prompt philosophy from scratch using xAI's actual capabilities; do not inherit Voxtral or Gemini patterns by default.

If Sir Robert's Gemini device testing turns up something blocking before Grok work starts, Gemini follow-up #6 (language-mix discipline) is the most likely candidate for immediate attention.
