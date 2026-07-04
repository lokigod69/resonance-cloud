# MOTION_SPEC.md — motion choreography

One principle: **scroll is the playhead; the ocean is the stage.** Continuous ambient motion
runs on the single canvas; DOM elements get discrete, scrub-linked or once-only reveals.

## Global grammar

- Signature easing: `cubic-bezier(0.66, 0, 0.01, 1)` ("tide curve"), 0.66s — all section
  headline/content reveals.
- Support easings: `cubic-bezier(0.25, 1, 0.5, 1)` (easeOutQuint) for card entrances,
  `easeInOut` sine-like for ambient loops.
- Duration ladder: micro .15–.2s (hover, focus) · UI .3–.5s (card hover lift) ·
  section .66–1s (reveals) · ambient 3–12s (glow breathing, drift).
- Scrub smoothing: framer-motion `useScroll` + `useSpring(progress, { stiffness: 90,
  damping: 28 })` — the weighted, premium feel without Lenis/scroll-hijack. Native scroll
  everywhere.
- Reveals fire once (`viewport: { once: true }`), threshold ~20%.

## Hero wave behavior (WaveField = LingwaveWaves + extensions)

- Base: existing 5-term swell field, unchanged palette and projection.
- **Pointer wind**: pointer x/y feeds a smoothed (lerp 0.06/frame) wind center; swell
  amplitude gains up to +22% within a ~38% viewport-radius falloff around it. The sea leans
  toward the cursor — subliminal, not a spotlight.
- **Wake ripples**: pointer-move spawns the existing `WaveRipple` wavetrain, throttled to ≥1
  per 260ms and ≥64px travel, at 40% of tap amplitude. Tap/click keeps full-strength ripple.
- **Scroll coupling**: hero scroll progress (0 at top → 1 at one viewport) drives camera
  height 3.2→2.55 and time-speed ×1→×1.35 — the sea rises to meet you as the headline lifts
  away. Canvas is fixed for the hero and released (fades under `--app-bg` gradient) after.
- **Dawn uniform** (0→1): blends horizon glow strength ×1→×2.2 and star alpha ×1→×0.3;
  0 in hero, 1 in FinalCTA.
- Performance: DPR ≤ 1.75, rAF paused when tab hidden AND when canvas fully offscreen
  (IntersectionObserver); mobile: pointer wind off (no hover), tap ripple stays.

## Headline reveal (hero)

Per-word staged arrival — language coming into focus: each display word animates
`opacity 0→1, y 26→0, blur 6px→0` on the tide curve, staggered 90ms; the "by melody / and
motion" whisper lines fade in after at 0.4 white. CTA + pill last (+0.35s). No character
shatter — words stay whole (we teach words, not letters).

## Floating words (hero) — buoys, not confetti

Words from `DRIFT_PHRASES` ride the actual field: each word owns (worldX, z, depth); per
frame `y += -waveHeight(worldX, z, t)/AMP * 14px * depth` and `rotate = slope · 5°`
(clamped ±6°) — same math as study WaveCanvas. Slow 12s opacity breathing 0.25→0.6.
Desktop 9 words, mobile 4. They sit BELOW the headline layer, above the canvas.

## Scroll-linked chapters (TideStory) — word → song → scene → conversation

Sticky stage: section `340vh`, inner `100vh` sticky. `useScroll({ target, offset:
['start start','end end'] })` + spring. Four beats on the scrubbed 0→1:

- 0.00–0.10 — chapter intro: mono index `01 — ONE WORD` + the seed word card rises from the
  waterline (y 60vh→center, blur out).
- 0.10–0.35 — **Song**: waveform bars (WaveformDivider language) grow from the wave's crest
  line under the word; bars scale with scrub, gold tips. Mono lyric line types in.
- 0.35–0.65 — **Scene**: the word card blooms into an image card (scale 0.92→1, image
  crossfade), two echo cards fan ±16° behind it.
- 0.65–0.92 — **Conversation**: chat bubbles slide in alternating sides (spring), IPA mono
  under the target word.
- 0.92–1.00 — exit: all elements sink 8vh + fade as the rail approaches.

Each beat's elements transform on scrub (interruptible, reversible). Copy per beat is a
`t()` key. Mobile/reduced-motion: the sticky rig is replaced by four stacked static panels
with once-only fade-ups.

## Horizontal card rail (CreatorRail)

- Desktop: section `260vh`, sticky inner; scrub maps 0→1 to rail `translateX(0 → -(railWidth
  - viewport + padding))`. ~14 cards.
- **The rail floats**: each card gets `translateY = -waveHeight(worldX(cardScreenX), z_i, t)
  / AMP * 12px` and tilt = slope·4° (clamped ±5°), computed in one rAF that also advances t —
  the rail visibly rides the same ocean. Cards near viewport center scale 1.0, edges 0.94.
- Hover: lift −6px over 0.3s easeOutQuint, tilt→0, gold ring, glow; neighbor cards unaffected
  (no magnetic gimmick).
- Mobile: native `overflow-x-auto` + `scroll-snap-x mandatory`, bobbing continues (cheap,
  transform-only), no scrub.

## Mode portals & memory section

- Portals: 5 cards, once-only stagger (60ms) fade-up on tide curve; hover: border warms,
  inner radial `--accent-glow` breathes in 3s, icon nudges 2px. No tilt.
- MemoryMechanic: single centered statement with per-word reveal; the three words
  *melody / motion / meaning* get their `hero-word-*` gradient treatments.

## Final CTA

Wave canvas returns (second, IO-gated instance) with `dawn = 1` — the sea brighter, star
field faded, crest glints denser. Headline reveal on tide curve; CTA glow breathing 3s.
Footer plain.

## Cursor

No custom cursor sprite. Cursor presence is expressed through the water (wind + wake).
Interactive elements keep native cursor + focus-visible rings.

## Reduced-motion fallback (design, not disabling)

`prefers-reduced-motion`: canvas renders one still frame (existing behavior); sticky rigs
swap to stacked static layouts; reveals become simple 0.3s opacity fades; rail becomes a
static grid (desktop) / snap scroller without bob (mobile); no ripples, wind, glow pulses,
or auto-playing loops. Every section must be fully legible in this mode.

## Performance budget

- Per visible viewport: at most one heavy canvas loop plus one lightweight transform-only
  loop (hero: canvas + floating-word buoys; rail: buoy loop only). Every loop is
  IntersectionObserver-gated and pauses on hidden tabs; the second canvas instance only
  mounts at FinalCTA via IO.
- JS added to the landing route ≤ ~25KB gzip; zero new dependencies.
- 60fps target on a mid laptop; if frame time > 24ms averaged over 60 frames, the canvas
  self-degrades (ROWS 64→44, stars 110→60) — degrade quality before smoothness.
- Images: `loading="lazy"` + `decoding="async"` off-hero; card thumbs ~≤60KB each.
- `will-change: transform` only on rail cards and sticky stages while active.
- CLS 0: sticky stages have fixed vh sizes; no layout-affecting animations.
