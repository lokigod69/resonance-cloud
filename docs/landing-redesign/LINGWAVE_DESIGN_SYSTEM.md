# LINGWAVE_DESIGN_SYSTEM.md — landing visual system

The landing speaks the cosmos theme (`src/themes/cosmos.css`), tightened into a stricter
system for the marketing surface. Rule zero: **use the theme CSS variables** — hardcoded hex
only inside the canvas engine (which pins the same values as RGB tuples).

## Colors

| Role | Token | Value |
|---|---|---|
| Page background | `--app-bg` | `#0e0810` near-black plum |
| Deep water / vignette | (canvas `BG_DEEP`) | `#08040b` |
| Accent — vermillion | `--accent` | `#f24f13` |
| Accent — gold (crest, mastery, success) | `--accent-2` | `#f7c843` |
| Mid-water rose | `--m-mid` | `#b8447a` |
| Trough plum | `--m-cool` | `#6b4e8c` |
| Glass surface | `--surface-glass` | `rgba(20,12,24,0.55)` |
| Glow | `--accent-glow` | `rgba(242,79,19,0.4)` |

Meaning is fixed: **plum = unknown/deep, rose = learning/mid-water, vermillion = alive/energy,
gold = mastered/crest.** Gold is scarce — it marks achievement and the primary CTA only.
White text at 3 opacities: 1.0 headlines, 0.68 body, 0.4 whisper/labels.

## Typography

- Display: existing `font-display` stack, `font-bold tracking-tight`. Hero at
  `clamp` equivalents already in place (text-6xl→8xl). No new fonts.
- Body: default sans, `text-white/68`, `leading-relaxed`, max-w-2xl.
- **Mono chrome (new layer)**: Tailwind `font-mono` for system details — chapter indices
  (`01 — SONG`), IPA phonetics (`/ɛʁiˈneʁn/`), language codes (`DE → EN`), the beta pill.
  Always small (`text-[11px]`–`text-xs`), wide tracking `tracking-[0.18em]`, uppercase for
  labels, `text-white/40`–`/60`. Mono is seasoning, never paragraphs.
- Tracking system, three values only: `tracking-tight` (display), normal (body),
  `tracking-[0.18em]` (mono labels).

## Spacing & layout

- Section rhythm: `py-24 md:py-32`; sticky chapters size by vh (see MOTION_SPEC).
- Content column: `max-w-6xl mx-auto px-6`; text measures capped at `max-w-2xl`.
- Radius language: cards `rounded-2xl` (16px), chips/CTA pill `rounded-full`, small elements
  `rounded-lg`. Nothing between 16px and pill.

## Surface / glass rules

- One glass recipe: `--surface-glass` + `border border-white/10` + `backdrop-blur-md` +
  `shadow-[var(--shadow-soft)]`. Hover: border warms to `--accent`/35, glow
  `0 0 24px var(--accent-glow)` at low opacity.
- Glass is for objects that sit ON the water (cards, buoys, the phone). Never full-section
  glass panels — sections sit directly on the night sea.

## Image-card treatment (the vocabulary cards)

- Aspect 3/4 portrait rail cards (`w-[200px] md:w-[240px]`), `rounded-2xl`, image
  `object-cover` at 0.9 opacity, warm ring `border-white/10`.
- Bottom scrim `from-black/78 via-black/25 to-transparent`; word in white, translation in
  `text-white/55`, IPA in mono `text-white/40`; language chip top-right in mono.
- Cards are buoys: at rest they bob on the shared wave field (see MOTION_SPEC); hover lifts
  `-6px`, tilt eases to 0, ring warms to gold at 35%, glow blooms. Mastered/featured cards may
  carry the gold crest treatment (`--accent-2` ring + faint pulse) — sparingly, ~1 in 6.

## Wave treatment

- `LingwaveWaves` remains the only ambient engine; extended (WaveField) with: pointer wind
  (cursor bends nearby swell amplitude), wake ripples on pointer-move (throttled), scroll
  coupling (0→1 progress lifts camera/energy), and a `dawn` uniform (0 cold night → 1 golden
  dawn) so the final CTA returns to a brighter sea.
- The SVG `WaveformDivider` bars are the wave's *musical* form — used only inside the Song
  chapter and as reduced-motion stand-in, never as generic decoration between sections.

## CTA / button treatment

- Primary: existing `Button variant="glass-vermillion"`, pill, breathing glow
  (3s ease-in-out `--cta-glow` pulse). Exactly two on the page: hero, final CTA.
- Secondary (header Sign in): quiet `border-white/15` pill, no glow.
- All CTAs route to `/login` (`?mode=signup` for start-learning). No new routes.

## Motion language (summary — numbers in MOTION_SPEC.md)

- Signature easing `cubic-bezier(0.66, 0, 0.01, 1)` at 0.66s for every section-level reveal.
- Ladder: micro .15–.2s / UI .3–.5s / section .66–1s / ambient 3–12s.
- Continuous motion lives on the canvas; DOM gets discrete, once-only reveals.

## Anti-patterns (hard no)

- Generic SaaS: three-column feature grids with icon-title-blurb, testimonial walls, logo
  clouds, pricing tables.
- Generic glassmorphism: full-width frosted panels, rainbow gradients, purple-blue "AI" haze.
- Spinning/floating 3D logos, tilt-on-hover applied to everything, parallax on more than the
  designed layers.
- New display fonts, serif headlines, light theme on the landing.
- More than one wave engine on screen at once; more than two glowing CTAs.
- Adding three.js/GSAP/Lenis — the page must stay dependency-lean (framer-motion + Canvas 2D).
- Unbounded `will-change`, un-gated rAF loops, animations that re-trigger on scroll-back.
