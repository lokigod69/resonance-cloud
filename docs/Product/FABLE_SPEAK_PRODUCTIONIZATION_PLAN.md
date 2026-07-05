# Speak Productionization Plan

Date: 2026-07-06 · Author: Fable 5
Scope: turn the test-lab Speak surface into a coherent production flow without rewriting it in one
pass, removing provider code, or breaking admin/testing use.

## What exists today (measured, not guessed)

Three providers exposed as a user-facing toggle (`ProviderToggle.tsx`: Live=Grok, Characters=Voxtral,
Voices=Gemini), each with its own wizard:

| Provider | Setup steps | Choice surface |
|---|---|---|
| Grok "Live" | voice → topic → level | 5 voices × (free chat + 8 categories) × 4 levels |
| Voxtral "Characters" | character → level | 28 characters (10 style tutors + 18 personas) over 96 raw voices, 8 languages |
| Gemini "Voices" | voice → personality → accent | 26 astronomy-named voices × 10 modes × 27 accents (theatrical now admin-only) |
| + Roleplay tab | category → scene → level | separate parallel wizard |

Language is already selected first (good — keep). Language constraints are ad hoc:
`fil`/`ceb` default to Gemini (`Speak.tsx:127-132`), `fil` disables Grok (`ProviderToggle.tsx:31`),
Voxtral has no fil/id/ko/ceb voices (`voiceRegistry.ts:125-127`).

Styling: the entire selection flow is hardcoded indigo/slate/gray (foreign palette); the
conversation screens are correctly tokenized. `GeminiAccentPicker.tsx` is dead code.

Prompt layer (`api/prompts/*`, `lib/grokPedagogy.ts`): genuinely good. Four-level pedagogy
(zero/beginner/intermediate/advanced) with language-mix ratios, "never ask to repeat",
model-don't-lecture correction policy, same-language enrichment mode, single-injection vibe tiers.
This is a strength to preserve, not a problem to fix.

## Target user model

A learner should make at most three decisions, all in learner vocabulary:

1. **Language** (already first — keep the flag grid)
2. **Who you talk to** — one unified "tutor card" grid, not a provider toggle
3. **How much help** — the existing 4-level picker (it's well-designed; keep verbatim)

Topic (free chat vs travel/food/…) and Roleplay become *optional* refinements inside the flow, not
parallel wizards.

### The core move: tutors, not providers

Replace the Live/Characters/Voices toggle with one curated **tutor registry** where each entry
internally binds provider + voice + personality:

```ts
// src/data/tutorCatalog.ts (new, client) — mirrored in api/ like existing twins
interface CatalogTutor {
  id: string                    // 'mia_warm', 'leo_live', ...
  displayName: string           // learner-facing name
  tagline: string               // "warm and patient", i18n key
  engine: 'grok' | 'voxtral' | 'gemini'   // NEVER shown in UI
  engineVoice: string           // grok voice id | mistral uuid | gemini voice name
  personalityModeId?: string    // gemini mode / voxtral character id
  languages: string[] | 'all'   // capability, drives filtering
  realtime: boolean             // Grok = live conversation badge ("Instant")
  order: number
}
```

Per language show **4–6 tutors**: 1 Grok live tutor (badged "Instant" — its differentiator is
latency, not the word "Grok"), 2–3 Voxtral characters where available (they have real voices per
language), 1–2 Gemini personalities for languages Voxtral lacks (fil/ceb/id/ko) and for the
distinctive vibes (Calm, Playful, Storyteller). Everything else stays in code, admin-visible via
`canUseExperimentalSpeakOptions` (already landed in `src/lib/speakCuration.ts`).

### Answers to the open product questions

- **What does a normal user see on Speak?** Flag grid → 4–6 tutor cards (name, tagline, play-sample
  button, "Instant" badge where realtime) → level picker → conversation. Optional "Topic" chip row
  (Free chat default + 4 curated topics) on the tutor screen; Roleplay becomes one more chip that
  opens the scene picker, not a top-level tab.
- **How many voices per provider/language?** 4–6 total tutors per language, not per provider.
  26 Gemini voices is a TTS engineer's list, not a learner's — curate to ≤2 per language.
- **Should provider names hide behind quality modes?** Hide provider names entirely. Don't invent
  "quality modes" either — the learner-meaningful distinction is *Instant conversation* (realtime
  Grok) vs *thoughtful voice messages* (turn-based Voxtral/Gemini). One badge communicates it.
- **Unsupported combinations?** The catalog's `languages` field makes broken combos unrepresentable
  in UI — replaces the scattered fil/ceb special cases with data. Keep the runtime guards as a
  second line of defense.
- **Accents?** Regional accents stay (collapsed, "experimental" label as today); theatrical are now
  admin-only (done). Longer term, accents only make sense for the language they mimic — scope the
  list to target language when the catalog lands.

## Beginner vs Advanced — prompts and UI

The 4-level pedagogy is right; do not collapse to 2 levels internally. In UI, keep the four cards
but consider grouping visually: "Starting out" (zero, beginner) / "Conversational" (intermediate,
advanced) if testers find four cards heavy. Level differences that must stay visible in UI copy:
language mix (70/30 → 50/50 → 80/20 → ~100%) is already well described by the level descriptions.

Prompt improvements (small, surgical — the philosophy is already correct):

1. **Unify the two pedagogy sources.** `lib/grokPedagogy.ts` is a hand-copy of
   `api/prompts/_shared/pedagogy.ts` (acknowledged in its header). Drift here silently forks the
   learning experience between Grok and non-Grok tutors. Either script-verify parity in CI or fold
   Grok onto the shared text at the next Grok touch.
2. **Correction-style consistency.** The corrections review (`api/voice-chat.ts:618`) should
   explicitly mirror the conversational rule ("model, don't lecture"): cap at the 3–5 most
   valuable corrections, ordered by usefulness, one-sentence explanations in the learner's base
   language, no meta-grammar terminology at zero/beginner.
3. **Respect emotional experience at zero level everywhere.** The generic greeting builder forces
   "end with a simple question" — good; ensure the Gemini vibe path (which deliberately loosens
   structure) still keeps zero-level greetings ≤3 short sentences. `gemini.ts` already gates the
   personality-drift line by level — extend the same gating to greeting length.
4. **No over-correction guardrail is present and good** (zero level: "do not correct mistakes").
   Keep it through any refactor; it is the single most Duolingo-differentiating line in the system.

## History, study words, extracted words, corrections

- History: keep the panel but demote — one clock icon in the conversation header (as now), and
  surface "continue last conversation" as a card on the tutor screen instead of auto-opening panels.
- Extract-words → deck is a genuinely differentiating loop (conversation → SRS deck). Keep the
  post-conversation EndConversationScreen as the primary exposure; it's already well-placed.
- Corrections ("📝 review") stays opt-in per conversation — correct choice, keep.
- Study-mode toggle (practice deck words in conversation) is a power feature; move it from the
  header icon row into the level screen (it's a session-scoped learning choice, not a toolbar knob).

## Visual re-skin (can ship independently of the catalog)

Mechanical palette translation in `ProviderToggle` (until removed), `GrokPicker`,
`GeminiModeVoicePicker`, `CharacterGrid`, `EndConversationScreen`:

| From (hardcoded) | To (token) |
|---|---|
| `bg-indigo-500` CTAs | `speak-accent-action` / `var(--accent)` |
| `border-indigo-200/*`, indigo rgba shadows | `var(--border-strong)` + `var(--accent-glow)` |
| `bg-slate-950/60`, `bg-slate-800/65` | `var(--surface-glass)` / `var(--surface-glass-strong)` |
| `text-slate-400`, `text-gray-400` | `var(--text-muted)` |
| `text-white` | `var(--text-primary)` |
| selected-state indigo tint | `var(--accent-soft)` + `var(--accent)` ring |

The conversation screens already do this correctly — copy their vocabulary. `speak-glass-card` in
`index.css` should become the single card primitive for all picker cards.

## Phasing (each phase shippable alone)

1. **Phase 0 (done this pass):** theatrical accents admin-gated; `speakCuration.ts` flag home.
2. **Phase 1 — re-skin:** palette translation above. No behavior change, pure CSS-class edits.
   Risk: low. ~1 session.
3. **Phase 2 — curation without new architecture:** cap visible Gemini voices to a curated subset
   per language; cap CharacterGrid to the 10 style tutors for non-admins (personas admin-only);
   fold Roleplay tab into a chip. Uses `speakCuration.ts` only. Risk: low-medium. ~1 session.
4. **Phase 3 — tutor catalog:** introduce `tutorCatalog.ts` + api twin, replace ProviderToggle with
   tutor cards, move fil/ceb constraints into data. Keep all provider code untouched underneath.
   Risk: medium. 1–2 sessions + QA per language.
5. **Phase 4 — prompt consolidation:** pedagogy single-sourcing + corrections-style alignment.

Constraint compliance: no provider code removed; admin retains full matrix via role flag; no
Supabase schema, no generation RPCs, no Stripe/iOS; nothing rewritten wholesale.
