# Study & Card Rendering Coherence Plan

Date: 2026-07-06 · Author: Fable 5
Basis: dedicated file-level audit of all seven study surfaces + deck-card reference comparison.
Goal: Study should feel like the deck library — calm, dark-glass, token-driven — with one visual
grammar for cards whether they carry an image or not.

## Current architecture (the honest map)

| Mode | Files | Shape |
|---|---|---|
| Video study (deprecated UX) | `Study.tsx` + `StudyPG.tsx` | duplicated pair, ~90% identical |
| Image study | `StudyImage.tsx` + `StudyImagePG.tsx` | duplicated pair, ~90% identical |
| Flashcard | `StudyFlashcard.tsx` | single file, both skins, skin-blind chrome |
| Audio | `StudyAudio.tsx` | single file, both skins, skin-blind chrome |
| Canvas | `StudyCanvas.tsx` + canvas components | headerless immersion mode, own system |
| Mode selector | `StudyModeSelector.tsx` | single file |
| Word video deep-link | `VideoPlayer.tsx` | full-screen, zero i18n, video-era |

Four files (`Study`, `StudyPG`, `StudyImage`, `StudyImagePG`) implement what is one component in a
2×2 matrix (skin × media). Logic drift between the copies is real, not hypothetical — the
alt-text reveal gating existed in one of four before this pass (now unified).

## The reference pattern (write once, reuse)

From Decks/DecksPG, the agreed premium card language:
- classic: `.theme-card` — `var(--surface-1)`, `var(--border-subtle)`, hover `var(--accent-glow)`
- glassy: `.pg-glass` — blur(20px), layered three-side borders, `var(--pg-glass-shadow)`
- radius: `rounded-2xl`, zero inline styles, zero hex literals

## Plan

### Phase 1 — one card chrome (highest visible payoff)
Give `StudyFlashcard.tsx:289,319` and `StudyAudio.tsx:244` the reference chrome instead of flat
`border-[hsl(var(--border))] bg-[hsl(var(--card))]/50 backdrop-blur-sm`. Cheapest correct move:
a `StudyCardFrame` component (~30 lines) that applies `.theme-card` vs `.pg-glass` by `useSkin()`,
used by flashcard, audio, and (when consolidated) image study. This alone removes the "earlier
generation component" feel sitting right next to premium deck cards.

Also unify the session-header: flashcard shows `computeStudyProgress` "current / total", audio
shows raw `currentIndex+1 / words.length`, video/image show only `QueueIndicator`. Pick one:
QueueIndicator + "n of m" in one place, same typography, all modes.

### Phase 2 — text-card vs image-card grammar
Rules to enforce (today each is violated somewhere):
1. **Same silhouette:** every card face is an `aspect-video rounded-2xl` frame regardless of
   content type. `ImagelessCard` already does this — make it the text-face inside the same frame
   the image face uses, instead of a structurally different tree (`StudyFlashcard.tsx:291-312`).
2. **Same media fit:** `object-contain` everywhere (unified for Study/StudyPG this pass; audit
   DeckView modals when touched).
3. **One fallback:** missing image → the OrbDock-style glass gradient (landed this pass), never
   `bg-muted` in one skin and `bg-gradient-to-br from-card` in the other
   (`Study.tsx:209` vs `StudyPG.tsx:215`).
4. **Reveal semantics identical:** alt text gated on reveal (done for video/image modes);
   flashcard back-face translation/IPA placement should match the reveal block of image mode.
5. **Fix the lying props:** `ImagelessCard` declares `translation`, `ipa`, `revealed` and renders
   none of them (`components/study/ImagelessCard.tsx:13-17`). Either render translation on reveal
   (preferred — it makes text cards self-contained) or strip the props. Touches
   `ImagelessCardViewerModal` + `StudyFlashcard` call sites; small but multi-file, do deliberately.

### Phase 3 — status & empty-state language model
One vocabulary, four states, every mode:

| State | Pattern | Copy style |
|---|---|---|
| Loading | `LingwaveLoader` + `study.loadingCards` | already uniform (Canvas fixed this pass) |
| Empty (no cards) | icon + one sentence + ONE forward CTA | "generate" family for card modes; audio's back-to-modes exception is fine (needs a song) but restyle identically |
| In-session soft error | inline muted line (audio's `study.audioUnavailable` is the model) | never a toast, never silent — image modes currently fail silent; add the same inline line on `imgError` |
| Session complete | one `SessionComplete` component: check, stats (remembered = `--pg-accent-green`/`--success`, review = `--pg-accent-gold`), restart + back | today four near-copies with per-file drift |

Extract `SessionComplete` once — it's currently the most duplicated block in the study family and
the place stat-color drift keeps reappearing (fixed `#fb923c` twice this pass).

### Phase 4 — consolidate the 2×2 (code health, post-beta acceptable)
Merge `Study/StudyPG/StudyImage/StudyImagePG` into one `StudySession` page parameterized by
`mediaKind` + `useSkin()`, following the flashcard/audio single-file pattern (which was already the
right instinct). Do this *after* the deprecated video mode's fate is settled by the video-deprecation
pass, so we don't consolidate a mode that's about to be hidden. Until then: any fix must be applied
to all four files — treat that as a standing review rule.

### Deliberately out of scope here
- `VideoPlayer.tsx` i18n + styling: owned by the concurrent video-deprecation effort; if it
  survives as a deck deep-link, it needs full i18n (6 raw strings) and the Phase 1 chrome.
- Canvas modes: internally consistent immersion system; leave alone for beta.

## What Study should feel like (design north star)

Open Study → one calm screen, five tiles in deck-glass, no locked doors up front. Pick a mode →
the card sits centered in the same glass frame the library uses, one progress whisper top-right,
vermillion only on the primary action, gold only for "worth reviewing". Completion is one quiet
screen that celebrates without confetti-noise: what you kept, what wants another look, one button
forward. Nothing flashes, nothing is cyan, nothing says "Loading…" in English to a German user.

## Already landed in this pass
i18n fix (Canvas), cyan accent fallback (Audio), rainbow orbs → glass (OrbDock), `#fb923c` →
`--pg-accent-gold` (2×), alt-reveal + object-fit parity (Study/StudyPG). Verified: typecheck,
eslint (changed files), check:i18n.
