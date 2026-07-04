# IMPLEMENTATION_PLAN.md — file-by-file integration plan

Target: `orchestrator/frontend` (React 19 + Vite + Tailwind v4 + framer-motion 12).
Zero new dependencies. Committed directly to `main` per repo convention (commit only when
asked). Baseline: `npm run typecheck` passes as of this plan.

## Order of work

### Step 1 — shared wave physics
- **New `src/lib/waveField.ts`**: export `waveHeight(x,z,t)`, `WAVE_AMP_SUM`, `waveSlope`,
  `worldXFromPercent`, ramp helpers. Extracted verbatim from LingwaveWaves/WaveCanvas so all
  consumers share one field.
- **Edit `src/components/branding/LingwaveWaves.tsx`**: import the shared math (no behavior
  change); add optional props `windRef?` (pointer wind), `energyRef?` (scroll coupling
  0..1), `dawn?: number`. All optional with defaults = current behavior → dashboard
  (`HomeWaveBackground`), study (`WaveCanvas`), login stay pixel-identical.
- **Edit `src/components/study/canvas/WaveCanvas.tsx`**: swap its local `waveHeight` copy for
  the shared import (identical function — safe).

### Step 2 — new landing components (`src/components/landing/`)
`WaveField.tsx` (thin wrapper wiring pointer/scroll refs into LingwaveWaves),
`LandingHero.tsx`, `FloatingWords.tsx`, `TideStory.tsx`, `CreatorRail.tsx`,
`ModePortals.tsx`, `MemoryMechanicSection.tsx`, `FinalCTA.tsx`. Static data additions in
`landingData.ts` (rail cards incl. 2 mastered, tide beats, bubbles).

### Step 3 — page assembly
- **Rewrite `src/pages/LandingPage.tsx`** composing the new sections; keep `theme-cosmos`
  root, `scheduleIdleRoutePrefetch([routeImports.login])`, pointer-down ripple wiring.
- Restyle pass on `LanguagesSection.tsx`.

### Step 4 — i18n
- **Edit `src/lib/translations.ts`**: new `landing.tide*`, `landing.rail*`,
  `landing.portal*`, `landing.memory*` keys in **en, de, fr** (natural translations, real
  umlauts). Reuse existing `landing.headline*`, `subheadlineMain`, `heroCta`, `cta*`,
  `feature*`, `legal.*` where copy is unchanged.

### Step 5 — cleanup
Delete now-unimported: `HeroSection.tsx`, `MultilingualDrift.tsx`, `ScrollStorySection.tsx`,
`DemoReelSection.tsx`, `HowItWorksSection.tsx`, `FeatureConstellation.tsx`,
`VoiceTutorSection.tsx`, `CtaFooterSection.tsx` — only after checks pass and only if nothing
else imports them (verify with grep; `landing-experiments/` imports `ScrollReveal` and
`DEMO_WORDS`, which stay).

## Preserve (do not touch)

- Auth flow: `PublicRoute`, `/login`, `Login.tsx`, Supabase, `AuthProvider`.
- Routing: `App.tsx` route table (landing stays lazy at `/`), `routeImports.ts` entry name.
- Dashboard/study/app surfaces incl. `HomeWaveBackground`, all `study/canvas/*` behavior.
- Branding assets (`lingwave-mark/wordmark`), `LingwaveBrand`, footer legal content.
- `landing-experiments/` routes (`/a`, `/b`, `/landing`) — untouched.
- `useLandingLocale` mechanism.

## Risk list

| Risk | Mitigation |
|---|---|
| LingwaveWaves is shared by login/dashboard/study | extensions are optional props defaulting to current behavior; verify those surfaces visually after |
| Sticky-scrub sections are jank-prone on mobile Safari/Capacitor | mobile gets static/snap fallbacks, not the sticky rig; test at 390px |
| DEMO_WORDS thumbs point at hardcoded Supabase URLs (fragile) | keep existing `onError` hide pattern on every card; rail degrades to text cards |
| Two canvas instances (hero + dawn CTA) doubling cost | CTA instance is IntersectionObserver-mounted and hero pauses offscreen — never 2 live loops |
| framer-motion `useScroll` on manually-measured sticky windows breaks on resize | use target-ref offsets (`['start start','end end']`), no manual rect math |
| i18n coverage failure | `npm run check:i18n` gate before done; keys added in all 3 locales in the same edit |
| Concurrent Codex agent in tree | landing files verified clean in git; re-check `git status` before edits |

## QA checklist

- [ ] `npm run typecheck` · `npm run lint` (zero NEW errors) · `npm run check:i18n`
- [ ] `/` renders; hero interactive (wind/wake/tap); scroll story scrubs and reverses cleanly
- [ ] CTAs: header → `/login`, hero → `/login`, final → `/login?mode=signup`
- [ ] `?lang=de` and `?lang=fr` render natural copy
- [ ] Reduced-motion (emulate via devtools): still hero frame, stacked panels, no rAF loops
- [ ] 390px mobile: no horizontal overflow, snap rail works, sticky rigs bypassed
- [ ] Login page, dashboard waves, study Wave canvas visually unchanged
- [ ] No console errors; images lazy; scroll to bottom and back at 60fps on desktop
