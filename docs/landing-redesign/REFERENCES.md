# REFERENCES.md — Interaction DNA extraction

Teardown of the two reference sites for the Lingwave landing redesign, plus an audit of the
current page. Nothing is copied — these are observed principles, translated into Lingwave's
own identity. Findings come from the shipped HTML/CSS/JS bundles (curl + grep, minified but
readable: easing literals, GSAP/Lenis config, shader source) and a content read of each page.
Both sites are client-rendered WebGL experiences, so runtime motion is inferred, not recorded.

---

## 1. haoqi.design — the design-engineering voice

Portfolio of Haoqi Wen. Next.js (App Router) + Tailwind v4, Lenis smooth scroll
(`lerp: 0.1`), an OGL fullscreen-triangle shader background, framer-motion micro-motion,
native View Transitions, WebGPU progressive-enhancement branch.

**What makes it feel expensive**

- Restraint as the flex: one sans (TikTok Sans) + monospace chrome (Departure Mono for the
  HUD/timestamps). Exactly three tracking values (−0.025em / 0 / +0.025em). Radii capped at
  0.75rem.
- One signature easing everywhere: `cubic-bezier(0.66, 0, 0.01, 1)` paired with `.66s` —
  slow-in, violent-out, the "expensive reveal" curve. Duration ladder: micro .15–.3s,
  medium .5–.66s, section 1–1.2s, ambient 12s.
- Craft lives in the *chrome*: live GMT+8 clock, X/Y cursor coordinate readout, opt-in
  `/bgm.mp3` sound toggle (off by default), honest RGB-triple theme tokens with a real
  light/dark toggle.
- Reduced motion is a first-class branch (`prefers-reduced-motion` ×8), reveals via
  IntersectionObserver, idle work via requestIdleCallback, DPR clamped, heavy WebGL
  code-split away from the shell.

**Borrow** — the single signature easing + duration ladder; sans+mono type discipline
(mono = "system chrome": phonetics, section indices, language codes — perfect for a language
app); quiet ambient shader background that never shouts; opt-in sensory extras; reduced-motion
rigor.

**Do not borrow** — the portfolio structure, the HUD styling itself, the TikTok Sans /
Departure Mono fonts, the light theme (Lingwave landing is night-sea by identity).

## 2. oryzo.ai — the cinematic voice

Lusion's satirical Apple-keynote scroll story for a fictional AI cork coaster. Astro static
shell + one ~1 MB Three.js island: 99 ShaderMaterials, bloom ×76, fog ×59, instanced
particles, GSAP + SplitText (×176), scrub-linked scroll with horizontal sections and snap.

**What makes it feel cinematic**

- The page is staged like a film: scrubbed scroll progress drives the scene; chapters snap;
  one section scrolls horizontally. Nothing plays on a timer — the viewer's thumb is the
  playhead.
- Every headline assembles per-character/word (SplitText) — text *arriving* is the dominant
  text motion.
- Post-processing grade: bloom for glow, fog for depth, warm amber-on-black
  (#e07010/#ffa000/#ffbf02 on #000) that reads as studio lighting. Serif display (Literata) +
  mono body (DM Mono) borrow academic authority.
- Pacing hierarchy: 3s ambient loops under 1s section transitions under sub-200ms micro
  interactions. `will-change` ×63 (aggressive but deliberate), DPR clamped, lazy imagery,
  hero motion as .webm + .webp stills instead of raw video.

**Borrow** — scroll-as-playhead (scrub-linked chapter choreography); per-token text reveals
(words coming into focus *is* language learning — thematically perfect for us); glow+haze
atmosphere as a grade, not decoration; the pacing hierarchy; static shell + one isolated
heavy-motion island.

**Do not borrow** — Three.js/WebGL (our Canvas-2D swell field already delivers the
atmosphere at a fraction of the payload); the satire tone; serif academia; locked viewport
scaling; horizontal *native* scrolling on desktop (we scrub transforms instead).

## 3. The current Lingwave landing — what already exists

- `LingwaveWaves` (Canvas 2D, 347 lines, zero deps): perspective-projected 5-term sine swell
  field, plum→rose→vermillion→gold color ramp, star field, horizon glow, crest glints,
  vignette, tap-ripple wavetrains, DPR clamp, visibility pause, reduced-motion still frame.
  This is genuinely good and stays as the engine.
- `WaveCanvas` (study mode) proves the richer vocabulary already exists in-product: cards ride
  the *same* `waveHeight` field as glass buoys with slope-derived tilt, spray/foam particles,
  tap-swells that lift cards as the front passes, WebAudio micro-sounds (660 Hz hover ping,
  rising D5→A5 on success), mastery = gold crest.
- Weaknesses of the current page: the hero wave and the sections below it are visually
  disconnected (wave ends, generic glass cards begin); floating words drift on their own
  layer, not on the water; the card gallery is a conventional grid/disperse; six sections of
  similar weight with no single climax; no mono/system typographic layer; the signature
  interaction (tap ripple) is undiscoverable and unused by the rest of the page.

## 4. Translation into Lingwave

One sentence: **haoqi's discipline + oryzo's staging, played entirely on Lingwave's own
instrument — the wave field.**

- The ocean is the page. Every section is a phase of the same tide, not a new backdrop.
  The `waveHeight` math becomes shared physics: hero words, the card rail, the waveform
  bars and the final CTA all ride the same swell.
- Scroll is the playhead (oryzo), but the scenes are ours: word → song → scene →
  conversation, rising from the water.
- One easing voice (haoqi): `cubic-bezier(0.66, 0, 0.01, 1)` at .66s for section reveals,
  with the micro/UI/section/ambient ladder.
- Mono chrome for the "engineered" layer: IPA phonetics, chapter indices (01 — SONG),
  language codes. Serifs and new display fonts are *not* introduced.
- Cinematic grade via the existing palette: vermillion/gold glow on near-black, haze via
  existing gradient fades — no WebGL, no bloom pass, no new dependencies.
- Reduced motion: every choreographed section has a designed static layout, not a broken one.
