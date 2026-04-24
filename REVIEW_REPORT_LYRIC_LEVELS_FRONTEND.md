# Review Report — Lyric Levels (Frontend + Backend Merge)

Commits reviewed:
- `1963f57` — merge: feat/lyric-levels-backend — Niveau lyric levels (backend)
- `3a4755b` — feat(generate): Niveau wizard step (Classic + Glassy)

Reviewer verified `HEAD == origin/main == 3a4755b` before inspecting files. Working tree clean of tracked modifications.

## 1. Verdict

**SHIP.** The wire contract is intact end-to-end. `SETTINGS_OVERRIDE_MAP` contains `"lyric_mode": ("concept", "lyric_mode")`. The Classic renumbering (0–6) and Glassy renumbering (1–7) are internally consistent across every `setStep`, `pgStep === N`, `step >=`, `orbClass(N, …)`, and `sectionRefs.current[N]` site. All 13 Niveau translation keys are present for EN/DE/FR. Backend pytest green (33/33). `tsc` exits 0. `vite build` exits 0. `eslint` exits 0 with 127 pre-existing problems unchanged in the modified files.

## 2. Critical findings

None. No step-renumbering misses, no wire-contract breaks, no payload regressions.

## 3. Nits

1. `frontend/src/components/generate/useWizardState.ts` lines 126, 159, 172 — the `WizardState['step']` tuple type is still `1 | 2 | 3 | 4 | 5 | 6` and `NEXT_STEP` clamps to `6`. The wizard reducer's `step` field is not actually used by either Classic (`pgStep` via local `useState`) or Glassy (`step` via local `useState`), so this is dead state. Not a bug — just unused. No action required under scope lockdown.
2. `frontend/src/pages/GeneratePG.tsx` lines 768–788 (StepReview summary chips) — no visual chip for the chosen `lyricMode`. Deck is submitted correctly either way (wire contract intact), but the Review screen silently omits the user's Niveau choice from the summary. UX gap, not a bug.
3. `frontend/src/pages/GeneratePG.tsx` line 733 — leftover section header comment `/* ─── Step 5: Review ──` above `StepReview`. Review is now step 6, not 5. Cosmetic only.
4. `frontend/src/pages/GenerateGO.tsx` lines 620–642 (Glassy Initialize summary tags) — same omission as Classic: no tag for `lyricMode`. Cosmetic/UX, not wire.
5. `frontend/src/pages/GenerateGO.tsx` lines 540–544 — bubble descriptions use period-less 1–2-word fragments ("Smart pick", "Word-focused", …) while Classic descriptions are full sentences from `translations.ts`. Hardcoded English per commit-message design decision; consistent with rest of Glassy. No action.

## 4. Verified claims

### Backend merge sanity (commit 1963f57)

| # | Claim | Verified |
|---|---|---|
| A1 | Merge touched only backend files (engine/lyrics/templates/job_runner/tests/fixtures + two .md reports). No frontend, no cloud_engines outside concept, no src/. | YES — `git diff b2c5153..1963f57 --stat` shows 8 files, all expected. |
| A2 | `SETTINGS_OVERRIDE_MAP` contains `"lyric_mode": ("concept", "lyric_mode")`. | YES — `job_runner.py:98`. |
| A3 | `merge_settings()` routes `{"lyric_mode": "dramatic"}` to `merged["concept"]["lyric_mode"] = "dramatic"`, overriding profile/default. | YES — walked the loop at `job_runner.py:113–127`. |
| A4 | `tests/test_concept_lyric_levels.py` passes on main. | YES — 33/33 in 0.91s. |
| A5 | No unexpected changes in `orchestrator/src/` or `orchestrator/cloud_engines/` outside the concept engine. | YES — diff against pre-merge parent shows zero such files. |

### Frontend — useWizardState (commit 3a4755b)

| # | Claim | Verified |
|---|---|---|
| B6 | `lyricMode: string \| null` present in WizardState. | YES — line 12. |
| B7 | `{ type: 'SET_LYRIC_MODE'; mode: string \| null }` in action union, no typos. | YES — line 26. |
| B8 | `initialState.lyricMode = null`. | YES — line 45. |
| B9 | Reducer `SET_LYRIC_MODE` returns `{ ...state, lyricMode: action.mode }`, no mutation. | YES — line 90. |
| B10 | `buildPayload()` with `state.lyricMode === null` omits `lyric_mode` key entirely. | YES — `state.lyricMode \|\| undefined` coerces null → undefined, spread `...(lyricMode ? { lyric_mode: lyricMode } : {})` omits. Snake-case. |
| B11 | `buildPayload()` with `state.lyricMode === "dramatic"` yields `settings_override.lyric_mode === "dramatic"`. | YES — destructuring trace clean. |
| B12 | Classic quick-generate overwrites `jobPayload.settings_override = {}` (line 121). | YES — quick-generate correctly drops Niveau. |

### Frontend — Classic (GeneratePG.tsx)

| # | Claim | Verified |
|---|---|---|
| C13 | `pgStep` range 0–6. All `setPgStep(N)` and `pgStep === N` sites match the new numbering (Language=0, Words=1, Vibe=2, ArtStyle=3, Niveau=4, Music=5, Review=6). | YES — grep + manual walk of lines 237/245/253/261/268/275/282/250/258/265/272/279. |
| C14 | `STEP_LABELS` has 7 entries in order: Language, Words, Vibe, ArtStyle, Niveau, Music, Review. | YES — lines 311–315. |
| C15 | Breadcrumb completion logic (`i < pgStep`) consistent with 7 chips. | YES — manual simulation for pgStep=3 and pgStep=6. |
| C16 | `StepNiveau` renders five bubbles; Auto acts as selected when `selected === null`; click dispatches `SET_LYRIC_MODE`; Continue calls `setPgStep(5)`. | YES — lines 549–604 + usage site line 272. |
| C17 | ArtStyle `onContinue` calls `setPgStep(4)` (into Niveau, not Music). | YES — line 265. |
| C18 | Review submit fires when `pgStep === 6`. | YES — lines 282–292. |
| C19 | Payload key is snake-case `lyric_mode`. | YES — `useWizardState.ts:176`. |
| C20 | Existing-deck continuation path ships Niveau (no special drop). | YES — `handleGenerate()` uses `buildPayload(user.id, existingDeck)` with no settings_override clear for non-quick path. |
| C-extra | Existing-deck `startIndex = 1` still hides only Language chip; correct against 7-chip array. | YES — line 316. |

### Frontend — Glassy (GenerateGO.tsx)

| # | Claim | Verified |
|---|---|---|
| D21 | `step` range 1–7. Every `setStep(N)` call at lines 73,87,131,135,169,184,193,200,213,220,230,238,245,431,521,559 matches new numbering. No literal `6` left behind where Initialize used to sit — all Initialize-phase sites are now `7`. | YES — walked every site. |
| D22 | `orbClass(N, ...)` first-arg matches section: `orbClass(1, …)` Language line 405, `orbClass(3, …)` Vibe line 447, `orbClass(6, …)` Genre line 579. | YES. No `orbClass(5, …)` Genre leftover. |
| D23 | `sectionRefs.current[N]`: [0]=Language line 399, [1]=Words line 417, [2]=Vibe line 441, [3]=ArtStyle line 475, [4]=Niveau line 531, [5]=Genre line 573, [6]=Initialize line 607. No duplicates, no gap. | YES. |
| D23-extra | `useEffect` auto-scroll reads `sectionRefs.current[step - 1]` — for step=7 returns index 6 (Initialize), consistent. | YES — line 110. |
| D24 | Niveau section: `step === 5` shows expanded form; `step > 5` (via `step >= 5` render gate plus `step === 5 ? expanded : breadcrumb`) shows breadcrumb; breadcrumb click `setStep(5)` returns user. | YES — lines 529–569. |
| D25 | Breadcrumb label mapping `reliable→Standard`, `contextual→Phrase`, `creative→Story`, `dramatic→Song`, `null→Auto`. | YES — lines 560–564. No typo. |
| D26 | `handleInitialize` `settings_override` spread includes `lyric_mode`; gate `!isQuickGenerate && lyricMode` drops it on quick path. | YES — line 298. |
| D27 | `handleGenreSelect` — all forward-progressions to Initialize use `setStep(7)` (was 6); toggle-off reverts to `setStep(6)` (was 5). | YES — lines 230, 238. |
| D28 | `handleCustomGenreConfirm` — forward to Initialize `setStep(7)`. | YES — line 245. |

### Translations

| # | Claim | Verified |
|---|---|---|
| E29 | All 13 Niveau keys in EN. | YES — lines 120, 123–134 of `translations.ts`. |
| E30 | All 13 Niveau keys in DE. | YES — lines 645–657. |
| E31 | All 13 Niveau keys in FR. | YES — lines 836, 839–850. |
| E32 | No cross-locale string leaks. | YES — DE strings are German ("Niveau wählen", "Intelligente Auswahl"), FR strings are French ("Choisir le niveau", "Choix intelligent"). "Story"/"Song" intentionally left as English identifiers in DE/FR (cognate / design choice). EN "Standard" = DE "Standard" = FR "Standard" (genuine cognate). |
| E33 | No syntax issues. | YES — tsc exit 0. |
| E34 | `generate.stepNiveau = "Niveau"` across all three locales (not "Level"). | YES — lines 120, 645, 836. |

### Build health

| # | Claim | Verified |
|---|---|---|
| F35 | `npx tsc --noEmit` exits 0. | YES. |
| F36 | No NEW lint errors attributable to this commit in the 4 modified files. | YES — filtered lint output: zero hits for GeneratePG.tsx / GenerateGO.tsx / useWizardState.ts / translations.ts. Total 127 problems unchanged. |
| F37 | `npm run build` (tsc -b && vite build) exits 0. | YES. |

### Regression surfaces

| # | Claim | Verified |
|---|---|---|
| G38 | Existing-deck flow ships Niveau correctly. | YES — non-quick path uses `buildPayload` which includes `lyric_mode` when set. |
| G39 | Skin toggle mid-wizard state-carry — state is per-page-mount (not regressed; was already per-mount). | YES — each page holds its own `useState`/`useReducer`. |
| G40 | Quick-generate still skips Niveau. | YES — Classic overwrites `settings_override = {}`; Glassy gates with `!isQuickGenerate`. |

### Adversarial probes

| # | Probe | Result |
|---|---|---|
| H41 | Classic: pick Song → back → pick Auto → continue. Payload omits `lyric_mode`? | YES — `SET_LYRIC_MODE { mode: null }` sets lyricMode null → `\|\| undefined` → key omitted. No stale "dramatic" leak. |
| H42 | Glassy: scroll up via breadcrumb from Genre (step 6) to Niveau (step 5). State preserved? | YES — `setStep(5)` at line 559, `lyricMode` useState is untouched. |
| H43 | Glassy: locale switch mid-wizard. `lyricMode` state is a literal backend token (`"dramatic"`), not a label — persists across locale change. Bubble labels in Glassy are hardcoded EN (by design). | YES. |
| H44 | Rogue `t(...)` in Glassy Niveau? | NO rogue calls. Lines 529–569 are all hardcoded English, consistent with rest of Glassy. |

## 5. Grep / command transcripts

```
$ git log origin/main --oneline -5
3a4755b feat(generate): Niveau wizard step (Classic + Glassy)
1963f57 merge: feat/lyric-levels-backend — Niveau lyric levels (backend)
b2c5153 fix(grok): stabilize callback identities to prevent session self-tear-down on open
7047778 fix(grok): parse top-level client_secret value per xAI/OpenAI GA shape
6c4d1fb feat(orchestrator): thread identity into image/video/assembly/bookend payloads (Stage 2 Phase A)

$ git rev-parse HEAD  → 3a4755b6cb307a42d1df9e657176c1596f40911c
$ git rev-parse origin/main → 3a4755b6cb307a42d1df9e657176c1596f40911c

$ git diff b2c5153..1963f57 --stat
 FIX_REPORT_LYRIC_LEVELS_BACKEND.md            | 118 ++++
 IMPLEMENTATION_REPORT_LYRIC_LEVELS_BACKEND.md | 213 +++++++
 cloud_engines/concept_engine/engine.py        |  12 +-
 cloud_engines/concept_engine/lyrics.py        | 177 +++++-
 cloud_engines/concept_engine/templates.py     | 184 +-----
 job_runner.py                                 |   4 +
 tests/fixtures/level1_golden.json             |  14 +
 tests/test_concept_lyric_levels.py            | 768 ++++++++++++++++++++++++++
 8 files changed, 1283 insertions(+), 207 deletions(-)

$ git diff 1963f57..3a4755b --stat
 frontend/src/components/generate/useWizardState.ts |  8 +++
 frontend/src/lib/translations.ts                   | 39 +++++++++++
 frontend/src/pages/GenerateGO.tsx                  | 77 ++++++++++++++++----
 frontend/src/pages/GeneratePG.tsx                  | 75 +++++++++++++++++--
 4 files changed, 182 insertions(+), 17 deletions(-)

$ git show origin/main:job_runner.py | sed -n '93,103p'
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

$ grep -n "niveau\|stepNiveau\|chooseNiveau" frontend/src/lib/translations.ts (via Bash output above)
120: EN 'generate.stepNiveau'
123–134: EN 12 niveau keys
645: DE 'generate.stepNiveau'
646–657: DE 12 niveau keys
836: FR 'generate.stepNiveau'
839–850: FR 12 niveau keys
Total: 13 × 3 = 39 added translation entries (matches diff stat +39).
```

Step renumbering sites (Classic `pgStep`, file lines from GeneratePG.tsx):
- `setPgStep(1)` → 61, 76, 241
- `setPgStep(2)` → 250
- `setPgStep(3)` → 258
- `setPgStep(4)` → 265
- `setPgStep(5)` → 272  (NEW — past Niveau into Music)
- `setPgStep(6)` → 279  (past Music into Review)
- render gates `pgStep === N`: 237(0), 245(1), 253(2), 261(3), 268(4), 275(5), 282(6)

Step renumbering sites (Glassy `step`, file lines from GenerateGO.tsx):
- `setStep(1)` → 131
- `setStep(2)` → 73, 87, 135, 431
- `setStep(3)` → 169, 184
- `setStep(4)` → 193, 200, 521
- `setStep(5)` → 213, 220, 559  (NEW — Niveau, and handleArtStyleSelect→Niveau)
- `setStep(6)` → 230, 238  (Genre)
- `setStep(7)` → 238, 245  (Initialize — moved from 6)
- `orbClass(1/3/6, …)` → 405, 447, 579
- sectionRefs `[0..6]` → 399, 417, 441, 475, 531, 573, 607

## 6. Test results

```
$ .venv/Scripts/pytest.exe tests/test_concept_lyric_levels.py
============================= test session starts =============================
platform win32 -- Python 3.14.3, pytest-9.0.3, pluggy-1.6.0
rootdir: D:\CODING\ResonanceTEST\orchestrator
configfile: pyproject.toml
plugins: anyio-4.12.1
collected 33 items

tests\test_concept_lyric_levels.py .................................   [100%]

============================= 33 passed in 0.91s ==============================
```

```
$ cd frontend && npx tsc --noEmit ; echo "tsc: $?"
tsc: 0
```

```
$ cd frontend && npm run build 2>&1 | tail
... 2441 modules transformed.
dist/index.html                     0.74 kB │ gzip:   0.41 kB
dist/assets/index-CHeZuSVY.css    175.45 kB │ gzip:  26.52 kB
dist/assets/index-BKsM-wgw.js   1,363.46 kB │ gzip: 394.26 kB
[INEFFECTIVE_DYNAMIC_IMPORT] Warning: src/lib/supabase.ts (pre-existing, unrelated)
(!) Some chunks are larger than 500 kB after minification. (pre-existing warning)
✓ built in 586ms
build_exit: 0
```

```
$ cd frontend && npm run lint 2>&1 | tail -5
✖ 127 problems (110 errors, 17 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.
lint_exit: 0
```
No lint findings inside `GeneratePG.tsx`, `GenerateGO.tsx`, `useWizardState.ts`, or `translations.ts`.
