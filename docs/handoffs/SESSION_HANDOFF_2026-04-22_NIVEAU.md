# SESSION HANDOFF — 2026-04-22 — Niveau Lyric Levels Feature

## Session Summary

Designed and shipped the backend for the Niveau (lyric levels) feature across one extended session. Investigation → implementation → adversarial review → fix → merge ready. Frontend and auto-mode addendum are the next work.

---

## What Got Shipped

### Backend — `feat/lyric-levels-backend` branch (ready to merge)

**Core design decisions:**
- Four lyric levels mapped onto existing `lyric_mode` values: Standard → `reliable`, Phrase → `contextual`, Story → `creative`, Song → `dramatic` (repurposed from template to LLM).
- No new Pydantic field — wizard reuses existing `lyric_mode`.
- For LLM modes (`contextual`, `creative`, `dramatic`): one LLM call produces the same lyric string, written to both `lyrics` and `suno_lyrics` fields.
- `[Intro]` opener with article-prefixed target word is **deterministically prepended in post-processing**, not requested via LLM prompt instruction. LLM writes whatever it wants; parser strips any leading `[Intro...]` section the LLM produced and prepends our own.
- `max_tokens` raised from 512 to 1024 for the lyrics LLM call.
- Old `generate_dramatic()` template (+ `_dramatic_no_chop`, `_dramatic_with_chop`) deleted.
- `dramatic` prompt receives resolved `music_caption` so structure adapts to genre (verse/chorus for pop, sparser for orchestral, etc.).

**LLM call count per word** (production path with external_music_caption from storyboard):
- `reliable` (Level 1): 0 LLM calls — fully template-based, unchanged.
- `contextual` / `creative` / `dramatic` (Levels 2–4): 1 LLM call each.

**Bonus fix discovered during implementation:** The `SETTINGS_OVERRIDE_MAP` in `job_runner.py` was silently ignoring per-job overrides for `lyric_mode` (and several other concept settings) on `main`. Users on resonanz.pro who ever tried to override `lyric_mode` from the wizard were silently getting the profile default. Jay's addition of `"lyric_mode": ("concept", "lyric_mode")` to the map fixes this for lyric_mode specifically. The other admin-only settings (`vocal_gender`, `caption_style`, `syllable_chop`, `duration`, `visual_hint`, `use_art_style`, `art_style_hint`, `llm_model`) still have the same silent-drop bug but are out of scope for this feature.

**Files modified (in `orchestrator/`):**
- `cloud_engines/concept_engine/lyrics.py` — dispatch change, new prompt functions, `_prepend_intro_opener`, wiring into `_generate_llm_path`
- `cloud_engines/concept_engine/templates.py` — deleted `generate_dramatic` and helpers
- `cloud_engines/concept_engine/engine.py` — unified write of lyrics to both fields for LLM modes
- `job_runner.py` — `SETTINGS_OVERRIDE_MAP` fix
- `tests/test_concept_lyric_levels.py` — 33 tests (29 new + 4 refactored)
- `tests/fixtures/level1_golden.json` — seeded golden for Level 1 regression

**Commits:**
- `cf0da5a` — initial Niveau backend implementation
- `c03e14f` — post-review fix (opener strategy change + test strengthening)
- `cc674ac` — FIX_REPORT hash backfill

**Branch status:** Ready to merge to `main`. Merge prompt prepared (see `MERGE_LYRIC_LEVELS_BACKEND.md`).

---

## What Is NOT Yet Built

### Frontend — Niveau wizard step
The wizard does not yet offer level selection. Currently the only way to get Level 2/3/4 output is to set `lyric_mode` in the admin language profile. This is fine for testing but blocks real users from using the feature.

**Needs building:**
- A new wizard step between Kunststil (art style) and Musik (genre).
- Five bubbles: **Auto · Standard · Phrase · Story · Song**. (See auto-mode discussion below — the auto bubble is the reason this is 5 not 4.)
- Both skins: `Generate.tsx` (Classic) AND `GenerateGO.tsx` (Glassy). Possibly also `GeneratePG.tsx` — the investigation couldn't confirm whether it's live. Agent must trace App.tsx routing to confirm.
- Progress chip row updated to include Niveau between Kunststil and Musik.
- Translation keys for EN / DE / FR.
- Wizard reducer extended with a new action.
- Submission payload must send `lyric_mode` (not `level`) to match the backend field name.

Frontend implementation prompt NOT written yet. Write in next session.

### Auto mode — the real product win
**What the user needs:** when they hit Quick Generate or select Auto in the wizard, they should NOT get repetitive word-only output (current reliable behavior). They should get something better.

**Proposed design (discussed but not implemented):**
Auto mode feeds the storyboard output into the concept engine's lyrics call so lyrics are tailored to the visual and musical world of the generated video. Currently the concept engine only receives `external_music_caption` from the storyboard. We extend this to also pass scene descriptions and creative direction.

**Two architectural options considered:**
1. **Bundle lyrics into the storyboard LLM call.** One LLM call total. Cheaper but muddies both outputs because the LLM is juggling too much in one go.
2. **Keep two LLM calls but feed storyboard context into the concept engine's call.** ~500 extra tokens of context per word. Each call stays focused. Recommended.

**Recommendation for next session: option 2.** Storyboard runs first, its output (scene descriptions, creative direction, music caption) gets passed as context into the concept engine's lyrics LLM call. The lyrics describe the world the video shows — "the parrot flying through the jungle" for a literal parrot storyboard, or "the parrot in a surreal supermarket" if the creative direction went that way.

**Auto-mode level selection:** The concept engine's LLM call (now armed with storyboard context) picks the appropriate level for the word semantically. Concrete nouns → Phrase. Abstract concepts → Story. Rich/idiomatic/emotional words → Song. Fallback if picker fails: Phrase (never Standard — repetition-only is a deliberate choice, not a default).

**Status:** Design discussed, NOT implemented. Needs an investigation + implementation + review cycle of its own, separate from the frontend prompt.

---

## Immediate Next Steps (in order)

1. **Merge the branch.** The merge prompt is ready at `/mnt/user-data/outputs/MERGE_LYRIC_LEVELS_BACKEND.md`. Hand it to an agent.
2. **Admin-driven testing on resonanz.pro.** After Vercel + Railway deploy the merged main:
   - Set a language profile's `lyric_mode` to `dramatic` in admin.
   - Generate a test word with rich semantic content. Candidates: "Verzweiflung" (despair), "Sehnsucht" (longing), "warm", "Arzt". Generate one from each bucket to sanity-check.
   - Play the full song on the Music page.
   - Play the deck-view video (first 15 seconds). **Critical check:** does the target word land in the first few seconds of the clip? If the user hears a 10-second instrumental intro before "Arzt" is sung, the `[Intro]` tag is misleading Suno — write the addendum prompt (trivial: remove the `[Intro]` tag from the prepend, keep just `{article} {word}\n\n`).
   - Cycle through `contextual` and `creative` too. Check the quality.
3. **Report findings back to Claude in next session.** With whatever output examples, good or bad.

---

## Work Queued for Next Session

Two prompts, can be written in parallel:

### A. Frontend Niveau wizard step
- Five bubbles (Auto · Standard · Phrase · Story · Song) between Kunststil and Musik.
- Both skins.
- Sends `lyric_mode` value directly (not a new field).
- Auto bubble is default-selected; when Auto is sent, the backend treats it as "use profile default" today, and later (after auto-mode is built) will route through the storyboard-aware picker.

### B. Auto-mode backend addendum
- Extend the concept engine's LLM prompt construction to accept storyboard context (scene descriptions, creative direction) in addition to the music_caption it already gets.
- Add a new auto-mode routing path: when `lyric_mode == "auto"` (new enum value), the concept engine's LLM call picks the semantic level AND writes the lyrics in one call, using storyboard context.
- This requires adding `"auto"` to the `ConceptSettings.lyric_mode` allowed values, adding the new routing branch, writing a new prompt template that asks the LLM to both pick a level and produce lyrics matching that level + the storyboard.
- Needs investigation first to trace exactly how storyboard output flows to the concept engine today and where the extension point is.

### Order
Frontend first (faster to ship, unblocks users), auto-mode addendum second (bigger change, benefits from having real user behavior on levels to inform the picker logic).

---

## Key Reference Files

Attach to next session's chat:
- Merge prompt: `MERGE_LYRIC_LEVELS_BACKEND.md`
- Investigation report from this session: `INVESTIGATION_REPORT_LYRIC_LEVELS.md` (in repo root)
- Backend implementation report: `IMPLEMENTATION_REPORT_LYRIC_LEVELS_BACKEND.md` (in repo root)
- Adversarial review report: `REVIEW_REPORT_LYRIC_LEVELS_BACKEND.md` (in repo root)
- Fix report: `FIX_REPORT_LYRIC_LEVELS_BACKEND.md` (in repo root)
- Backend implementation prompt (v2): the version written in this chat — can be regenerated if lost
- Fix prompt: `FIX_LYRIC_LEVELS_BACKEND.md` — the version written in this chat

---

## Open Questions for Next Session

1. **Test results.** Did admin-driven testing of dramatic mode produce good output? Did the target word land in the first seconds of the clip, or was there an instrumental intro problem?
2. **Auto mode LLM call approach.** Confirm option 2 (storyboard context fed into concept engine's call). Open the investigation prompt for this.
3. **Frontend routing mystery.** `GeneratePG.tsx` exists but isn't routed from App.tsx. Is it dead code, or is it mounted indirectly? The frontend implementation prompt must resolve this.
4. **Classic wizard is Generate.tsx or GeneratePG.tsx?** Investigation couldn't determine. Agent must trace live routing.

---

## Reminders for Future-Robert

- The frontend is the only thing blocking users from actually using this feature. Admin-set `lyric_mode` works but only Sir Robert can set it — real users see reliable mode for every word until the wizard step ships.
- The `SETTINGS_OVERRIDE_MAP` has seven other silently-ignored concept settings (`vocal_gender`, `caption_style`, etc.). Not urgent since they're admin-only, but worth fixing during a cleanup pass.
- The dev tree at `engines/concept-engine/` is drifted from production and should be consolidated. Separate task from Niveau work.
- The 2 pre-existing `test_orchestration_music_state.py` failures are Windows path issues unrelated to any current work.

End of handoff.
