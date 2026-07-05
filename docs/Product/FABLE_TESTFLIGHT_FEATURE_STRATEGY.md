# TestFlight Feature Strategy

Date: 2026-07-06 · Author: Fable 5
Question answered: what do the first private-beta testers see, what stays hidden, what gets built
next — optimizing for "one premium product" over feature count.

## Strategic frame

Lingwave's differentiation vs Duolingo is not volume of exercises; it is *taste*: a guided daily
spine, music as memory, a tutor that talks like a person, and an SRS engine that respects you (no
streak-shaming, no popup carnival). First testers should meet exactly that story, in that order.
Every additional visible system dilutes the impression and multiplies bug surface.

## Expose (the beta storyline)

1. **Guided Today as the spine — lead with it.** Dashboard already leads with the daily mission
   (correct). Bright / Wistful / Sharp as the three launch vibes; the vibe picker is a
   differentiator, keep it prominent. Yes to the open question: **guided path before free
   generation** — generation is the reward for engaging, not the front door. Learning-science
   backing: novices need structured input and low decision load (guided), self-determination needs
   meaningful choice (vibes give choice without load).
2. **Decks + Study (flashcard, image, audio)** — the retention loop. Audio study is quietly special
   (song-based recall); make sure at least one starter deck per language has audio so testers meet it.
3. **Speak, curated** — after the Phase 1–2 plan lands: one tutor grid, four levels, extract-words
   loop. Speak is the "wow, this isn't Duolingo" moment; it must not look like a lab bench.
4. **Music page** — the songs are brand essence. Expose listening; treat it as the trophy shelf of
   the guided path.
5. **One or two canvas modes** (Wave especially — on-brand) as "focus modes", not five.

## Hide for beta (all reversible via flags, no code deletion)

| What | How | Why |
|---|---|---|
| Video study mode + video generation UX | already deprecated; concurrent pass is executing | dead-end feature; backend stays |
| Voxtral persona characters (18) + Gemini voice long-tail | `speakCuration.ts` role gate (pattern landed) | choice overload; admins keep full matrix |
| Theatrical accents | **done this pass** (admin-only) | novelty reads as toy in a premium first impression |
| Landing experiment routes `/a` `/b` `/landing*` | remove routes or gate | scaffolding visible to the public |
| Coming-soon tiles (games, runner, study games row) | `RUNNER_GAME_ROUTE_ENABLED` pattern / reorder to end | locked doors on day one read as unfinished |
| Classic skin | default+lock testers to glassy; keep toggle for admins | halves the coherence surface instantly |
| Admin/observability | already gated ✅ | — |

## Defer (post-beta, keep on roadmap)

- Classic-skin re-skin or retirement decision (retire is my recommendation — one skin, one soul).
- Study 2×2 file consolidation (after video-mode fate settles).
- GeneratePG visual overhaul (only reachable via classic skin → moot if glassy-only).
- More games; runner stays flagged off.
- Provider abstraction / tutor catalog Phase 3+ if Phase 2 curation tests well.

## Languages: depth over breadth — with one nuance

Recommendation: **depth in the guided languages** (the set with full Guided Today paths + static
TTS + starter decks) and keep the long tail available only in free generation + Speak where it
already works. Rationale: a tester who picks Korean and finds 3 of 7 surfaces empty concludes "the
app is thin", even if German is deep. Beta invites should steer testers to the 3–5 deepest
languages; the language strip can show more, but badge guided-ready languages ("Guided path
available") so expectations are set by the UI, not by disappointment. Post-beta, widen guided
coverage language by language — the static-TTS pipeline you've built makes that a content problem,
not an engineering one.

## What makes it feel special without bloating scope (ranked, cheap→rich)

1. **Motion discipline** — one entrance animation vocabulary (the wave/loader is already there);
   kill remaining spring-pop inconsistencies. Cost: near zero, done during re-skins.
2. **The conversation→deck loop** (extract words after Speak) — already built; just make the
   EndConversation screen beautiful and make imported decks visibly land in the library.
3. **Song trophies in Today** — already built; surface completed trophies on the dashboard shelf.
4. **"Instant" live tutor badge** — realtime conversation is technically hard and testers should
   feel that magic; one badge, no provider jargon.
5. **A tiny "why this works" layer** — one-line learning-science whispers at the right moments
   ("Recalling before revealing is what makes it stick") — premium apps teach their method.
   Cost: copy + i18n only. Do sparingly: max one whisper per session.

## Popup/pressure policy (anti-Duolingo stance, make it explicit)

- No interstitial upsells, no guilt streaks, no lives/hearts, no double-or-nothing.
- One system for transient messages (existing toasts), one for confirmations (existing dialogs);
  nothing auto-opens panels on page entry.
- Streaks stay quiet-informative (current dashboard treatment is right); never modal.
- Beta banner on Today: replace leftover test copy with one honest sentence and a feedback link.

## Answers to the remaining open questions (consolidated)

- **Pages most urgently needing visual alignment with home/landing:** Speak selection flow (1),
  Study card chrome (2), StudyModeSelector accents (3), DeckViewPG stray dark panels (4),
  GeneratePG only if classic ships.
- **Features confusing enough to hide from first testers:** provider toggle & the 26-voice Gemini
  list, persona character wall, theatrical accents (hidden), roleplay as a parallel top-level
  wizard (fold into a chip), coming-soon game tiles, video-era surfaces.
- **How to feel creative & premium without clutter:** every creative element (vibes, songs,
  characters, canvas) appears at exactly one intentional moment inside the spine instead of as a
  menu of toggles. Curation *is* the luxury: fewer, better choices, presented calmly.

## Suggested next agent prompts

1. "Execute Speak Phase 1 re-skin per FABLE_SPEAK_PRODUCTIONIZATION_PLAN.md §Visual re-skin —
   palette translation only, no behavior change; verify typecheck/lint/i18n + before/after
   screenshots of all three picker steps."
2. "Execute Speak Phase 2 curation: cap Gemini voices to curated per-language subset, gate persona
   characters via speakCuration.ts, fold Roleplay into a topic chip; update api/ twins in the same
   commit."
3. "Extract SessionComplete + StudyCardFrame per FABLE_STUDY_AND_CARD_RENDERING_COHERENCE_PLAN.md
   Phases 1+3; apply to flashcard/audio/image/video modes; verify all four modes across both skins."
4. "Gate/remove landing experiment routes and reorder coming-soon tiles; add `--success/--warning/
   --danger` tokens to theme-contract.css and sweep Today step components."
5. (After video-deprecation pass merges) "Consolidate Study/StudyPG/StudyImage/StudyImagePG into
   one StudySession per coherence plan Phase 4."
