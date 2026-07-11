# INVESTIGATION REPORT — Niveau Wizard Step (Frontend)

**Scope:** read-only investigation of the frontend (`orchestrator/frontend/`) to prepare for inserting a "Niveau" wizard step with five bubbles (Auto · Standard · Phrase · Story · Song) between Kunststil (Art Style) and Musik (Genre), in both Classic and Glassy skins.

**Backend baseline:** commits `cf0da5a`, `c03e14f`, `cc674ac` merged to `main`. `SETTINGS_OVERRIDE_MAP` in [`orchestrator/job_runner.py`](orchestrator/job_runner.py#L93-L103) already maps `lyric_mode → ("concept","lyric_mode")`. `ConceptSettings.lyric_mode` accepts `("minimal","standard","dramatic","contextual","creative","reliable")` ([`orchestrator/cloud_engines/concept_engine/models.py`](orchestrator/cloud_engines/concept_engine/models.py#L78)). The four user-facing modes (`reliable`/`contextual`/`creative`/`dramatic`) are the only ones the wizard will send.

---

## 1. Executive Summary

- **Classic skin** routes `/generate` → [`Generate.tsx`](orchestrator/frontend/src/pages/Generate.tsx), which is a one-line wrapper that renders [`GeneratePG.tsx`](orchestrator/frontend/src/pages/GeneratePG.tsx). Effectively the Classic skin IS `GeneratePG.tsx`.
- **Glassy skin** routes `/generate` → [`GenerateGO.tsx`](orchestrator/frontend/src/pages/GenerateGO.tsx).
- **`GeneratePG.tsx`** is the only file actually mounted for Classic; [`GenerateWizard.tsx`](orchestrator/frontend/src/components/generate/GenerateWizard.tsx) exists but is **dead code** (never imported anywhere).
- **Kunststil and Musik are adjacent** in both skins, so the Niveau step inserts cleanly between them with no reordering.
- **Wizard state is split between the two skins.** Classic uses a shared `useReducer` ([`useWizardState.ts`](orchestrator/frontend/src/components/generate/useWizardState.ts)). Glassy uses **local `useState`** ([`GenerateGO.tsx:36-47`](orchestrator/frontend/src/pages/GenerateGO.tsx#L36-L47)) with its own payload assembly. Both must be updated independently.
- **Submission is direct-to-Supabase**, not via an HTTP gateway. The frontend inserts into the `generation_jobs` table with `settings_override` as a JSONB column. There is **no FastAPI Pydantic model** in the path.
- **✅ GATEWAY HOP VERDICT:** The Supabase JSONB column preserves any keys, and [`job_runner.py:98`](orchestrator/job_runner.py#L98) includes `"lyric_mode": ("concept", "lyric_mode")` in `SETTINGS_OVERRIDE_MAP`. An attempted `settings_override.lyric_mode` from the wizard WILL reach `ConceptSettings`. **Frontend implementation is unblocked.**
- **i18n parity gap:** EN and FR have the full `generate.step*` key set. **DE is missing all `generate.stepX` keys and most `generate.chooseX` keys** ([`translations.ts`](orchestrator/frontend/src/lib/translations.ts) — DE block spans lines 401–724 and has only a partial `generate.*` subset at 625–631). German users fall through to English via the `translations[locale]?.[key] ?? translations.en?.[key]` chain. The Niveau keys should be added to all three locales; DE backfill for the existing step keys is out of scope but worth flagging.
- **No existing `lyric_mode` UI** for end-users. The only reference is the admin Settings panel ([`fieldConfigs.ts:40`](orchestrator/frontend/src/components/settings/fieldConfigs.ts#L40)); it is a legit admin control (global defaults) and should be left alone.

---

## 2. Routing Map (Question A)

| Skin | `/generate` mount | File | Mount condition |
|---|---|---|---|
| Classic (default) | `<Route path="/generate" element={<Generate />} />` [App.tsx:146](orchestrator/frontend/src/App.tsx#L146) | [`src/pages/Generate.tsx`](orchestrator/frontend/src/pages/Generate.tsx) | `skin !== 'glassy'` branch ([App.tsx:142-155](orchestrator/frontend/src/App.tsx#L142-L155)) |
| Glassy | `<Route path="/generate" element={<GenerateGO />} />` [App.tsx:133](orchestrator/frontend/src/App.tsx#L133) | [`src/pages/GenerateGO.tsx`](orchestrator/frontend/src/pages/GenerateGO.tsx) | `skin === 'glassy'` branch ([App.tsx:129-141](orchestrator/frontend/src/App.tsx#L129-L141)) |

**Three-candidate clarification:**
- [`Generate.tsx`](orchestrator/frontend/src/pages/Generate.tsx) — mounted for Classic, but its entire body is `return <GeneratePG />` ([Generate.tsx:3-5](orchestrator/frontend/src/pages/Generate.tsx#L3-L5)). It's a pass-through wrapper.
- [`GeneratePG.tsx`](orchestrator/frontend/src/pages/GeneratePG.tsx) — **the real Classic implementation**, rendered indirectly via `Generate.tsx`.
- [`GenerateGO.tsx`](orchestrator/frontend/src/pages/GenerateGO.tsx) — Glassy implementation, mounted directly.

**Dead code:** [`GenerateWizard.tsx`](orchestrator/frontend/src/components/generate/GenerateWizard.tsx) (the one that uses the `steps/*` files and `WizardProgress.tsx`) is defined but **never imported anywhere** (`grep GenerateWizard` returns only self-references and a comment in `GeneratePG.tsx:95`). It appears to be a prior/unused implementation. Treat the `src/components/generate/steps/*` files and `WizardProgress.tsx` as also dead — they are only referenced from `GenerateWizard.tsx`, with the single exception of [`steps/WordsStep.tsx`](orchestrator/frontend/src/components/generate/steps/WordsStep.tsx) which IS live: imported by both `GeneratePG.tsx:12` and `GenerateGO.tsx:14`.

**Definitive mapping the implementation prompt must use:**
```
Classic ("PG")   → orchestrator/frontend/src/pages/GeneratePG.tsx
Glassy  ("GO")   → orchestrator/frontend/src/pages/GenerateGO.tsx
Shared wizard state → orchestrator/frontend/src/components/generate/useWizardState.ts
Shared words step   → orchestrator/frontend/src/components/generate/steps/WordsStep.tsx
Shared option data  → orchestrator/frontend/src/components/generate/wizardData.ts
Translations        → orchestrator/frontend/src/lib/translations.ts
```

---

## 3. Wizard Step Sequence (Question B)

### 3.1 Classic — `GeneratePG.tsx`

Steps are driven by a local `pgStep` integer (0–5), switch-rendered at [GeneratePG.tsx:237-286](orchestrator/frontend/src/pages/GeneratePG.tsx#L237-L286):

| Order | `pgStep` | Label i18n key | Renderer | Location |
|---|---|---|---|---|
| 1 | 0 | `generate.stepLanguage` | inline `StepLanguage` | [GeneratePG.tsx:342-371](orchestrator/frontend/src/pages/GeneratePG.tsx#L342-L371) |
| 2 | 1 | `generate.stepWords` | shared `WordsStep` | [GeneratePG.tsx:245-252](orchestrator/frontend/src/pages/GeneratePG.tsx#L245-L252) |
| 3 | 2 | `generate.stepVibe` | inline `StepVibe` | [GeneratePG.tsx:376-459](orchestrator/frontend/src/pages/GeneratePG.tsx#L376-L459) |
| 4 | 3 | `generate.stepArtStyle` | inline `StepArtStyle` | [GeneratePG.tsx:463-537](orchestrator/frontend/src/pages/GeneratePG.tsx#L463-L537) |
| 5 | 4 | `generate.stepMusic` | inline `StepMusic` | [GeneratePG.tsx:541-664](orchestrator/frontend/src/pages/GeneratePG.tsx#L541-L664) |
| 6 | 5 | `generate.stepReview` | inline `StepReview` | [GeneratePG.tsx:668-771](orchestrator/frontend/src/pages/GeneratePG.tsx#L668-L771) |

**Kunststil (`pgStep === 3`) and Musik (`pgStep === 4`) are adjacent.** Niveau inserts as `pgStep === 4`, shifting Musik to 5 and Review to 6.

### 3.2 Glassy — `GenerateGO.tsx`

Steps are a local `step` integer (1–6). The page is a vertical scroll stack where each section renders its expanded form when `step === N` and a compact "breadcrumb orb" when `step > N` ([GenerateGO.tsx:388-625](orchestrator/frontend/src/pages/GenerateGO.tsx#L388-L625)).

| Order | `step` | Inline heading | Section location |
|---|---|---|---|
| 1 | 1 | `"Choose Language Orbit"` (hardcoded) | [GenerateGO.tsx:390-404](orchestrator/frontend/src/pages/GenerateGO.tsx#L390-L404) |
| 2 | 2 | `WordsStep` heading | [GenerateGO.tsx:407-428](orchestrator/frontend/src/pages/GenerateGO.tsx#L407-L428) |
| 3 | 3 | `"Select Visual Context"` (hardcoded) | [GenerateGO.tsx:431-462](orchestrator/frontend/src/pages/GenerateGO.tsx#L431-L462) |
| 4 | 4 | `"Art Style"` (hardcoded) | [GenerateGO.tsx:465-518](orchestrator/frontend/src/pages/GenerateGO.tsx#L465-L518) |
| 5 | 5 | `"Aural Atmosphere"` (hardcoded) | [GenerateGO.tsx:520-552](orchestrator/frontend/src/pages/GenerateGO.tsx#L520-L552) |
| 6 | 6 | `"Synthesis Ready" / "Adding Cards"` | [GenerateGO.tsx:555-624](orchestrator/frontend/src/pages/GenerateGO.tsx#L555-L624) |

**Kunststil (`step === 4`) and Musik/Aural (`step === 5`) are adjacent.** Niveau inserts as `step === 5`, shifting Aural to 6 and Initialize to 7. Note Glassy's `<h3>` headings are **hardcoded English strings, not i18n keys** — a pre-existing inconsistency; the Niveau step can either (a) match that pattern with a hardcoded heading or (b) introduce i18n on just that heading (product decision — see Open Questions).

### 3.3 Centralization

Step definitions are **NOT centralized** for the live wizards:
- Classic: label array inlined in `BreadcrumbPills` ([GeneratePG.tsx:304-307](orchestrator/frontend/src/pages/GeneratePG.tsx#L304-L307)) and `switch` case inlined in the render at lines 237-286.
- Glassy: per-section `<div className="gen-section">` blocks with conditional rendering, no central array.

There IS a `STEP_LABELS` export in [wizardData.ts:150-157](orchestrator/frontend/src/components/generate/wizardData.ts#L150-L157), but `grep STEP_LABELS` shows it is only consumed by `GeneratePG.tsx`'s **local** `STEP_LABELS` const (different binding, built from `t()` calls) — the exported one from `wizardData.ts` is unused in the live wizards.

---

## 4. Wizard State (Question C)

### 4.1 Classic (`useWizardState.ts`)

`useReducer` based. [useWizardState.ts:4-14](orchestrator/frontend/src/components/generate/useWizardState.ts#L4-L14):
```ts
export interface WizardState {
  step: 1 | 2 | 3 | 4 | 5 | 6
  path: 'undecided' | 'quick' | 'custom'
  language: string | null
  words: string[]
  vibe: string | null
  movieTitle: string | null
  artStyle: string | null
  genre: string | null
  deckName: string
}
```

**No `lyricMode` / `lyric_mode` / niveau field exists.** Must be added.

Action pattern ([useWizardState.ts:16-30](orchestrator/frontend/src/components/generate/useWizardState.ts#L16-L30)):
```ts
export type WizardAction =
  | { type: 'SET_LANGUAGE'; language: string }
  | { type: 'SET_VIBE'; vibe: string }
  | { type: 'SET_ART_STYLE'; style: string | null }
  | { type: 'SET_GENRE'; genre: string | null }
  | ...
```

Suggested addition to mirror the convention: `| { type: 'SET_LYRIC_MODE'; mode: string | null }`. Reducer case mirrors `SET_ART_STYLE` at [useWizardState.ts:77-78](orchestrator/frontend/src/components/generate/useWizardState.ts#L77-L78).

**Default-selection mechanism:** defaults are null for optional fields (`vibe`, `artStyle`, `genre` all default to `null` in `initialState` at [useWizardState.ts:32-42](orchestrator/frontend/src/components/generate/useWizardState.ts#L32-L42)). The "Auto" bubble is rendered as selected when the stored value is `null` via the pattern `effectiveGenre = selected || 'auto'` ([GeneratePG.tsx:560](orchestrator/frontend/src/pages/GeneratePG.tsx#L560)) or `selected === null` ([GeneratePG.tsx:487](orchestrator/frontend/src/pages/GeneratePG.tsx#L487)). The implementation prompt should follow this convention: store `null` to mean Auto, and render Auto-bubble as selected when `state.lyricMode === null`.

### 4.2 Glassy (`GenerateGO.tsx`)

Local `useState`, no reducer. [GenerateGO.tsx:36-47](orchestrator/frontend/src/pages/GenerateGO.tsx#L36-L47):
```ts
const [language, setLanguage] = useState<string | null>(null)
const [vibe, setVibe] = useState<string | null>(null)
const [artStyle, setArtStyle] = useState<string | null>(null)
const [genre, setGenre] = useState<string | null>(null)
// ...
```

Must add a parallel `const [lyricMode, setLyricMode] = useState<string | null>(null)`.

### 4.3 Observation

The two skins do NOT share wizard state. Any new field must be added in two places: the reducer (for Classic) and the local useState list (for Glassy). Their payload assembly also differs (`buildPayload` callback vs. inline object literal) — see Section 8 below.

---

## 5. Progress Chip Row (Question D)

### 5.1 Classic (`GeneratePG.tsx`)

Component: `BreadcrumbPills` at [GeneratePG.tsx:294-340](orchestrator/frontend/src/pages/GeneratePG.tsx#L294-L340). Step list is derived from an **inline** array at [GeneratePG.tsx:304-307](orchestrator/frontend/src/pages/GeneratePG.tsx#L304-L307):
```tsx
const STEP_LABELS = [
  t('generate.stepLanguage'), t('generate.stepWords'), t('generate.stepVibe'),
  t('generate.stepArtStyle'), t('generate.stepMusic'), t('generate.stepReview'),
]
```

To add the Niveau chip between Kunststil and Musik, insert `t('generate.stepNiveau')` between `t('generate.stepArtStyle')` and `t('generate.stepMusic')`. The component's click-to-navigate logic uses array index (`i < pgStep` means "completed"), which continues to work after insertion because `pgStep` is also incremented.

### 5.2 Glassy (`GenerateGO.tsx`)

No dedicated chip row. Instead, each step block renders either its expanded form or a compact breadcrumb orb inline:
- Language breadcrumb: rendered implicitly by the orb row with `orbClass(1, ...)` modifier `breadcrumb` ([GenerateGO.tsx:117-122](orchestrator/frontend/src/pages/GenerateGO.tsx#L117-L122)).
- Words breadcrumb: [GenerateGO.tsx:421-426](orchestrator/frontend/src/pages/GenerateGO.tsx#L421-L426).
- Art style breadcrumb: [GenerateGO.tsx:510-516](orchestrator/frontend/src/pages/GenerateGO.tsx#L510-L516).
- Vibe and Genre breadcrumbs: the full orb row remains visible with `.breadcrumb` modifier.

The implementation prompt must add a new `<div className="gen-section">` block for Niveau with:
- Expanded render when `step === <new-niveau-step>`.
- Breadcrumb/compact render when `step > <new-niveau-step>`.
- `sectionRefs.current[<n>]` slot to participate in the auto-scroll-to-active effect ([GenerateGO.tsx:106-113](orchestrator/frontend/src/pages/GenerateGO.tsx#L106-L113)).

---

## 6. Bubble Component (Question E)

### 6.1 Shared bubble

[`GlassCard.tsx`](orchestrator/frontend/src/components/generate/shared/GlassCard.tsx) exists as a shared option-picker bubble with props `{ selected?, disabled?, onClick?, children, className?, hoverStyle? }`. It supports any number of options and a selected state.

**However, `GlassCard` is only consumed by the dead `GenerateWizard`-family steps** (ArtStyleStep, MusicStep, VibeStep, etc.). The two live wizards do NOT use it.

### 6.2 Per-skin bubble patterns

**Classic (`GeneratePG.tsx`)** — bubbles are inline `<motion.button>` elements with `pg-glass` Tailwind class. Each step uses its own layout:
- Language: 3-col grid of language cards with flag icon, lines 351-368.
- Vibe: 2-col grid, lines 396-423.
- Art style: small chip grid inside a scroll container, 2–4 col depending on breakpoint, lines 501-523.
- Music/Genre: `flex-wrap` pill row with rounded-full chips, lines 574-611.

Pattern for a new **5-option bubble row** (like Music): `flex flex-wrap gap-3 justify-center` with `rounded-full px-5 py-2.5` buttons. This fits 5 options comfortably on mobile without wrapping awkwardly.

**Glassy (`GenerateGO.tsx`)** — bubbles are inline `<div className="gen-orb">` elements with modifiers `selected`, `breadcrumb`, `ignored`. Helper at [GenerateGO.tsx:117-122](orchestrator/frontend/src/pages/GenerateGO.tsx#L117-L122):
```tsx
function orbClass(stepNum: number, value: string, selected: string | null) {
  if (step > stepNum) {
    return value === selected ? 'gen-orb selected breadcrumb' : 'gen-orb ignored'
  }
  return value === selected ? 'gen-orb selected' : 'gen-orb'
}
```

Rendered inside `<div className="gen-orb-row">` containers. Five bubbles fit the existing `gen-orb-row` layout (same count as `GO_GENRES` at [GenerateGO.tsx:16-25](orchestrator/frontend/src/pages/GenerateGO.tsx#L16-L25), which has 8 options already).

### 6.3 Five-option feasibility

No layout concerns. Both skins already handle step rows with 5+ options (Vibe has 6, GO_GENRES has 8, GENRES has 11). Mobile wrapping works via `flex-wrap` in both.

---

## 7. i18n (Question F)

- Central translation file: **[`orchestrator/frontend/src/lib/translations.ts`](orchestrator/frontend/src/lib/translations.ts)** (single file, no per-locale file split).
- Locales declared at [translations.ts:14](orchestrator/frontend/src/lib/translations.ts#L14): `export type Locale = 'en' | 'de' | 'fr'`.
- `LANGUAGE_TO_LOCALE` mapping at [translations.ts:19-25](orchestrator/frontend/src/lib/translations.ts#L19-L25) — Korean and Spanish fall through to English.
- Locale blocks:
  - `en:` starts at line 41, ends ~399.
  - `de:` starts at line 401, ends ~724.
  - `fr:` starts at line 726, ends end-of-file.
- Resolution function at [translations.ts:28-38](orchestrator/frontend/src/lib/translations.ts#L28-L38): `translations[locale]?.[key] ?? translations.en?.[key] ?? key`. Missing keys fall through to EN silently.

### 7.1 Key naming convention

`section.element` with optional `.plural` / `.variant` suffix, e.g.:
- Step titles (chip labels): `generate.stepLanguage`, `generate.stepWords`, `generate.stepVibe`, `generate.stepArtStyle`, `generate.stepMusic`, `generate.stepReview` ([translations.ts:116-121](orchestrator/frontend/src/lib/translations.ts#L116-L121)).
- Step headings (inside the step): `generate.chooseLanguage`, `generate.setDirection`, `generate.chooseArtStyle`, `generate.pickGenre`, etc.
- Step subtitles: `generate.chooseLanguageSub`, `generate.chooseArtStyleSub`, etc.
- Plurals: `generate.creditsUsed.one` / `generate.creditsUsed.other`.

Niveau keys should follow the same pattern, e.g. `generate.stepNiveau`, `generate.chooseNiveau`, `generate.chooseNiveauSub`, plus bubble labels like `generate.niveau.auto`, `generate.niveau.standard`, `generate.niveau.phrase`, `generate.niveau.story`, `generate.niveau.song`.

### 7.2 Parity status

**Not feature-complete.** Enumerated exhaustively via `grep '^    .generate\\.'`:

| Key group | EN | DE | FR |
|---|---|---|---|
| `generate.stepLanguage/Words/Vibe/ArtStyle/Music/Review` | ✅ (116–121) | ❌ **missing** | ✅ (806–811) |
| `generate.chooseLanguage`, `.chooseLanguageSub` | ✅ | ❌ | ✅ |
| `generate.setDirection`, `.setDirectionSub` | ✅ | ❌ | ✅ |
| `generate.whichFilm`, `.filmPlaceholder`, `.filmExample` | ✅ | ❌ | ✅ |
| `generate.chooseArtStyle`, `.chooseArtStyleSub`, `.normalStyle`, `.normalStyleDesc` | ✅ | ❌ | ✅ |
| `generate.pickGenre`, `.pickGenreSub` | ✅ | ❌ | ✅ |
| `generate.synthesisReady`, `.deckNamePlaceholder`, `.initializeSynthesis` etc. | ✅ | ❌ | ✅ |
| `generate.addWords`, `.quickGenerate`, `.customize`, `.continue`, `.deckBeingCreated`, `.backgroundNotice`, `.couldNotVerifyCredits` | ✅ (274–280) | ✅ (625–631) | ✅ (983–989) |

Today, **German users see English step chip labels** because the missing keys fall through via the resolver chain. This is a pre-existing issue outside the scope of the Niveau work, but the implementation prompt should nevertheless require all three locales for the new Niveau keys (EN + DE + FR), matching the user's stated expectation of DE/FR parity for new features.

---

## 8. Submission Payload Trace — THE CRITICAL HOP (Question G)

### 8.1 Frontend payload shape

**Classic (`GeneratePG.tsx` → `useWizardState.ts`).**
`buildPayload()` at [useWizardState.ts:145-184](orchestrator/frontend/src/components/generate/useWizardState.ts#L145-L184). The relevant insertion point for Niveau:

```ts
jobPayload: {
  user_id: userId,
  ...(existingDeck ? { deck_id: existingDeck.id } : {}),
  status: 'pending',
  target_language: language,
  art_style: artStyle ?? existingDeck?.art_style ?? null,
  movie_override: movieOverride ?? existingDeck?.movie_override ?? null,
  words_total: state.words.length,
  settings_override: {
    ...(creativeDirection ? { creative_direction: creativeDirection } : {}),
    ...(genre ? { genre } : {}),
  },
},
```
— [useWizardState.ts:168-180](orchestrator/frontend/src/components/generate/useWizardState.ts#L168-L180).

The `settings_override` object does **not currently include `lyric_mode`**. The conditional spread pattern (`...(value ? { key: value } : {})`) is the correct template: when the user picks "Auto" (stored as `null`), omit the key; otherwise include it.

**Glassy (`GenerateGO.tsx`).**
Inline payload assembly at [GenerateGO.tsx:268-292](orchestrator/frontend/src/pages/GenerateGO.tsx#L268-L292):

```ts
settings_override: {
  ...(creativeDirection ? { creative_direction: creativeDirection } : {}),
  ...(genreValue ? { genre: genreValue } : {}),
},
```

Same gap — `lyric_mode` must be added here too, mirroring the same conditional pattern.

### 8.2 Request destination

**There is no orchestrator HTTP endpoint for this hop.** The frontend writes directly to Supabase. See [`submitGeneration.ts`](orchestrator/frontend/src/components/generate/submitGeneration.ts):

- Deck insert: [submitGeneration.ts:81-88](orchestrator/frontend/src/components/generate/submitGeneration.ts#L81-L88) — `supabase.from('decks').insert(deckPayload!)`.
- Job insert: [submitGeneration.ts:66-69](orchestrator/frontend/src/components/generate/submitGeneration.ts#L66-L69) and [:100-103](orchestrator/frontend/src/components/generate/submitGeneration.ts#L100-L103) — `supabase.from('generation_jobs').insert({ ...jobPayload, deck_id: targetDeckId })`.

The `settings_override` column on `generation_jobs` is JSONB:
```sql
-- settings_override is used by the generate wizard to pass creative_direction and genre
ALTER TABLE public.generation_jobs ADD COLUMN IF NOT EXISTS settings_override JSONB DEFAULT NULL;
```
— [`orchestrator/frontend/supabase/migrations/20260324000000_schema_fixes.sql:3-4`](orchestrator/frontend/supabase/migrations/20260324000000_schema_fixes.sql#L3-L4).

JSONB stores any object structure verbatim. No schema validation is performed at the Supabase layer on this column.

### 8.3 Gateway Pydantic model — explicit verdict

**There is NO FastAPI Pydantic model on this path.** [`orchestrator/src/app.py`](orchestrator/src/app.py) in cloud mode (`STORAGE_MODE == "cloud"`, the production configuration) mounts only the `health` router ([src/app.py:83](orchestrator/src/app.py#L83)) — the generation/media/settings/suno/words/workspace routers are gated behind `if STORAGE_MODE != "cloud"` ([src/app.py:85-93](orchestrator/src/app.py#L85-L93)) and are only used for local dev against the filesystem.

The wire contract is:

```
Browser → supabase-js → Supabase REST (PostgREST) → Postgres table (generation_jobs)
                                                                 ↓
                                                    job_runner.py picks up row
                                                                 ↓
                                          feeder.bootstrap_job() reads settings_override
                                                                 ↓
                                              merge_settings(..., settings_override=...)
                                                                 ↓
                                              SETTINGS_OVERRIDE_MAP lookup per key
```

The only place a key could be silently dropped is `merge_settings()` at [`job_runner.py:119-127`](orchestrator/job_runner.py#L119-L127):
```python
if settings_override:
    for key, value in settings_override.items():
        if value is None or value == "":
            continue
        mapping = SETTINGS_OVERRIDE_MAP.get(key)
        if mapping is None:
            continue
        stage, field = mapping
        merged.setdefault(stage, {})[field] = value
```

Keys absent from `SETTINGS_OVERRIDE_MAP` ARE silently dropped at line 124-125. This is the exact failure mode the investigation prompt warned about — just relocated from Pydantic to the map lookup.

### 8.4 SETTINGS_OVERRIDE_MAP confirmation

`job_runner.py:93-103` (on `main`):
```python
SETTINGS_OVERRIDE_MAP: dict[str, tuple[str, str]] = {
    "genre": ("concept", "genre"),
    # Niveau wizard: per-generation lyric mode (Standard / Phrase / Story / Song
    # → reliable / contextual / creative / dramatic). Required so the wizard's
    # settings_override actually reaches the concept engine.
    "lyric_mode": ("concept", "lyric_mode"),
    "creative_direction": ("images", "creative_direction"),
    "art_style": ("images", "art_style"),
    "visual_reference": ("images", "visual_reference"),
    "frame_narrative": ("images", "frame_narrative"),
}
```

**✅ `"lyric_mode": ("concept", "lyric_mode")` is present on main at [job_runner.py:98](orchestrator/job_runner.py#L98).** The feeder reads `settings_override` at [`feeder.py:480-486`](orchestrator/src/orchestration/feeder.py#L480-L486) and passes it through.

### 8.5 Verdict

**✅ gateway accepts `lyric_mode`.** No backend change required before frontend ships. The implementation prompt can safely add `lyric_mode` to the frontend's `settings_override` payload with the confidence that it will reach `ConceptSettings.lyric_mode` via `merge_settings() → SETTINGS_OVERRIDE_MAP → concept stage`.

**Insertion points:**
1. Classic: [`useWizardState.ts:176-179`](orchestrator/frontend/src/components/generate/useWizardState.ts#L176-L179) — add `...(lyricMode ? { lyric_mode: lyricMode } : {})` inside `settings_override`.
2. Glassy: [`GenerateGO.tsx:287-290`](orchestrator/frontend/src/pages/GenerateGO.tsx#L287-L290) — same spread pattern.
3. Classic: also extend `WizardState` (useWizardState.ts:4-14), `WizardAction` (:16-30), `initialState` (:32-42), and the reducer (:44-108) with a `SET_LYRIC_MODE` case.
4. Glassy: add `const [lyricMode, setLyricMode] = useState<string | null>(null)` to the state block at [GenerateGO.tsx:36-47](orchestrator/frontend/src/pages/GenerateGO.tsx#L36-L47).

**Auto-bubble semantics** (per the investigation's scope limits): when the user selects "Auto", store `null` and the conditional spread will omit the key. The backend then falls back to profile settings → `DEFAULT_SETTINGS.concept.lyric_mode = "reliable"` ([`orchestrator/src/settings.py:24`](orchestrator/src/settings.py#L24)). This matches how Auto is handled for `vibe` ("auto" → `undefined`) and `genre` ("auto" → `undefined`). Storyboard-fed Auto logic is explicitly out of scope per the handoff.

---

## 9. Dead-Code Findings (Question H)

Search: `grep -r 'lyric_mode|reliable|contextual|creative|dramatic|niveau|Niveau'` across `orchestrator/frontend/src/`:

| Location | Finding | Implication |
|---|---|---|
| [`components/settings/fieldConfigs.ts:40`](orchestrator/frontend/src/components/settings/fieldConfigs.ts#L40) | `{ key: 'lyric_mode', label: 'Lyric Mode', type: 'dropdown', options: ['reliable', 'minimal', 'standard', 'dramatic', 'contextual', 'creative'], default: 'reliable' }` | Admin-only Settings panel — global defaults editor. **Leave alone.** Options still list legacy `minimal`/`standard` (valid on the backend per [`models.py:78`](orchestrator/cloud_engines/concept_engine/models.py#L78) but absent from the Niveau user-facing set). Not shown to end users. |
| [`components/generate/GenerateWizard.tsx`](orchestrator/frontend/src/components/generate/GenerateWizard.tsx) | Full wizard implementation; `grep GenerateWizard` has ZERO import sites outside itself and a stale comment in `GeneratePG.tsx:95`. | **Dead code.** Implementation prompt can ignore. Not in scope to delete, but treat everything under `src/components/generate/steps/` (except `WordsStep.tsx`), `shared/GlassCard.tsx`, `shared/PillButton.tsx` (used by `GenerateWizard`), `shared/StepContainer.tsx`, `shared/GlassInput.tsx`, and `WizardProgress.tsx` as **dead** and do not consume them for Niveau. |
| [`hooks/useVoiceTutor.ts`](orchestrator/frontend/src/hooks/useVoiceTutor.ts), [`data/roleplayScenarios.ts`](orchestrator/frontend/src/data/roleplayScenarios.ts), [`data/geminiCharacterModes.ts`](orchestrator/frontend/src/data/geminiCharacterModes.ts), [`components/WordInfoPanel.tsx`](orchestrator/frontend/src/components/WordInfoPanel.tsx) | Use words like `creative` / `dramatic` as generic English — unrelated to lyric_mode. | Ignore. |
| [`pages/admin/Queue.tsx:328-331`](orchestrator/frontend/src/pages/admin/Queue.tsx#L328-L331) | Displays `job.settings_override.creative_direction` in the queue row. | Optional follow-up: surface `settings_override.lyric_mode` here too for admin visibility. Out of scope for the wizard-step implementation prompt. |
| [`components/admin/WordDetailPanel.tsx`](orchestrator/frontend/src/components/admin/WordDetailPanel.tsx) | Displays concept stage settings including `lyric_mode` on the per-word admin panel. | Already wired — will display the new per-generation value automatically. No change needed. |

**No end-user UI currently exposes `lyric_mode`.** No leftover wizard scaffolding to remove.

---

## 10. Open Questions for Sir Robert

1. **Glassy step heading i18n:** Glassy currently uses hardcoded English `<h3>` headings (`"Choose Language Orbit"`, `"Select Visual Context"`, `"Art Style"`, `"Aural Atmosphere"`, `"Synthesis Ready"`). Should the Niveau step's heading be hardcoded too (matching the rest of Glassy) or use i18n (and optionally backfill the others)? Per current convention, hardcoded EN is the zero-friction path.

2. **Chip label "Niveau" vs localized:** The chip label in the Classic progress pills uses i18n keys. Should the EN key read `"Niveau"` (German loanword, matches the project-internal shorthand the user has been using) or `"Level"`? Suggest `"Niveau"` for all three locales since it's a recognized word in EN/DE/FR contexts and matches the project vocabulary, but this is a product call.

3. **Reliable → Standard label mapping:** The backend enum `reliable` is labeled `Standard` in the Niveau UI per the handoff. Confirm this is the final mapping (user-facing "Standard" = backend "reliable"), because the admin fieldConfig dropdown currently shows both `reliable` and `standard` as separate options. The admin dropdown is legacy and not in scope to fix, but the wizard mapping should be explicit.

4. **Auto semantics — punt confirmed?** The handoff says Auto-mode semantics are a separate investigation. The recommendation in this report (Auto → omit `lyric_mode` from `settings_override` → backend falls back to `DEFAULT_SETTINGS.concept.lyric_mode = "reliable"`) is the minimal wire-safe default. Confirm this is acceptable as an interim, or flag that Auto should error-out / be disabled until the storyboard-fed Auto investigation lands.

5. **DE backfill:** The pre-existing DE gap on `generate.stepLanguage/Words/Vibe/ArtStyle/Music/Review` etc. means German users already see English step labels. Should the implementation prompt also backfill those DE keys (scope creep but cheap), or only ship DE for the new Niveau keys (parity with the existing imperfect state)?

---

## Verification

```
$ ls -la INVESTIGATION_REPORT_LYRIC_LEVELS_FRONTEND.md
# file present at repo root, non-empty
```

All sections A–H answered with file paths and line numbers. No files were modified during this investigation.
