# APPROVED_DIRECTION.md — locked design direction

**"The Tide of Memory."** One continuous night sea; every section is a phase of the same
tide. The existing 5-term `waveHeight` field becomes the shared physics of the entire page —
hero words, story beats, the card rail and the finale all ride one ocean.

- **Core visual metaphor**: language as water — plum deep (unknown) → rose mid-water
  (learning) → vermillion swell (alive) → gold crest (mastered). Learning = rising from the
  sea; the page ends at dawn.
- **Hero behavior**: the interactive sea is the hero image. Pointer wind bends the swell,
  pointer-move leaves wake ripples, tap rolls a full wavetrain; scroll raises the sea as the
  headline (per-word tide-curve arrival) lifts away. Floating multilingual words ride the
  actual wave as buoys.
- **Scroll story**: one sticky scrubbed chapter (TideStory, 340vh) — 01 WORD rises from the
  waterline → 02 SONG (waveform bars grow from the crest) → 03 SCENE (card blooms into
  imagery) → 04 CONVERSATION (bubbles + IPA). Scroll is the playhead; fully reversible.
- **Card/gallery behavior**: CreatorRail — a scrub-driven horizontal shelf of real vocabulary
  cards that bob and tilt on the shared wave field; gold crest cards mark mastery. Mobile:
  native snap scroll, bob kept.
- **Section structure**: Hero → TideStory → CreatorRail → ModePortals (5, asymmetric) →
  MemoryMechanic (pure typography beat) → Languages marquee (restyled) → FinalCTA at dawn.
- **Intentionally NOT doing**: WebGL/three.js, GSAP, Lenis/scroll-hijack, custom cursor
  sprite, SplitText character shatter, light theme, uniform feature grids, testimonials/logo
  walls, sound-on-by-default (sound layer deferred entirely), new fonts, new dependencies.
- **Performance constraints**: ≤1 live rAF per viewport, DPR ≤1.75, self-degrading canvas
  quality, ≤~25KB gzip added JS, once-only DOM reveals, designed reduced-motion and mobile
  fallbacks, CLS 0.

Deviations from the original prompts, and why: framework is Vite/React (not Next.js) because
that is the real app; no new animation libraries because framer-motion 12 + the existing
Canvas-2D engine already cover every specified behavior at lower payload; the voice-tutor
phone mockup is folded into TideStory beat 04 so the page keeps one climax instead of six
equal sections.
