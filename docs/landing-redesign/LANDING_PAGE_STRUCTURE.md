# LANDING_PAGE_STRUCTURE.md — section-by-section plan

Note on framework: the prompts said "Next.js"; the live app is **React 19 + Vite + React
Router** (`orchestrator/frontend`). The plan targets the real stack. Route stays `/`
(`LandingPage`, lazy, inside `PublicRoute`).

The page is one continuous night sea. Seven beats, one climax (TideStory), one breath
between each. Copy below is the English source; every string ships in en/de/fr via
`useLandingLocale` keys under `landing.*`.

## 0. Header (fixed, unchanged shell)

Logo wordmark · Sign in pill → `/login`. Backdrop-blur black/30. Add one mono detail on
md+: detected locale pair, e.g. `EN · DE · FR` (`landing.localeChip` not needed — static).

## 1. LandingHero — the living water (100vh + 25vh handoff)

- WaveField canvas (fixed, full viewport): pointer wind, wake ripples, tap ripples, scroll
  coupling. The interactive sea IS the hero image.
- FloatingWords: 9 (mobile 4) multilingual words riding the swell as buoys.
- Headline (kept, re-choreographed): **Memories** / by / **melody** / and / **motion** —
  per-word tide-curve arrival with blur-out; existing `hero-word-warm/mid/cool` gradients.
- Sub: existing `landing.subheadlineMain`.
- Mono beta pill + primary CTA (`landing.heroCta` → `/login`), scroll cue chevron.
- Components: `LandingHero.tsx`, `WaveField.tsx` (extends LingwaveWaves), `FloatingWords.tsx`.

## 2. TideStory — one word becomes song, scene, conversation (340vh sticky)

The climax. Mono chapter indices, scrubbed beats (timings in MOTION_SPEC):

1. `01 — WORD` seed card rises from the waterline. Copy: "It starts with one word."
   (`landing.tideWordTitle/Desc`) — seed word: *erinnern* (DE, "to remember") echoing the
   existing DRIFT_PHRASES motif.
2. `02 — SONG` waveform bars grow from the crest line; lyric line in mono.
   ("Lingwave writes it into a song you can't shake." `landing.tideSongTitle/Desc`)
3. `03 — SCENE` the card blooms into an AI image card + two echo cards.
   ("Then paints it into a scene you can see." `landing.tideSceneTitle/Desc`)
4. `04 — CONVERSATION` chat bubbles (target language + IPA mono).
   ("Then speaks it with you, until it's yours." `landing.tideTalkTitle/Desc`)

- Mobile/reduced-motion: four stacked panels, same content, once-only fades.
- Components: `TideStory.tsx` (+ internal beat subcomponents). Replaces ScrollStorySection +
  HowItWorksSection + VoiceTutorSection (the phone mock becomes beat 04's bubbles).

## 3. CreatorRail — the memory shelf (260vh sticky → horizontal)

- Intro line: "Every word you learn becomes something you made." (`landing.railHeading`,
  `landing.railSub`).
- ~14 vocabulary image cards from `landingData.ts` DEMO_WORDS (plus 2 gold "mastered"
  crest cards), scrub-driven horizontal travel, bobbing on the shared wave field.
- Card anatomy per DESIGN_SYSTEM (image, word, translation, IPA mono, lang chip).
- Mobile: snap scroller with bob.
- Component: `CreatorRail.tsx`.

## 4. ModePortals — five ways in (auto height)

Condensed from FeatureConstellation's 6 cards to 5 portals: Guided lessons · Decks & SRS ·
Speak (voice tutor) · Music videos · Games. Asymmetric layout (2 large + 3 small, not a
uniform grid). Each portal: icon, title, one line, quiet glass, warm hover glow.
Keys: reuse existing `landing.feature*` where the copy fits; new `landing.portal*` where not.
Component: `ModePortals.tsx`.

## 5. MemoryMechanic — why it sticks (short, ~60vh)

One centered statement, per-word reveal: "Melody carries memory. Motion makes it vivid.
Meaning makes it yours." (`landing.memoryLine1/2/3`) + two mono footnote-style supports
(dual-coding / spaced repetition, `landing.memoryNote1/2`). No cards, no icons — a breath
of pure typography between the portals and the finale.
Component: `MemoryMechanicSection.tsx`.

## 6. LanguagesTide — the marquee (kept, restyled)

Existing two-row greeting marquee + flag grid, restyled: marquee words get wave-ramp colors
(plum→gold by row position), grid tightened. Keys unchanged. Component: keep
`LanguagesSection.tsx` with styling pass.

## 7. FinalCTA — the sea at dawn (100vh-ish)

Second WaveField instance (IO-gated) with `dawn=1`. "Your words are waiting."
(`landing.ctaHeading` reuse/rewrite) + CTA → `/login?mode=signup` + footer (legal links,
Deep Blue Dodo LLC line — unchanged). Component: `FinalCTA.tsx` replacing CtaFooterSection's
hero half, footer markup preserved.

## Content hierarchy summary

Hero promise → proof-by-transformation (TideStory) → the artifact gallery (CreatorRail) →
product surface area (ModePortals) → credibility (MemoryMechanic) → breadth (Languages) →
ask (FinalCTA). One glowing CTA at each end, none in between.

## Components needed (new/changed)

| Component | Status |
|---|---|
| `WaveField.tsx` (branding) | new — wraps/extends LingwaveWaves engine with wind/wake/scroll/dawn |
| `LandingHero.tsx` | new (replaces HeroSection) |
| `FloatingWords.tsx` | new (replaces MultilingualDrift) |
| `TideStory.tsx` | new (replaces ScrollStorySection, HowItWorksSection, VoiceTutorSection) |
| `CreatorRail.tsx` | new (replaces DemoReelSection) |
| `ModePortals.tsx` | new (replaces FeatureConstellation) |
| `MemoryMechanicSection.tsx` | new |
| `LanguagesSection.tsx` | keep + restyle |
| `FinalCTA.tsx` | new (replaces CtaFooterSection, keeps footer markup) |
| `LandingPage.tsx` | rewritten composition |

Old components stay on disk until the new page passes checks, then the unused ones are
removed in the same change (they are only imported by LandingPage).

## Implementation notes (Vite/React)

- All new components under `src/components/landing/`, code-split with the existing lazy
  landing route — no impact on app shell.
- Shared wave math extracted to `src/lib/waveField.ts` (waveHeight, slope, ramp) so
  LingwaveWaves, WaveCanvas (study) and the rail import one source of truth. LingwaveWaves'
  public API stays backward-compatible (dashboard/study/login untouched).
- framer-motion only for DOM; canvas stays vanilla rAF.
- i18n: every new key in en + de + fr in `src/lib/translations.ts` (German with real
  umlauts); `npm run check:i18n` must pass.
