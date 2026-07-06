# Language Expansion Brief — mission for a future session

Status: brief only — nothing here is built yet. Written 2026-07-06 after Script Lab V1
shipped, as the hand-off for the next big agenda. The owner will paste a short
continuation prompt into a fresh session; that session should read this file first,
then `memory/INDEX.md` + `memory/STATE.md` per the project protocol.

## The mission

Lingwave supports ~11 target languages today; there are ~100 worth shipping. Adding one
currently requires undocumented tribal knowledge scattered across a dozen files. The
mission is NOT "add N languages by hand" — it is to build the **system** that lets any
competent agent (Claude, Codex, or future models) add a language correctly and
completely, every time:

1. **Investigate** (with Codex doing the broad scanning) everything that defines a
   "language" in this codebase, and write the findings into one architecture doc.
2. **Author highly detailed, repo-specific skills** under `.claude/skills/` — the same
   pattern as `add-script-lab-language`, which is the quality bar: concrete file paths,
   exact steps, verification commands, content-accuracy rules, per-case notes, and an
   explicit "do not" list.
3. **Prove the system once**: add one new target language end-to-end using only the new
   skill, fixing the skill wherever it proved vague or wrong. Recommended: **Russian** —
   it is genuinely wanted, and it unlocks the already-built Cyrillic path in Script Lab
   (`.claude/skills/add-script-lab-language` — Russian alphabet becomes a pure data pack
   once the language exists).

## Two distinct expansions — do not conflate them

**A. Target languages** (what you learn): the smaller, well-bounded project. A target
language touches: `lib/languages.ts` (LANGUAGES entry + capability flags isBase /
isWizard / isLanding / isSpeak), `lib/languageNames.ts`, `data/categories.ts` +
`staticCategoryTranslations.ts` (curriculum metadata incl. `script:` field),
deck/wizard generation paths, optionally guided Today (`lib/todayLanguage.ts`
GuidedTargetLanguage — note the 2.8 MB guided-data chunk boundary), static thematic TTS
voice profiles (`lib/staticThematicAudio.ts` + Supabase `static_tts_playback` rows —
generation tooling currently lives on worktree branch 61f3c245, NOT main), Speak tutor
voices (`voiceRegistry.ts`, VOICE_MAP, `scripts/generate-voices.ts`), music generation
language support, and Script Lab (`lib/scriptlab/registry.ts`) for non-Roman scripts.
The investigation must establish which of these are **required** vs **optional tiers**
(a language can ship wizard-only without guided lessons or Speak, etc.) and encode that
tiering in the skill as explicit launch levels.

**B. Base/UI languages** (the language you learn *from*): the much bigger project.
Today `Locale = 'en' | 'de' | 'fr'` in `lib/translations.ts` (~1,400 keys per locale),
`LANGUAGE_TO_LOCALE` maps profile.base_language → UI locale (everything else falls back
to English), and all Script Lab / category / guided content carries `{en, de, fr}`
LocalizedText. Adding a base locale means: extending the Locale union and every content
type that embeds it, translating every key naturally (never literally), updating
`check:i18n` coverage rules, auditing fonts/rendering for the new script, and — for
Arabic/Hebrew — an RTL layout pass that does not exist yet. This is a separate,
larger effort; investigate and document it, write the skill, but do not attempt an RTL
locale as the first proof.

## Deliverables

1. `docs/Product/FABLE_LANGUAGE_ARCHITECTURE.md` — what "a language" is in this app:
   every touchpoint, required vs optional tiers, data flows (profile.base_language,
   deck.target_language, activeLanguage seeding), and known landmines.
2. `.claude/skills/add-target-language/SKILL.md` — the full recipe with launch tiers,
   verification (`npm run typecheck && npm run lint && npm run check:i18n` plus every
   relevant `test:*` script), and content-accuracy rules per language.
3. `.claude/skills/add-base-locale/SKILL.md` — the recipe for a new UI locale,
   including the type-level changes, translation-quality rules (native-natural, real
   diacritics, no machine-literal phrasing), and an explicit RTL-blocked note until the
   layout pass lands.
4. `.claude/skills/review-language-addition/SKILL.md` — the QA/review recipe: what a
   second agent checks after any language lands (coverage, naturalness spot checks by
   locale, capability-flag consistency, chunk-size regressions, i18n suite).
5. Proof: Russian added as a target language via the new skill, then the Russian
   alphabet added via `add-script-lab-language` — and both skills corrected with
   whatever the proof run taught.

## Constraints and principles (owner-set, standing)

- Work in `orchestrator/frontend`, commit directly to main, push with standard git.
- i18n is mandatory: en/de/fr for every new key, natural translations, real umlauts.
- No paid-API calls (ElevenLabs, image gen, Suno) without explicit owner approval; no
  Supabase schema changes without an explicit request. Audio/image asset batches are
  separate approved steps, never side effects.
- Don't touch generation/cards/video/Speak/payment flows beyond what a language entry
  requires; the Phase 1 stabilization layer (RPCs, quotas) is load-bearing — read, don't
  rework.
- Delegate broad scanning to Codex/subagents; personally read the decision-critical
  files; verify everything before claiming it (evidence before assertions).
- Update `memory/` (STATE, LOG, DECISIONS) after each work block, per AGENTS.md.
- Skills must be self-sufficient: assume the executing agent has NOT read this brief or
  the session history. Every skill names its exact files, commands, and failure modes.

## Open questions the investigation must answer (don't guess — verify in code)

- Which Supabase tables/columns store language values, and are they canonical English
  names ('Korean'), ISO codes ('ko'), or both? Where does canonicalization happen
  (`canonicalizeLanguageValue`) and what breaks when a new value appears?
- What exactly gates a language's appearance in: onboarding, the new-deck wizard, the
  landing page carousel, Speak, guided Today, Study tiles?
- What do the `api/` Vercel functions assume about language values (prompt templates,
  TTS language routing, translation endpoints)?
- Where are curriculum images sourced per language (set-c webp renders), and what is
  the story for a language with no image sets yet?
- What is the real cost floor per language tier (TTS batches, curriculum images), so
  the skill can state "tier X costs roughly Y and needs owner approval"?
