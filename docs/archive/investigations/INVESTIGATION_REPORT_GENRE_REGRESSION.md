# Investigation Report: Custom Genre Regression (Glassy Skin)

## 1. Verdict

**`PRE-EXISTING_NOT_OUR_REGRESSION`** — Frontend bug, Glassy skin only.

The custom genre value never reached the database. The `settings_override` column for Sir Robert's submitted job contains `{"lyric_mode": "dramatic"}` but **no `genre` key at all**. The Niveau frontend commit (`3a4755b`) did not introduce this bug — the responsible code (`handleCustomGenreConfirm` in GenerateGO.tsx) was identical before and after the Niveau changes. The same bug existed in every prior version of the Glassy skin. Classic skin is unaffected because it uses a fundamentally different pattern that correctly writes the resolved genre string into state.

---

## 2. The Decisive Evidence

### Sir Robert's submitted job — verbatim Supabase dump

```json
{
    "id":       "d5e8ba54-5bf2-496e-81de-c015ac68f706",
    "deck_id":  "b8cf17ab-1f52-4b63-9ce2-2266f152b8f9",
    "settings_override": {
        "lyric_mode": "dramatic"
    },
    "target_language": "English",
    "status":     "complete",
    "created_at": "2026-04-22T20:34:13.071347+00:00"
}
```

### Deck contents (confirmation this is the "fun" deck)

```json
{
    "id":         "b8cf17ab-1f52-4b63-9ce2-2266f152b8f9",
    "name":       "English Deck - 4/23/2026",
    "word_count": 1
}
```

```json
[{ "word": "fun" }]
```

**`settings_override.genre` is absent.** This means the frontend never included a `genre` key in the payload. The backend is exonerated — it never had the chance to ignore the genre because it never received one. This is **Branch B: frontend bug**.

---

## 3. Code Trace

### The genre state flow in Glassy (GenerateGO.tsx)

The Glassy skin manages genre via two separate `useState` hooks:

| State variable | Type | Set by |
|---|---|---|
| `genre` | `string \| null` | `handleGenreSelect()` (line 233) |
| `customGenre` | `string` | `onChange` handler on custom input (line 591) |

**[GenerateGO.tsx:225-240](file:///d:/CODING/ResonanceTEST/orchestrator/frontend/src/pages/GenerateGO.tsx#L225-L240)** — `handleGenreSelect`:
```tsx
function handleGenreSelect(value: string) {
    // ...deselect guard...
    setGenre(value)           // ← sets genre to 'custom' (the literal string)
    if (value === 'custom') {
      setShowCustomInput(true)  // shows the text input
    } else {
      setShowCustomInput(false)
      setStep(7)
    }
  }
```

**[GenerateGO.tsx:242-247](file:///d:/CODING/ResonanceTEST/orchestrator/frontend/src/pages/GenerateGO.tsx#L242-L247)** — `handleCustomGenreConfirm`:
```tsx
function handleCustomGenreConfirm() {
    if (customGenre.trim()) {
      setShowCustomInput(false)
      setStep(7)               // advances to submit
    }
    // ⚠️ DOES NOT CALL setGenre(customGenre.trim())
    // genre state remains 'custom' (the literal string)
  }
```

**[GenerateGO.tsx:269-273](file:///d:/CODING/ResonanceTEST/orchestrator/frontend/src/pages/GenerateGO.tsx#L269-L273)** — `genreValue` computation in `handleInitialize`:
```tsx
const genreValue =
    isQuickGenerate ? undefined
      : genre === 'auto' ? undefined
      : genre === 'custom' ? customGenre.trim() || undefined  // ← reads customGenre
      : genre || undefined
```

**[GenerateGO.tsx:295-298](file:///d:/CODING/ResonanceTEST/orchestrator/frontend/src/pages/GenerateGO.tsx#L295-L298)** — `settings_override` spread in payload:
```tsx
settings_override: {
    ...(creativeDirection ? { creative_direction: creativeDirection } : {}),
    ...(genreValue ? { genre: genreValue } : {}),
    ...(!isQuickGenerate && lyricMode ? { lyric_mode: lyricMode } : {}),
},
```

### The critical weakness

The `genreValue` computation at line 272 has a **fragile indirection**: it checks `genre === 'custom'` and then reads a _separate_ state variable `customGenre` to resolve the actual value. If `customGenre` is empty for any reason at submit time, `genreValue` evaluates to `undefined`, and the genre key is silently omitted from the payload spread.

Additionally, the summary tag on the review page (step 7) at **[line 637-641](file:///d:/CODING/ResonanceTEST/orchestrator/frontend/src/pages/GenerateGO.tsx#L637-L641)** displays `{genre}` — the literal string `"custom"` — instead of the user's typed value, confirming the state split:

```tsx
{genre && genre !== 'auto' && (
  <span className="gen-summary-tag"...>
    🎵 {genre}  {/* ← shows "custom", not "melodic techno" */}
  </span>
)}
```

### Why the genre was empty at submit time

The most likely scenario is that `customGenre` state was empty when `handleInitialize` fired. Possible causes:

1. **Component remount**: If any parent re-renders cause GenerateGO to remount (e.g., auth context refresh, language context change), all `useState` hooks reset to initial values. `customGenre` resets to `''` while `genre` resets to `null` — both lost. But `lyricMode` also uses `useState` and it DID persist (`"dramatic"`), so a full remount is unlikely.

2. **Input element lifecycle**: The custom genre `<input>` only renders when `showCustomInput && step === 6`. After `handleCustomGenreConfirm` sets `setShowCustomInput(false)`, the input unmounts. The React state `customGenre` should persist across unmount, but there's no controlled re-confirmation that the value survived.

3. **Edge case with `trim()`**: If the user typed "melodic techno" with trailing whitespace or special characters that `trim()` reduces to empty, `genreValue` would be `undefined`. Unlikely for "melodic techno" but theoretically possible with copy-paste artifacts.

**Regardless of the specific trigger, the root cause is the same**: Glassy uses a two-variable pattern (`genre` + `customGenre`) without ever reconciling them into a single source of truth. `handleCustomGenreConfirm` should call `setGenre(customGenre.trim())` — exactly as Classic's `confirmCustom` does.

---

## 4. Regression Source

### This is NOT a regression from the Niveau commits

The `handleCustomGenreConfirm` function was **identical** before and after the Niveau frontend commit (`3a4755b`). The Niveau commit only:
- Renumbered steps (genre moved from step 5 → step 6, submit from step 6 → step 7)
- Added the Niveau step (5) and `lyricMode` state
- Added `lyric_mode` to the `settings_override` spread

**It did NOT touch any genre-related state management, handlers, or payload construction.**

Proof — the entire Niveau diff for the genre handler section shows ONLY step number changes:

```diff
 # git diff 3a4755b~1 3a4755b -- frontend/src/pages/GenerateGO.tsx
 
   function handleCustomGenreConfirm() {
     if (customGenre.trim()) {
       setShowCustomInput(false)
-      setStep(6)
+      setStep(7)            # only the step number changed
     }
   }
```

The bug exists in every version of GenerateGO.tsx since the custom genre feature was added. It was latent and may not have been triggered before (if previous tests used preset genres rather than custom).

---

## 5. Scope

### ✅ Glassy skin ONLY — Classic is clean

**Classic (GeneratePG.tsx)** handles custom genre correctly via the `useWizardState` reducer pattern:

**[GeneratePG.tsx:629-634](file:///d:/CODING/ResonanceTEST/orchestrator/frontend/src/pages/GeneratePG.tsx#L629-L634)** — `confirmCustom` in StepMusic:
```tsx
function confirmCustom() {
    const trimmed = customText.trim().toLowerCase()
    if (!trimmed || trimmed === 'auto' || trimmed === 'custom') return
    dispatch({ type: 'SET_GENRE', genre: trimmed })  // ← writes "melodic techno" into state.genre
    setShowCustomInput(false)
}
```

After `dispatch`, `state.genre` is `"melodic techno"` (not `"custom"`). Then `buildPayload` in **[useWizardState.ts:161](file:///d:/CODING/ResonanceTEST/orchestrator/frontend/src/components/generate/useWizardState.ts#L161)**:
```tsx
const genre = state.genre === 'auto' ? undefined : state.genre || undefined
// → "melodic techno"
```

Classic has a single source of truth (`state.genre`). Glassy has two sources (`genre` + `customGenre`) that are never reconciled.

### Backend is clean

**[job_runner.py:93-94](file:///d:/CODING/ResonanceTEST/orchestrator/job_runner.py#L93-L94)** — `SETTINGS_OVERRIDE_MAP` correctly maps `"genre"` → `("concept", "genre")`:
```python
SETTINGS_OVERRIDE_MAP: dict[str, tuple[str, str]] = {
    "genre": ("concept", "genre"),
    ...
}
```

**[job_runner.py:119-127](file:///d:/CODING/ResonanceTEST/orchestrator/job_runner.py#L119-L127)** — `merge_settings()` correctly threads override values into merged config. The genre never arrived, so the backend had nothing to thread.

The backend merge (`1963f57`) added `lyric_mode` to `SETTINGS_OVERRIDE_MAP` without touching the `genre` entry. Verified via `git show 1963f57 --stat` — `job_runner.py` changed only +4 lines, all `lyric_mode`-related.

---

## 6. Proposed Fix Approach

Add a single `setGenre(customGenre.trim())` call to `handleCustomGenreConfirm` in GenerateGO.tsx, immediately before or alongside the existing `setStep(7)` call. This makes the `genre` useState hold the resolved custom genre string (e.g., `"melodic techno"`) instead of the literal `"custom"`, exactly mirroring what Classic's `confirmCustom` does via `dispatch({ type: 'SET_GENRE', genre: trimmed })`. With this change, the `genreValue` computation's `genre === 'custom'` branch becomes unreachable (since `genre` will always hold the actual value), the review page summary tag will display the real genre instead of "custom", and the payload spread will include the correct genre string in `settings_override` regardless of whether `customGenre` state is stale. The `genreValue` ternary's `genre === 'custom'` branch can optionally be kept as a safety fallback but is no longer the primary path. No backend changes are needed.
