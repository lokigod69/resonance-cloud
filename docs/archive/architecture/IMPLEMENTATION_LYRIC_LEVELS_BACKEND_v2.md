# IMPLEMENTATION — Lyric Levels (Niveau) — BACKEND (v2)

**Type:** Implementation. Production tree only. Branch + commit only — no push. Adversarial review runs against the branch before merge.
**Branch name:** `feat/lyric-levels-backend`
**Repos in scope:** `lokigod69/resonance-cloud` only.
**Companion document:** `INVESTIGATION_REPORT_LYRIC_LEVELS.md` — read it first.
**Frontend prompt:** Comes after this one is merged. Do NOT touch `orchestrator/frontend/`.
**Supersedes:** v1 of this prompt. v1 described two separate LLM calls per word (one for `lyrics`, one for `suno_lyrics`); that was wrong. v2 unifies them.

---

## 0. Context

A new user-facing feature called **Niveau** adds a difficulty selector to the Generate wizard. Four levels, mapped to existing `lyric_mode` values:

| Wizard label | `lyric_mode` value | LLM calls (with external_music_caption) | Today's behavior | New behavior |
|---|---|---|---|---|
| **Standard** | `reliable` | 0 | Template. | UNCHANGED. |
| **Phrase** | `contextual` | 1 | LLM, short phrases. | LLM prompt gets `[Intro]` opener. |
| **Story** | `creative` | 1 | LLM, poetic short. | LLM prompt gets `[Intro]` opener + chorus repetition. |
| **Song** | `dramatic` | 1 | Template, exclamations. | REWRITTEN to LLM with `[Intro]` opener + music_caption context. |

**No new Pydantic field.** The wizard reuses the existing `lyric_mode` field. Override flow (wizard → `settings_override` → `merge_settings` → engine) already works for this field; must be verified to still work after the `dramatic` rewrite.

**Unified output design.** For Levels 2, 3, and 4 — the three LLM modes — the SAME lyric string is written to BOTH the `lyrics` field AND the `suno_lyrics` field of the concept artifact. ONE LLM call produces both. Suno and any downstream reader get the same text. No second LLM call, no duplicate generation. For Level 1, both fields continue to be produced by their existing separate templates (no change).

**Production-only scope.** Production uses `DISPATCH_MODE=direct` and imports from `orchestrator/cloud_engines/concept_engine/`. Do NOT modify `engines/concept-engine/` (dev tree). The dev UI's `dramatic` dropdown will be stale — acceptable; it's being cleaned up in a separate task.

---

## 0.1 Answers to Pre-Flight Clarifications (raised by the implementing agent)

1. **Branch name.** `feat/lyric-levels-backend`.
2. **Unification decision.** The v1 prompt described two separate LLM calls per word (one for `lyrics` via existing path, one for `suno_lyrics` via new dispatch). **That was wrong.** Correct design: one LLM call per LLM-mode word, output written to both fields. Sections 2 and 3 below describe this.
3. **Dev UI dropdown.** Leave stale. Dev tree deprecation handles it later.
4. **Investigation open questions.** #1 LLM-based Level 4, #2 pass caption in, #3 delete dramatic template, #6 raise to 1024 tokens — answered. #4 default level — N/A because no new field (existing `DEFAULT_SETTINGS["concept"]["lyric_mode"] = "reliable"` gives Level 1 semantics to existing decks). #5 Classic wizard — frontend-only, deferred to next prompt. #7 lyrics display — deferred future feature.

---

## 1. Pre-Flight (READ-ONLY)

Before any code change, verify the live tree matches the investigation report. If anything has drifted, STOP and report back. Do not proceed.

| File | What to verify |
|---|---|
| `orchestrator/cloud_engines/concept_engine/models.py` | `ConceptSettings.lyric_mode` allowed values include `"dramatic"`. Artifact shape matches report. |
| `orchestrator/cloud_engines/concept_engine/engine.py` | `generate_concept()` flow ~L46–200. `suno_lyrics` generated at L180–183. `generate_lyrics()` called for `lyrics`. `article` resolved at ~L102 via `resolve_article()`. |
| `orchestrator/cloud_engines/concept_engine/lyrics.py` | Dispatch at L159. `_generate_llm_path()` at L183. `external_music_caption` handling at L64–202. `max_tokens=512` at ~L202. `TEMPLATE_MODES` tuple at L34 includes `"dramatic"`. |
| `orchestrator/cloud_engines/concept_engine/templates.py` | `generate_suno_lyrics()` at ~L658, `generate_phrase_suno_lyrics()` at ~L693, `generate_dramatic()` at ~L477, `_dramatic_no_chop()` at ~L507, `_dramatic_with_chop()` at ~L613. |
| `orchestrator/cloud_engines/concept_engine/article.py` | `resolve_article()` + `ARTICLELESS_LANGUAGES` set. |
| `orchestrator/src/settings.py` | `DEFAULT_SETTINGS["concept"]["lyric_mode"]` is `"reliable"`. |
| `orchestrator/src/cloud_dispatcher.py` | `DISPATCH_MODE` is `"direct"` in production env. |
| Tests under `orchestrator/cloud_engines/concept_engine/tests/` | Inventory dramatic-specific tests. They will be deleted/replaced. |

After pre-flight, either confirm alignment in the implementation report, or enumerate discrepancies and stop.

---

## 2. The Unified LLM Path

### 2.1 Move `dramatic` from template-mode to LLM-mode

- `TEMPLATE_MODES` tuple at `lyrics.py:34` today is `("minimal", "standard", "dramatic", "reliable")`. Remove `"dramatic"`. New: `("minimal", "standard", "reliable")`.
- At `lyrics.py:159` dispatch, route `lyric_mode == "dramatic"` into the LLM path (the same `_generate_llm_path()` that `contextual` and `creative` use), with a new prompt template.
- The string `"dramatic"` remains in `ConceptSettings.lyric_mode` allowed-values tuple at `models.py:78`. Do NOT remove it from there.

### 2.2 Delete the old `dramatic` template

Delete:
- `generate_dramatic()` at `templates.py:477`
- `_dramatic_no_chop()` at `templates.py:507`
- `_dramatic_with_chop()` at `templates.py:613`
- Any private helpers used ONLY by the above three. If a helper is shared with another template (e.g. `generate_minimal`, `generate_standard`), leave it.
- Unit tests asserting the old `dramatic` template output. New tests cover the new LLM behavior (Section 5).

### 2.3 Add the `[Intro]` opener to `contextual` and `creative` prompts

The existing prompts at `lyrics.py:277` (contextual) and `lyrics.py:313` (creative) must be modified to instruct the LLM to produce `[Intro]\n{article} {word}` as the very first section. The rest of each prompt is left intact.

For article-less languages and phrases, `article` is empty and the opener is `[Intro]\n{word}` with no leading space.

**Opener rule to splice into both prompts** (agent integrates cleanly into the existing template strings):

```
IMPORTANT — STRUCTURE RULE:
The very first section of the lyrics MUST be:
[Intro]
{article} {word}
If ARTICLE is empty, use just "{word}" on the second line (no leading space).
This section must come before any [Verse], [Chorus], [Spoken Word], or [Outro] tag.
```

### 2.4 New `dramatic` (Song) prompt template

Add a new prompt builder function in `lyrics.py` alongside `_contextual_lyrics_prompt()` and `_creative_lyrics_prompt()`. Name suggestion: `_dramatic_lyrics_prompt()`. It must accept `music_caption` as a parameter — the others do not.

Prompt body (agent may adjust wording for consistency with existing prompt style; semantics must stay as written):

```
You are writing full song lyrics for a vocabulary learning music video.

TARGET WORD: {word} ({translation})
LANGUAGE: {language}
ARTICLE (use only if non-empty): {article}
MUSIC STYLE: {music_caption}

Write a real, full-length song that follows these rules EXACTLY:

1. The very first section MUST be:
   [Intro]
   {article} {word}
   If ARTICLE is empty, use just "{word}" on the second line (no leading space).

2. After the [Intro], write a full song. The target word should be a thematic
   anchor, appearing multiple times across the song, but the lyrics should feel
   like a real song about that word's meaning, not a vocabulary drill.

3. Match the song's structure to the music style described above:
   - Pop / rock / folk: tight verse + chorus + bridge structure.
   - Rap / hip-hop / techno: looser, denser flow with fewer hard section breaks.
   - Orchestral / cinematic / ambient: sparser lines, more breathing room.
   - Jazz / R&B: organic structure, hook-driven.

4. Use Ace-Step section tags appropriate to the structure: [Verse], [Chorus],
   [Bridge], [Pre-Chorus], [Outro], etc.

5. The target word must appear at least 8 times across the full lyrics.

6. Use natural, song-like {language} lyrics.

7. NEVER include translation, English words (unless target language is English),
   or words from any other language.

8. Output ONLY the lyrics, no commentary.
```

### 2.5 Wire `music_caption` into the dramatic path

The existing `_generate_llm_path()` function does NOT pass `external_music_caption` into the lyrics prompt body today. For the dramatic case, it must.

Two cases:

- **`external_music_caption` is provided** (storyboard upstream — the normal production case). Use it as the `music_caption` value in the new dramatic prompt.
- **`external_music_caption` is NOT provided** (defensive — rare in production). The existing code already handles this for contextual/creative by using a combined prompt that produces caption + lyrics in one LLM call. For dramatic, use the same pattern: let the LLM produce both, then use the generated caption as the `music_caption` context self-consistently. The agent must verify the existing combined-prompt path is compatible with the dramatic prompt rules, and adjust if needed.

In either case, still exactly ONE LLM call per word at `lyric_mode == "dramatic"`.

### 2.6 Raise `max_tokens` from 512 to 1024

At `lyrics.py:~202`, change the LLM call's `max_tokens` from `512` to `1024`. This is a global change for the lyrics LLM path; do NOT touch the caption-only call in `caption.py`. Levels 2 and 3 will continue to finish well under the new ceiling; Level 4 needs the headroom.

### 2.7 Write the LLM output to BOTH `lyrics` and `suno_lyrics`

This is the core unification.

In `engine.py`, after `generate_lyrics()` returns its result for `lyric_mode` in `("contextual", "creative", "dramatic")`:

- Write the returned lyrics string to `ConceptArtifact.lyrics` (as today).
- **Also** write the SAME string to `ConceptArtifact.suno_lyrics`, replacing the template-based `generate_suno_lyrics()` or `generate_phrase_suno_lyrics()` call for those modes.

For `lyric_mode == "reliable"` (Level 1), do NOT unify. Keep both the existing `generate_reliable()` call for `lyrics` AND the existing `generate_suno_lyrics()` / `generate_phrase_suno_lyrics()` template call for `suno_lyrics`. Level 1 behavior is preserved exactly.

The existing phrase branch at `engine.py:180-183` (which today routes to `generate_phrase_suno_lyrics()` unconditionally) becomes:

- If `lyric_mode == "reliable"` and `is_phrase`: use `generate_phrase_suno_lyrics()` for `suno_lyrics` (today's behavior).
- If `lyric_mode` is in `("contextual", "creative", "dramatic")`: use the unified LLM result for both fields. The phrase vs word distinction is now inside the LLM prompt (the prompt receives `phrase` or `word` as the target content — for phrases, `article` is empty and the opener is just the phrase).

The agent must verify that the existing `_generate_llm_path()` already handles phrases correctly, or adjust the prompt templates to accept a phrase as the target.

### 2.8 Preserve the existing `external_music_caption` caption-skipping logic

Today, when `external_music_caption` is provided, `contextual` and `creative` modes skip the caption portion of their LLM call (lyrics-only). Preserve this. The dramatic mode follows the same pattern: if `external_music_caption` is provided, the dramatic LLM call is lyrics-only and uses the external caption as `{music_caption}` in the prompt.

---

## 3. Verification (REQUIRED)

After implementation, the agent must verify each of these with a written test or a documented manual trace. Report each explicitly in the implementation report.

### 3.1 Override flow (critical)

> When `DEFAULT_SETTINGS["concept"]["lyric_mode"] = "reliable"` AND a job arrives with `settings_override.concept.lyric_mode = "dramatic"`, the value reaching `generate_concept()` is `"dramatic"`. The engine dispatches to the new LLM dramatic path, NOT the old (deleted) template.

### 3.2 LLM call count per mode

For one word generation with `external_music_caption` provided (normal production path), log or assert the LLM call count:

| Mode | Expected LLM calls |
|---|---|
| `reliable` | 0 |
| `contextual` | 1 |
| `creative` | 1 |
| `dramatic` | 1 |

If any mode exceeds its expected count, the unification is wrong — fix it.

### 3.3 Output consistency

For a single word at `lyric_mode in ("contextual", "creative", "dramatic")`:

- `artifact.lyrics == artifact.suno_lyrics` (byte-equal, same LLM output).
- Both start with `[Intro]\n{article} {word}` (or `[Intro]\n{word}` for article-less languages).

For `lyric_mode == "reliable"`:

- `artifact.lyrics` is the `generate_reliable()` template output (today's behavior).
- `artifact.suno_lyrics` is the `generate_suno_lyrics()` template output (today's behavior).
- They may or may not be identical — no unification for Level 1.

### 3.4 `dramatic` prompt includes music_caption

Mock the LLM client. Call `generate_concept()` with `lyric_mode="dramatic"` and an `external_music_caption` like `"melodic techno at 128 BPM, female vocal, ethereal synths"`. Assert the prompt sent to the LLM contains that caption string.

### 3.5 Article-less language

Mock the LLM client. Call `generate_concept()` with a Korean word at `lyric_mode="contextual"`. Assert the prompt instructs the LLM to use `[Intro]\n{word}` format (no article, no leading space) and that `article` in the prompt template is empty.

### 3.6 Phrase + Level 4

Mock the LLM client. Call `generate_concept()` with an English phrase ("I love pizza") at `lyric_mode="dramatic"`. Assert the prompt treats the phrase as the target content, the `[Intro]` section uses the bare phrase, and `music_caption` is threaded through.

### 3.7 Level 1 regression

Run `generate_concept()` with a German word at `lyric_mode="reliable"`. Compare `artifact.lyrics` and `artifact.suno_lyrics` against saved golden outputs from before the change. They must be byte-identical.

---

## 4. What NOT to Change

- **Frontend.** Do NOT modify any file under `orchestrator/frontend/`.
- **Dev tree.** Do NOT modify any file under `engines/concept-engine/`.
- **Other engines.** Image, video, assembly, bookend, song. Out of scope.
- **`reliable`, `minimal`, `standard` modes.** `reliable` is Level 1, exact behavior preserved. `minimal` and `standard` are unused-by-wizard but stay in the codebase untouched.
- **`generate_suno_lyrics()` and `generate_phrase_suno_lyrics()` templates.** Preserved for Level 1. Do NOT modify.
- **`SETTINGS_OVERRIDE_MAP` in `job_runner.py`.** No new entries.
- **Pydantic model field additions.** No new fields in `ConceptSettings`. Only allowed change to `lyric_mode`'s allowed-values tuple is keeping it exactly as today (all six values).
- **Supabase migrations.** None.
- **`suno.py`.** Consumer-side is unchanged; Suno reads `suno_lyrics` from the artifact as always.
- **Caption generation for non-dramatic modes.** Unchanged.
- **`caption.py` `max_tokens`.** Unchanged (the 1024 bump is for `lyrics.py` only).
- **Git push.** Branch + commit only.

---

## 5. Test Plan

In addition to the verification in Section 3:

1. **Unit test for dispatch.** Parameterize over all six `lyric_mode` values. Assert that `reliable`/`minimal`/`standard` go to template path; `contextual`/`creative`/`dramatic` go to LLM path.
2. **Unit test for opener instruction in each LLM prompt.** Build the prompt for each of the three LLM modes with a sample word + article. Assert the string `[Intro]` appears in the prompt body and the article+word instruction is present.
3. **Unit test for `music_caption` wiring.** Assert the dramatic prompt template substitutes `music_caption` correctly when the parameter is provided.
4. **Integration test for unification** (covers 3.3).
5. **Integration test for article-less language** (covers 3.5).
6. **Integration test for phrase + dramatic** (covers 3.6).
7. **Regression test for Level 1** (covers 3.7).
8. **Delete the old dramatic tests** (Section 2.2).

---

## 6. Deliverable

A single branch `feat/lyric-levels-backend` with:

- All code changes.
- Updated tests (deletions + additions).
- `IMPLEMENTATION_REPORT_LYRIC_LEVELS_BACKEND.md` at repo root containing:
  - Pre-flight confirmation (Section 1).
  - List of every file modified, one-line summary each.
  - Results of each verification in Section 3.
  - Results of each test in Section 5.
  - Any deviations from this prompt and why.
  - Any open questions for Sir Robert that emerged during implementation.

---

## 7. Hard Rules

- **No git push.** Branch + commit. Adversarial review happens before merge.
- **Read live code at pre-flight.** Every line number in this prompt comes from the investigation report; verify against the live tree at the start.
- **No assumptions.** If something cannot be confirmed from code, write "AGENT: Could not verify — [reason]" in the report, do not guess.
- **No scope creep.** Unrelated bugs you spot go into the "deviations / observations" section of the report, not into the branch.
- **Verify with your own eyes.** Don't claim a function exists without opening the file. Don't claim a test passes without running it.

End of backend implementation prompt v2.
