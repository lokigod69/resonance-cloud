# Lingwave UX Coherence Audit — TestFlight readiness pass

Date: 2026-07-06 · Author: Fable 5 (product architect pass)
Inputs: Codex full-frontend inventory, dedicated study-surface audit, direct review of Speak/prompts/theme files.
All paths relative to `orchestrator/frontend/` unless noted.

## Verdict in one paragraph

The app is two products wearing one logo. The new spine — landing, dashboard/home, Guided Today,
deck cards — speaks a coherent cosmos language (vermillion/gold on near-black, token-driven glass,
calm motion). Speak, the Grok/Gemini pickers, parts of Study, and GeneratePG still speak an older
indigo/slate/hardcoded-hex dialect from the test-lab era. Nothing is broken; the problem is that a
first tester will *feel* the seam within three taps. The highest-leverage work before TestFlight is
(1) re-skinning Speak's selection flow onto the cosmos tokens, (2) collapsing Speak's provider
complexity into a curated flow, (3) finishing the Study glass unification. Everything else is polish.

## Severity key

- **S1** — a first tester will notice and it damages the premium impression
- **S2** — noticeable on second visit / comparison between pages
- **S3** — code health or edge case; invisible to most testers

## Route-by-route findings

### `/` Landing, `/dashboard` (Dashboard / DashboardPG) — reference quality ✅
The Tide of Memory landing and the mission-led dashboard are the brand target. Token-driven
(`theme-cosmos`, `dashboard-cosmic`, lit-glass material), calm, hierarchical. No action needed.
S3: `LevelEmblem.tsx:2-11` hardcodes level colors — fine visually, but move to tokens when touched.

### `/today` Guided Today — structurally premium, copy blemishes (S2)
`pages/Today.tsx` delegates cleanly to `TodayPathOverview`/`TodaySession` with dedicated CSS. Two issues:
- Explicit beta/test banner copy still rendered (`Today.tsx:255-261`) — decide the beta-notice
  language deliberately (see feature strategy doc) rather than shipping leftover copy.
- Step components hardcode success/error hexes (`BuildPhraseStep.tsx:96` `#34d399`/`#f87171`,
  `MatchPairsStep.tsx:177`, `GuidedSpeechPrompt.tsx:295-296` `#f59e0b`) instead of semantic
  tokens. Add `--success` / `--danger` / `--warning` aliases in `theme-contract.css` and sweep. (S2)

### `/decks` (Decks / DecksPG), `/deck/:id` (DeckView / DeckViewPG) — reference cards, stray panels
Deck cards are the agreed premium reference (`.theme-card` classic; `.pg-glass` glassy — deep blur,
layered borders, accent-glow hover, fully tokenized). Keep untouched.
- S2: `DeckViewPG.tsx:726, 832, 972` and `DeckPickerSheet.tsx:106` hardcode `#0d0d12` panels —
  swap for `var(--surface-1)`/`--surface-glass-strong` so future theme shifts don't fork.
- S3: classic `Decks.tsx:337` placeholder affordance looks unfinished next to PG.

### `/study` StudyModeSelector — good bones, prototype accents (S2)
Icon-tile selector is the right shape. Hardcoded blue/orange glow shadows
(`StudyModeSelector.tsx:237, 280`) and two "coming soon" gates (`:253, :272`) sit in the primary
learner path. Re-shadow with `var(--accent-glow)`; move coming-soon tiles to the end of the row or
behind admin flag for beta (a first tester should not meet two locked doors on day one).

### `/study/*` study modes — one component in four bodies (S1 for feel, S2 for code)
Full detail in FABLE_STUDY_AND_CARD_RENDERING_COHERENCE_PLAN.md. Summary:
- `Study/StudyPG` and `StudyImage/StudyImagePG` are ~90% duplicated skeletons (2×2 matrix of
  skin × media written as four hand-copied files). Logic drift already observed (alt-text reveal
  gating existed in one file of four — fixed in this pass).
- `StudyFlashcard`/`StudyAudio` are single-file (correct architecture) but skin-blind: flat
  `border ... backdrop-blur-sm` chrome that visibly lags the deck-card glass next door. (S1)
- Empty/loading states mostly consistent; two whole files had missed i18n
  (`StudyCanvas.tsx` — fixed; `VideoPlayer.tsx` — left for the video-deprecation pass, see Risks).

### `/speak` — the seam (S1)
The most complex learner surface and the least on-brand. Detail in
FABLE_SPEAK_PRODUCTIONIZATION_PLAN.md. Headlines:
- Selection flow is styled in a foreign palette: `ProviderToggle.tsx`, `GrokPicker.tsx`,
  `GeminiModeVoicePicker.tsx`, `CharacterGrid.tsx` use hardcoded `indigo-*`/`slate-*`/`gray-*`
  utilities and rgba indigo shadows throughout, while the in-conversation screens correctly use
  `--accent`/`--surface-glass` tokens. The picker literally looks like a different app than the
  chat it starts. (S1)
- Provider taxonomy exposed to users: Live / Characters / Voices ≙ Grok / Voxtral / Gemini, with
  three parallel setup wizards, 5+28+26 voices, 10 personality modes, 27 accents, 9 topic
  categories, 4 levels, plus a separate Roleplay tab with its own category→scene→level wizard. (S1)
- Language→provider constraints handled ad hoc (`fil`/`ceb` special-cases in `Speak.tsx:127-132,
  443-445` and `ProviderToggle.tsx:31`). Correct behavior, fragile shape — belongs in a capability
  matrix (see plan doc).
- `GeminiAccentPicker.tsx` is orphaned dead code (no imports anywhere). Delete when convenient. (S3)

### `/generate` (GenerateGO / Generate→GeneratePG) — capable, dense (S2)
GenerateGO is feature-rich and mostly glassy-correct, with residual inline styles
(`GenerateGO.tsx:1294, 1302`). Old `GeneratePG.tsx:1318-1381` carries a teal/violet/rose palette
wall from a previous era — it is the classic-skin `/generate` and shows it. For beta, glassy skin
is the showcase; treat GeneratePG re-skin as post-beta unless classic ships as default.

### `/music` (Music / MusicPG), `/games` — acceptable for beta (S2/S3)
Not deeply audited this pass; Codex flags no S1 issues. GamesHub contains coming-soon surface area —
same recommendation as StudyModeSelector: minimize locked doors for first testers
(`RUNNER_GAME_ROUTE_ENABLED` pattern already exists at `App.tsx:80`).

### Public experiment routes `/a`, `/b`, `/landing`, `/landing/a`, `/landing/b` (S2)
Landing A/B experiments are publicly routable. Before inviting testers, either remove the routes or
gate them — a tester who lands on `/landing` sees an experiment index, which reads as scaffolding.

### `/onboarding`, `/login`, `/settings`
Onboarding/login fine for beta. `pages/Settings.tsx` is orphaned (not in `routeImports.ts`) —
dead code, delete when convenient. (S3)

### Admin (`/admin/*`) — correctly isolated ✅
Own layouts (AppLayout/Ferrari), `AdminRoute` RPC gate. No leakage into learner surfaces found,
except raw provider vocabulary reappearing in Speak (see plan doc).

## Cross-cutting systems findings

1. **Two skins is a launch liability you've already half-decided.** Every S1 above is worse ×2
   because of classic/glassy duplication (7 duplicated page pairs). For TestFlight: pick glassy as
   the sole tester-facing skin (it holds the new brand language), keep classic behind the existing
   `SkinProvider` toggle for yourselves, and stop investing in classic page variants. This converts
   the duplication problem from "must fix 14 files" to "must fix 7".
2. **No learner-facing feature-flag registry existed.** Gates are scattered (route const, admin
   role, localStorage). This pass added `src/lib/speakCuration.ts` (role-based, mirrors
   `billingFlags.ts`). Extend that pattern rather than inventing per-surface flags.
3. **Semantic state colors are unowned.** Success/warn/error appear as raw `#34d399`, `#f87171`,
   `#f59e0b`, `#fb923c`, `text-orange-400`, `text-green-400/80` across Today, Study, Speak
   corrections. Define `--success/--warning/--danger` (+soft variants) once in the theme contract;
   sweep opportunistically.
4. **The api/ ↔ src/ duplicated data landmine.** `geminiVoices`, `geminiCharacterModes`,
   `geminiAccents`, and pedagogy text each have a serverless twin that must be hand-synced
   (bundling constraint). Any Speak curation must touch both sides or drift silently.

## Fixed in this pass (verified: typecheck ✅, eslint on changed files ✅, check:i18n ✅)

- `StudyCanvas.tsx` — raw "Loading…" → `t('study.loadingCards')` (was a whole-file i18n miss).
- `StudyAudio.tsx` — off-brand cyan fallback `var(--accent,#06b6d4)` → `var(--accent)`.
- `OrbDock.tsx` — rainbow `hsl()` placeholder orbs → glass-token gradient.
- `StudyPG.tsx` / `StudyImagePG.tsx` — inline `#fb923c` → `var(--pg-accent-gold)`.
- `Study.tsx` / `StudyPG.tsx` — answer-leaking `alt` now gated on reveal (parity with StudyImage);
  `object-cover`→`object-contain` unified so media doesn't crop/reflow between cards.
- New `src/lib/speakCuration.ts` + `GeminiModeVoicePicker` — theatrical accents (Pirate, Shrek,
  Cartoon French…) now admin-only.

## Top 5 priorities before TestFlight (ranked)

1. Speak selection-flow re-skin onto cosmos tokens + provider collapse (plan doc, phases 1–2).
2. Study card-chrome unification to the deck-glass reference (coherence plan, phase 1).
3. Decide + execute the beta skin policy (glassy-only for testers).
4. Remove/gate public experiment routes and reduce coming-soon doors in Study/Games.
5. Semantic state-color tokens sweep (Today steps first — it's the flagship surface).
