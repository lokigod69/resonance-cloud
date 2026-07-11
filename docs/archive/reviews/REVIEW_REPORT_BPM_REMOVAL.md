# Review Report — BPM Removal from Music Caption Pipeline (commit `0647969`)

**Scope:** Adversarial read-only review of `0647969` against the spec in the prior investigation ([INVESTIGATION_REPORT_MUSIC_CAPTION.md](INVESTIGATION_REPORT_MUSIC_CAPTION.md)) and the explicit live regression Sir Robert observed. No source edits, no commits.

**Working state:** Branch `codex/glassy-deck-controls`, not `main`. Verified `0647969` is an ancestor of `origin/main`, and the four reviewed files are byte-identical between `0647969` and current branch HEAD (`git diff 0647969 HEAD -- <four files>` is empty). Review continued on the working tree as-is, since the four files reflect `0647969` exactly.

---

## Verdict

**BLOCK.** The change does not deliver what its commit message claims, and the failure mode Sir Robert observed (old cards still rendering "Electronica at 120 BPM") will persist until the frontend is fixed or the DB is backfilled.

The forward-direction prompt edits and the `suno.py` runtime strip are clean and effective for **new** words. The piece marketed as "API serve-time strip" is not a serve-time strip — it sits on the WRITE path, so it does not retroactively repair already-stored Supabase rows. The remediation strategy chosen in the commit cannot, by construction, fix the stored-artifact case.

---

## Critical findings

### C1 — `_strip_bpm` is on the WRITE path, not the read/serve path

**The commit message asserts:**

> services/metadata.py: applied the same strip at API serve-time on the music_caption field returned to the frontend, so already-stored artifacts also display without BPM on the WordCard.

**Reality:** [`_strip_bpm`](orchestrator/src/services/metadata.py#L24-L30) is called from exactly one site:

- [`collect_word_metadata`](orchestrator/src/services/metadata.py#L89-L214) at [metadata.py:164](orchestrator/src/services/metadata.py#L164).

`collect_word_metadata` itself is invoked from one site:

- [`DownstreamWorker._upload_and_complete`](orchestrator/src/orchestration/downstream_worker.py#L654-L729) at [downstream_worker.py:722](orchestrator/src/orchestration/downstream_worker.py#L722).

That call sits inside the pipeline's "uploading" stage — it runs **once per word generation, after Suno bake completes**, builds the metadata blob from filesystem artifacts (`storyboard.json`, `concept/<version>.json`, etc.), and the result is written to the `words.metadata` JSON column in Supabase. It is the **write path**, not a serve path.

**There is no FastAPI endpoint on the read side that runs `_strip_bpm` over `words.metadata.music_caption` before serving it.** The orchestrator's [`/api/words` and `/api/words/{slug}` endpoints](orchestrator/src/routers/words.py#L293-L371) (a) operate on the local filesystem workspace, not Supabase, (b) serve only the Studio app on `VITE_BACKEND_URL`, and (c) do not include `metadata` in their response shape at all.

**The deployed `resonanz.pro` frontend bypasses the backend for word reads entirely.** Every reader of `word.metadata.music_caption` calls Supabase directly:

| Reader | File:Line | Query |
|--------|-----------|-------|
| WordCard music row (Decks deep view) | [DeckViewPG.tsx:245](orchestrator/frontend/src/pages/DeckViewPG.tsx#L245), [:935](orchestrator/frontend/src/pages/DeckViewPG.tsx#L935) | `supabase.from('words').select('*').eq('deck_id', id)` |
| Music page (current) | [MusicPG.tsx:34](orchestrator/frontend/src/pages/MusicPG.tsx#L34), [:124](orchestrator/frontend/src/pages/MusicPG.tsx#L124) | `supabase.from('words').select('… metadata …')` |
| Music page (legacy) | [Music.tsx:30](orchestrator/frontend/src/pages/Music.tsx#L30), [:89](orchestrator/frontend/src/pages/Music.tsx#L89) | `supabase.from('words').select('… metadata …')` |
| Admin word detail | [WordDetailPanel.tsx:50](orchestrator/frontend/src/components/admin/WordDetailPanel.tsx#L50), [:158](orchestrator/frontend/src/components/admin/WordDetailPanel.tsx#L158) | (admin reads `word.metadata` from same Supabase rows) |
| Library card metadata expander | [WordInfoPanel.tsx:106-113](orchestrator/frontend/src/components/WordInfoPanel.tsx#L106-L113) | (consumes a `word` prop sourced from Supabase by parent) |

None of these go through `metadata.py`. None of these run `_strip_bpm`.

**Consequence — exactly the symptom observed:**

- New "gangster" word generated post-deploy → `collect_word_metadata` runs at upload-time → `_strip_bpm` cleans the caption → Supabase row has clean caption → WordCard shows clean. ✅
- Old "Electronica at 120 BPM" / "Afro House at 125 BPM" words → were uploaded **before** the deploy → Supabase row still contains BPM → frontend reads it directly → WordCard still shows BPM. ❌

**Severity:** Critical. The commit ships a write-path fix marketed as a read-path fix; there is no actual remediation for already-stored data.

**Resolution paths (any one of):**
- (a) Add a frontend-side strip in a shared utility used by all five reader sites.
- (b) Backfill `words.metadata.music_caption` in Supabase with a one-time SQL update applying the same regex.
- (c) Introduce a real backend serve endpoint that returns word metadata after stripping, and migrate the readers to use it. (Largest scope; rejects the architectural assumption baked into this codebase.)

The investigation report itself flagged this exact ambiguity at [INVESTIGATION_REPORT_MUSIC_CAPTION.md §8 Caveat](INVESTIGATION_REPORT_MUSIC_CAPTION.md): *"add #3 to strip BPM at read-time everywhere the caption is consumed (Suno **and** the API endpoint that serves `word.metadata.music_caption` to the frontend), or backfill the artifacts."* The commit attempted neither — it instrumented `collect_word_metadata`, which is neither Suno-bound nor read-time.

---

## Notable findings

### N1 — Admin "Music Caption" row shows raw value with no derivation

[WordDetailPanel.tsx:158](orchestrator/frontend/src/components/admin/WordDetailPanel.tsx#L158): `<MetaRow label="Music Caption" value={meta.music_caption as string | undefined} />`. Unlike the user-facing WordCard, this admin row shows the **full** stored caption (no `split(',')[0]`). Any read-side fix must cover this surface too, otherwise the admin view will continue showing BPM after a frontend strip even for newly generated words (since the admin sees the entire caption, not just genre).

This site is also the only user-visible reader where the entire caption matters, not just the leading segment — so a backfill is the lowest-risk option for the admin surface specifically.

### N2 — Concept Engine artifact editor (`ConceptPanel`) is unaffected and correct

[ConceptPanel.tsx:28, :60-61, :137](orchestrator/frontend/src/components/stages/ConceptPanel.tsx#L28) reads `editing.data.music_caption` from the **on-disk concept artifact JSON**, not from `words.metadata`. This is the Studio editor, not the deployed app, and is correctly not in scope for this fix. No regression.

### N3 — Test fixtures still contain BPM but tests still pass

Two fixtures intentionally embed BPM:
- [test_concept_lyric_levels.py:250-252](orchestrator/tests/test_concept_lyric_levels.py#L250-L252): `music_caption="melodic techno at 128 BPM, female vocal, ethereal synths"` — passed to `_dramatic_lyrics_prompt`, which embeds it verbatim as `MUSIC STYLE: …` for the lyrics LLM. The assertion is on substring presence, not on BPM-stripped output. The function under test does not invoke `_strip_bpm`.
- [test_concept_lyric_levels.py:473](orchestrator/tests/test_concept_lyric_levels.py#L473): golden-image fixture for `external_music_caption`. Same shape — pass-through.

Neither test is broken. Worth noting that fixtures still contain "anti-pattern" strings; a tightening pass could update them to non-BPM exemplars to reduce confusion, but this is cosmetic.

### N4 — `song_engine` and settings still expose a `bpm` field

- [song_engine/models.py:48](orchestrator/cloud_engines/song_engine/models.py#L48): `bpm: Optional[int] = Field(default=None, ge=60, le=200, description="Beats per minute. None=auto")`
- [src/settings.py:40](orchestrator/src/settings.py#L40): `"bpm": None`

These are unrelated to the music_caption pipeline — they're an explicit per-song manual tempo override that bypasses caption text. Not in scope. Flagging only because they exist and a maintainer chasing "all BPM" might be tempted to remove them; that would change Suno behavior in production.

### N5 — `_strip_bpm` and `build_suno_payload` strip are duplicated, not shared

[metadata.py:19-30](orchestrator/src/services/metadata.py#L19-L30) and [suno.py:142-146](orchestrator/src/suno.py#L142-L146) implement the same regex chain twice. The metadata.py comment says *"Mirrors the Suno-bound strip in src/suno.py:build_suno_payload — keep both in sync if either is updated."* This is a load-bearing assertion that future maintainers will violate. A shared helper (e.g., `src/utils/caption.strip_bpm`) would eliminate the drift risk. Not blocking, but the duplication adds inertia to any regex tightening.

---

## Adversarial regex test results

Tests run against the regex chain from `metadata.py` (identical to `suno.py`). All 20 cases:

| # | Input | Expected | Actual | Pass/Fail |
|---|-------|----------|--------|-----------|
| 1 | `electronica at 120 BPM, synth bass, dark` | `electronica, synth bass, dark` | `electronica, synth bass, dark` | ✅ |
| 2 | `upbeat indie pop at 120 BPM, bright acoustic guitar` | `upbeat indie pop, bright acoustic guitar` | `upbeat indie pop, bright acoustic guitar` | ✅ |
| 3 | `melancholic techno, 85 BPM, warm pad` | `melancholic techno, warm pad` | `melancholic techno, warm pad` | ✅ |
| 4 | `Afro House at 125 BPM` | `Afro House` | `Afro House` | ✅ |
| 5 | `electronica` (clean) | `electronica` | `electronica` | ✅ |
| 6 | `techno at 120bpm, dark` (no space) | `techno, dark` | `techno, dark` | ✅ |
| 7 | `melodic house, 120-130 BPM, dark` (range) | `melodic house, dark` | `melodic house, dark` | ✅ |
| 8 | `breakbeat at 140 bpm` (lowercase) | `breakbeat` | `breakbeat` | ✅ |
| 9 | `BPM 120 techno` (BPM-first) | (regex doesn't match) | `BPM 120 techno` | ⚠️ MISS |
| 10 | `techno, 120BPM, dark` (no space, comma) | `techno, dark` | `techno, dark` | ✅ |
| 11 | `pop at 100bpm and 120bpm` (two values) | (some clean form) | `pop and` | ⚠️ DANGLING |
| 12 | `soundtrack with 70bpm groove` (mid-phrase) | `soundtrack with groove` | `soundtrack with groove` | ✅ |
| 13 | `techno at 120 beats per minute` (spelled out) | (regex doesn't match) | `techno at 120 beats per minute` | ⚠️ MISS |
| 14 | `''` (empty) | `None` | `None` | ✅ |
| 15 | `None` | `None` | `None` | ✅ |
| 16 | `120 BPM` (only BPM) | `None` | `None` | ✅ (caption row hidden by `&&` guard at [WordInfoPanel.tsx:106](orchestrator/frontend/src/components/WordInfoPanel.tsx#L106) and [DeckViewPG.tsx:932](orchestrator/frontend/src/pages/DeckViewPG.tsx#L932)) |
| 17 | `Electronica at 120 BPM, bright synthesizers, German female vocal, energetic, clear diction` | (clean) | `Electronica, bright synthesizers, German female vocal, energetic, clear diction` | ✅ |
| 18 | `techno, 120 BPM, clear diction` (interaction with clear-diction strip) | `techno, clear diction` (suno strip removes "clear diction" too; here we test only BPM strip) | `techno, clear diction` | ✅ |
| 19 | `Electronica at 120 BPM` | `Electronica` | `Electronica` | ✅ |
| 20 | `cinematic at 90 BPM, sweeping strings, soaring vocal, bittersweet, clear diction` | (clean) | `cinematic, sweeping strings, soaring vocal, bittersweet, clear diction` | ✅ |

**17/20 pass cleanly.** Three deviations:

- **Case 9 — "BPM 120 techno"** (BPM-before-number form): not stripped. Real-world likelihood is low — no example caption emits this — but worth noting. The commit message claims "in any case" which is technically true (the regex is case-insensitive), but it does not handle reverse word order. Acceptable to leave; flag for future tightening.
- **Case 11 — "pop at 100bpm and 120bpm"** (two BPM values in one caption): yields `pop and`. The leading `\s*` in each pattern correctly absorbs the space before each numeric segment, but the connecting word `and` is left dangling. No BPM bleeds through, so the goal is met; the result is grammatically awkward. Acceptable; flag.
- **Case 13 — "techno at 120 beats per minute"** (spelled-out form): not stripped. Pattern is `BPM` literal only. The commit message does not claim coverage of this form; the prompts never primed it; risk of LLM emitting this spontaneously is low. Acceptable to leave.

**The commit message's claim of "9/9 test cases pass"** isn't reproducible because no test list is included. The 9 obvious in-spec cases (1–8 above + the empty/null case) all pass. The adversarial cases above expose three minor gaps.

---

## Prompt structure review

### `cloud_engines/image_engine/prompts.py:1277-1293` — `_music_caption_block`

**Status: clean.**

- All original sections preserved (genre lead, vocal/language rule, instrumentation, "clear diction" close, scene-mood matching, length budget, art_hint).
- New rule at [line 1288](orchestrator/cloud_engines/image_engine/prompts.py#L1288): `- Do NOT include BPM, tempo, or numeric values — describe energy through mood words instead`. Reads cleanly, sits next to other "must not" guidance, no contradiction with the rest of the block.
- Both example captions remain valid demonstrations of the genre-first structure ([line 1291-1292](orchestrator/cloud_engines/image_engine/prompts.py#L1291-L1292)).
- f-string interpolations (`{vocal}`, `{language}`, `{art_hint}`) intact and correct.
- No dangling commas, no broken format args.

### `cloud_engines/concept_engine/caption.py:204-234` — `_auto_genre_prompt` (vocal-forward auto)

**Status: clean.**

- Format spec at [line 223](orchestrator/cloud_engines/concept_engine/caption.py#L223) doesn't include BPM (was already vocal-led). Replacement of `Optionally include BPM…` rule with two rules — `Describe energy through mood and instrumentation rather than numeric tempo` ([line 230](orchestrator/cloud_engines/concept_engine/caption.py#L230)) and `Do NOT include BPM or numeric tempo values` ([line 231](orchestrator/cloud_engines/concept_engine/caption.py#L231)) — reads cleanly.
- "Under 20 words" budget intact ([line 227](orchestrator/cloud_engines/concept_engine/caption.py#L227)).
- "Voice description MUST come first" rule intact ([line 226](orchestrator/cloud_engines/concept_engine/caption.py#L226)).

### `caption.py:237-266` — `_manual_genre_prompt` (vocal-forward manual)

**Status: clean.** Same edit shape as `_auto_genre_prompt`. No issues.

### `caption.py:269-304` — `_auto_genre_production_prompt` (production auto)

**Status: clean.**

- Format spec [line 288](orchestrator/cloud_engines/concept_engine/caption.py#L288) updated from `[genre at BPM], …` to `[genre], …`.
- All three examples ([lines 291-293](orchestrator/cloud_engines/concept_engine/caption.py#L291-L293)) BPM-stripped while preserving the rest of the structure (instruments, vocal, descriptors, clear diction).
- `Lead with genre — this sets the song's energy` retained ([line 296](orchestrator/cloud_engines/concept_engine/caption.py#L296)) per spec ("Lead with genre" should remain; only the "and BPM" portion was removed).
- BPM-range rule (`BPM range: 80-140 …`) cleanly deleted.
- "Under 25 words" budget intact ([line 300](orchestrator/cloud_engines/concept_engine/caption.py#L300)).
- "End with clear diction" intact ([line 299](orchestrator/cloud_engines/concept_engine/caption.py#L299)).

### `caption.py:307-335` — `_manual_genre_production_prompt` (production manual)

**Status: clean.**

- Format spec [line 326](orchestrator/cloud_engines/concept_engine/caption.py#L326) updated from `{genre} at [BPM], …` to `{genre}, …`.
- "Choose a BPM appropriate for {genre} (80-140 range)" rule cleanly deleted.
- "Under 25 words" intact ([line 332](orchestrator/cloud_engines/concept_engine/caption.py#L332)).

---

## Scope-violation check

Every "should NOT have changed" item from the spec verified unchanged:

| Item | Status |
|------|--------|
| Clear-diction strip in `suno.py:139` | ✅ Unchanged. New BPM strip sits *after* it, doesn't interfere. |
| Bisaya/Cebuano → Filipino regex in `suno.py:148` | ✅ Unchanged. Now sits **after** the new BPM strip, which is correct ordering (BPM strip first, language remap second). |
| 1000-char `style[:1000]` truncation | ✅ Unchanged at [suno.py:157](orchestrator/src/suno.py#L157). |
| `_patch_vocal_gender` in `lyrics.py:60-66` | ✅ Unchanged. |
| `_enforce_length` post-processing | ✅ Unchanged at [caption.py:147](orchestrator/cloud_engines/concept_engine/caption.py#L147), still invoked. |
| "Lead with genre" instruction | ✅ Retained in production prompt; only "and BPM" removed. Vocal-forward prompts continue to lead with vocal type per their original design (no regression). |
| "Clear diction" ending requirement | ✅ Retained in storyboard prompt and both production prompts. |
| Frontend `split(',')[0]` derivation | ✅ Unchanged at [WordInfoPanel.tsx:110](orchestrator/frontend/src/components/WordInfoPanel.tsx#L110), [DeckViewPG.tsx:935](orchestrator/frontend/src/pages/DeckViewPG.tsx#L935), and the trim'd variants in [Music.tsx:40](orchestrator/frontend/src/pages/Music.tsx#L40) / [MusicPG.tsx:44](orchestrator/frontend/src/pages/MusicPG.tsx#L44). |
| `_select_caption_prompt` selector | ✅ Unchanged at [caption.py:179-190](orchestrator/cloud_engines/concept_engine/caption.py#L179-L190). |

**No scope violations detected.** The diff is tight to BPM removal.

---

## Caption-display surface inventory

Every frontend reader of `music_caption` (Supabase-backed `words.metadata`):

| # | Component | File:Line | What it renders | Backend strip applies? |
|---|-----------|-----------|-----------------|------------------------|
| 1 | WordCard "Music" row (Library) | [WordInfoPanel.tsx:106-113](orchestrator/frontend/src/components/WordInfoPanel.tsx#L106-L113) | `caption.split(',')[0]` (genre only) | ❌ Reads Supabase directly. Old artifacts unfixed. New artifacts clean. |
| 2 | DeckView "Music" row | [DeckViewPG.tsx:932-937](orchestrator/frontend/src/pages/DeckViewPG.tsx#L932-L937) | `caption.split(',')[0]` (genre only) | ❌ Reads Supabase directly. Same pattern. |
| 3 | Music page (current) — track genre subtitle | [MusicPG.tsx:34, :44](orchestrator/frontend/src/pages/MusicPG.tsx#L44) | `rawCaption.split(',')[0].trim()` (genre only) | ❌ Reads Supabase directly. |
| 4 | Music page (legacy) — track genre subtitle | [Music.tsx:30, :40](orchestrator/frontend/src/pages/Music.tsx#L40) | `rawCaption.split(',')[0].trim()` (genre only) | ❌ Reads Supabase directly. |
| 5 | Admin word-detail "Music Caption" row | [WordDetailPanel.tsx:158](orchestrator/frontend/src/components/admin/WordDetailPanel.tsx#L158) | **Full caption verbatim** (no split) | ❌ Reads Supabase directly. **Most exposed to BPM bleed-through.** |
| 6 | Concept artifact editor | [ConceptPanel.tsx:28, :60-61, :137](orchestrator/frontend/src/components/stages/ConceptPanel.tsx#L28) | Full caption (Studio-only edit panel) | N/A — reads on-disk artifact JSON, not Supabase metadata. Out of scope for this fix. |
| 7 | Type definition | [api.ts:40](orchestrator/frontend/src/api.ts#L40) | (Type only — `ConceptArtifact.music_caption: string`) | N/A — type. |

**SharePage** (`SharePage.tsx`): grepped, contains zero references to `music_caption` or `metadata.music_caption`. Not a caption surface. ✅

**Admin Content browser** (`pages/admin/Content.tsx`): grepped for `music_caption` — no matches. ✅

**Admin Metrics** (`pages/admin/Metrics.tsx:284`): selects `metadata` from words but only for status/aggregation purposes; does not render captions. ✅

**Observability snapshots** (`pages/admin/ObservabilityWordDetail.tsx:32`): selects `metadata` from words. Did not deep-trace render path; if it surfaces `music_caption`, it would also be a BPM bleed-through site. **Worth a follow-up audit.**

**Export/CSV downloads:** no matches for `music_caption` in pages outside the listed surfaces.

---

## Recommendations

### Must fix

1. **Remediate already-stored artifacts.** Pick one:
   - **Backfill** `words.metadata.music_caption` in Supabase via a one-time SQL `UPDATE` applying the same regex pattern. Lowest blast radius. Preserves admin-panel correctness without code changes. Recommended.
   - **Frontend strip** in a shared utility (e.g., `frontend/src/lib/captionUtils.ts`), called from all five reader sites. Idempotent and forgiving of future drift, but spreads the regex across two languages and three places (counting [suno.py](orchestrator/src/suno.py#L142-L146)). Update the `metadata.py` comment to reflect the third location.
   - Both, for belt-and-suspenders. The frontend strip protects against any future caption that drifts past the LLM rules.

2. **Fix the misleading commit-message claim** (or accept it as noted). The "API serve-time" framing is what made the failure invisible during PR review. If the team adopts the backfill remediation, a follow-up commit should clarify that `collect_word_metadata` is the write-time strip — not a serve-time strip — so future maintainers don't make the same assumption.

### Should fix

3. **Audit `ObservabilityWordDetail` admin panel** ([pages/admin/ObservabilityWordDetail.tsx:32](orchestrator/frontend/src/pages/admin/ObservabilityWordDetail.tsx#L32)) — confirm whether it renders `music_caption`. If yes, it joins the list above as another BPM-bleed-through site.

4. **De-duplicate the regex** between [metadata.py:19-30](orchestrator/src/services/metadata.py#L19-L30) and [suno.py:142-146](orchestrator/src/suno.py#L142-L146) into a shared helper. Eliminates the "keep both in sync" comment, which is a known drift trap.

### Cosmetic / future tightening

5. **Tighten regex** to handle the three adversarial misses (BPM-before-number; double-BPM dangling-`and`; "beats per minute" spelled-out). All low-likelihood given the current prompts but cheap to add. A revised pattern like `\s*(?:\bat\s+)?\d{1,3}(?:\s*-\s*\d{1,3})?\s*(?:BPM|beats\s+per\s+minute)\b` plus a post-pass to clean dangling conjunctions would close the gaps.

6. **Update test fixtures** in [test_concept_lyric_levels.py:250, :473](orchestrator/tests/test_concept_lyric_levels.py#L250) to exemplars without BPM. Tests pass either way today, but the BPM-laced fixtures contradict the prompt's new "no BPM" stance and may confuse future maintainers.

7. **Consider whether `WordDetailPanel` should also `split(',')[0]`** — or display the raw caption for admin debugging — and apply any frontend strip consistently.

---

## Appendix: file/line index

| Concern | File | Line |
|---------|------|------|
| BPM strip helper (write-path) | orchestrator/src/services/metadata.py | 19-30 |
| Strip applied | orchestrator/src/services/metadata.py | 164 |
| Write-path entry — `collect_word_metadata` caller | orchestrator/src/orchestration/downstream_worker.py | 722 |
| Suno-bound BPM strip | orchestrator/src/suno.py | 142-146 |
| Storyboard prompt (post-edit) | orchestrator/cloud_engines/image_engine/prompts.py | 1277-1293 |
| Vocal-forward auto-genre prompt | orchestrator/cloud_engines/concept_engine/caption.py | 204-234 |
| Vocal-forward manual-genre prompt | orchestrator/cloud_engines/concept_engine/caption.py | 237-266 |
| Production auto-genre prompt | orchestrator/cloud_engines/concept_engine/caption.py | 269-304 |
| Production manual-genre prompt | orchestrator/cloud_engines/concept_engine/caption.py | 307-335 |
| WordCard music row (Library) | orchestrator/frontend/src/components/WordInfoPanel.tsx | 106-113 |
| WordCard music row (DeckView) | orchestrator/frontend/src/pages/DeckViewPG.tsx | 932-937 |
| Music genre subtitle (current) | orchestrator/frontend/src/pages/MusicPG.tsx | 34, 44, 124 |
| Music genre subtitle (legacy) | orchestrator/frontend/src/pages/Music.tsx | 30, 40, 89 |
| Admin music caption row | orchestrator/frontend/src/components/admin/WordDetailPanel.tsx | 158 |

End of review.
