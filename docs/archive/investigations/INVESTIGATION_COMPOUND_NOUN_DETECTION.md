# Investigation — Compound Noun Detection (English-First)

## Scope

Read-only audit of current `main` in `d:/CODING/ResonanceTEST/orchestrator`, focused on routing English compound nouns through the existing word pipeline while leaving true phrases on the phrase path. I did **not** trust prior handoff line numbers; all citations below were re-enumerated from current files.

## Current state

### Phrase-detection and `input_type` call sites

The handoff said "four" phrase-detection call sites, but current `main` has **five live runtime space-based checks** across three backend files:

| File:line | Exact expression | Role |
| --- | --- | --- |
| `src/routers/words.py:325` | `input_type = "phrase" if " " in word else "word"` | Manual/local API path writes manifest directly. (`src/routers/words.py:316-355`) |
| `src/csv_import.py:154` | `input_type = "phrase" if " " in word else "word"` | CSV import path writes manifest directly. (`src/csv_import.py:126-165`) |
| `src/orchestration/feeder.py:557` | `is_phrase = " " in original_word.strip()` | Bootstrap enrichment writeback decides whether `word_target` is allowed to overwrite `words.word`. (`src/orchestration/feeder.py:553-579`) |
| `src/orchestration/feeder.py:617` | `is_phrase = " " in original_word.strip()` | Bootstrap manifest loop decides whether to keep `original_word` or use translated `word_target`. (`src/orchestration/feeder.py:615-623`) |
| `src/orchestration/feeder.py:624` | `input_type = "phrase" if " " in word_text else "word"` | Bootstrap manifest emission re-derives final manifest `input_type` from post-enrichment `word_text`. (`src/orchestration/feeder.py:615-674`) |

### Authoritative cloud ingestion path

The main Resonance Cloud generation flow does **not** go through `src/routers/words.py`. The frontend inserts bare `words` rows with only `deck_id`, `user_id`, `word`, `status`, and `current_stage`, both for existing decks and new decks (`frontend/src/components/generate/submitGeneration.ts:56-63`, `frontend/src/components/generate/submitGeneration.ts:90-97`). The feeder later loads those pending rows with `select("*")` and performs enrichment/classification during bootstrap (`src/orchestration/feeder.py:488-499`, `src/orchestration/feeder.py:544-624`).

### Schema definitions

`Manifest.input_type` is still a two-value literal in the orchestrator manifest model: `Literal["word", "phrase"]` (`src/models.py:43-52`).

`ConceptContent.input_type` is still a two-value literal in the concept engine payload model: `Literal["word", "phrase"]` (`cloud_engines/concept_engine/models.py:29-44`).

I did not find any other in-repo engine model under `orchestrator/cloud_engines` that declares an `input_type` field; the only runtime engine consumer in that tree is the concept engine, which checks `payload.content.input_type == "phrase"` to skip word-only logic (`cloud_engines/concept_engine/engine.py:79-90`).

The Supabase `public.words` table does **not** have an `input_type` column; its base columns are `word`, `word_slug`, `translation`, `mnemonic`, `etymology`, `pos`, `article`, `status`, etc. (`frontend/supabase/migrations/20260322210000_phase2a_tables.sql:32-50`).

### Phrase blanking / phrase-specific downstream gating

The comment-marked image blanking site is still in `src/pipeline.py`:

- `build_image_payload` sets `is_phrase = manifest_data.input_type == "phrase"` and omits mnemonic/etymology context for phrases (`src/pipeline.py:277-286`).

`build_concept_payload` applies parallel phrase gating by zeroing `mnemonic` and `pos` for phrase inputs before sending the concept payload downstream (`src/pipeline.py:216-227`).

There are also two phrase-aware creative-direction gates in the same module:

- `_resolve_creative_direction_random` treats phrases as having no meaningful POS (`src/pipeline.py:73-92`).
- `_resolve_creative_direction` strips phrase metadata from the picker prompt by forcing `pos = "unknown"`, `tags = "none"`, and `mnemonic = "none provided"` when `input_type == "phrase"` (`src/pipeline.py:95-160`).

One important nuance: the feeder still writes `translation`, `mnemonic`, `etymology`, `pos`, and `article` into the `words` row **before** manifest creation, even when `is_phrase` is true; only the `word` overwrite is gated by the space check (`src/orchestration/feeder.py:562-575`). Phrase blanking is therefore a **downstream payload-routing behavior**, not a blanket suppression of enrichment persistence.

### Enrichment call shape and failure default

Enrichment is a single batched LLM call that runs before manifest creation (`src/orchestration/feeder.py:544-547`). The prompt already asks for `word_target`, `translation`, `mnemonic`, `etymology`, `pos`, and `article` in one JSON object per input (`src/services/enrichment.py:19-40`).

If the OpenRouter key is missing, enrichment falls back to per-word stub objects with the original word as `word_target` and empty `translation` / `mnemonic` / `etymology` / `pos` (`src/services/enrichment.py:50-54`). If the LLM response is unparseable JSON, it falls back to the same stub objects (`src/services/enrichment.py:109-115`).

### Hyphenated compound sanity check

All current classifiers test only for a literal space character, so inputs such as `mother-in-law` and `t-shirt` (no spaces) already stay on the `word` path under the current logic (`src/routers/words.py:325`, `src/csv_import.py:154`, `src/orchestration/feeder.py:557`, `src/orchestration/feeder.py:617`, `src/orchestration/feeder.py:624`).

## Q1. What is a compound noun, operationally?

Operationally, the v1 target is not "all noun phrases"; it is the narrower class of **English multi-token lexical units that behave like a single concept and should inherit word-style enrichment**. In practice, that means a conservative candidate set such as:

- 2–3 tokens after whitespace normalization.
- Nominal head, with acceptable coarse shapes like `NOUN+NOUN` (`post office`), `ADJ+NOUN` (`high school`), `NOUN+NOUN+NOUN` (`ice cream cone`), or proper-name compounds (`New York`, `United States`).
- Reject obvious clause/function-word shapes containing verbs, pronouns, conjunctions, or prepositions, e.g. `let it go`, `let that sink in`.

That heuristic is useful as a **fallback or guardrail**, but not robust enough as the final production classifier by itself. The reason is that the task is lexical-semantic ("single concept vs actual phrase"), while off-the-shelf libraries mostly expose syntactic structure:

- **spaCy v3.7** exposes dependency parsing, base noun phrases via `Doc.noun_chunks`, and named entities via `Doc.ents`; its docs define noun chunks as base noun phrases headed by a noun, and note that NER is statistical and "doesn't always work perfectly" for every use case. That is helpful for *candidate detection* (`hot dog`, `high school`, `New York`) but not a turnkey compound-noun decision boundary, because ordinary noun phrases also appear as noun chunks and proper-noun recognition is probabilistic. Source: spaCy v3.7 docs, "Linguistic Features" (`https://spacy.io/usage/linguistic-features`).
- **NLTK 3.8.1** exposes POS tagging and NP chunking, not a dedicated compound-noun classifier. Its docs show `pos_tag` as a token-level English tagger and the NLTK book frames NP chunking as grammar/chunker construction; the example evaluation numbers it publishes (69.2% F-measure for a naive regexp NP chunker; 83.2% for a unigram NP chunker on CoNLL-2000 noun-phrase chunking) are for **noun phrase chunking**, not for the narrower product requirement of distinguishing lexicalized compounds from true phrases/idioms. Sources: `https://www.nltk.org/api/nltk.tag.pos_tag.html` (NLTK 3.8.1) and `https://www.nltk.org/book/ch07.html`.

### Q1 recommendation

Use the heuristic only as a **sanity fallback**, not as the authoritative production classifier. For the production decision, use the existing enrichment LLM call and ask it to decide whether an English multi-word input should route as `word` or `phrase`. That gives the model access to the full string, the target language, and the base language already being used for enrichment (`src/orchestration/feeder.py:527-547`, `src/services/enrichment.py:19-40`).

## Q2. Where should classification run?

### Option A — Input time

This is conceptually clean only if the decision is made **once** and then persisted. In current `main`, that is **not** how cloud generation works:

- Frontend generation inserts raw `words` rows with no persisted classification (`frontend/src/components/generate/submitGeneration.ts:56-63`, `frontend/src/components/generate/submitGeneration.ts:90-97`).
- `public.words` has no `input_type` column (`frontend/supabase/migrations/20260322210000_phase2a_tables.sql:32-50`).
- The feeder later reloads `words` with `select("*")` and recomputes phrase-ness from both `original_word` and post-enrichment `word_text` (`src/orchestration/feeder.py:488-499`, `src/orchestration/feeder.py:553-575`, `src/orchestration/feeder.py:615-624`).

So an input-time design would require **persistence plus feeder adoption**. Blast radius is therefore medium-to-high: frontend submit path, persisted storage contract (new DB column or agreed metadata convention), feeder consumption, plus any parity work for `src/routers/words.py` and `src/csv_import.py`.

### Option B — During enrichment

This is the lowest-friction authoritative place in current architecture:

- The feeder already loads `base_language` before enrichment (`src/orchestration/feeder.py:527-542`).
- Enrichment is already one batched LLM call for every pending word (`src/orchestration/feeder.py:544-547`, `src/services/enrichment.py:43-79`).
- The enrichment response is parsed via plain `json.loads`, not a strict Pydantic output model (`src/services/enrichment.py:98-118`).

That means the transport/wiring is already present. Adding one routing field is **not** a new network round trip or a new service boundary; it is a prompt/output-schema edit in `src/services/enrichment.py` plus feeder logic in `src/orchestration/feeder.py` to consume that field instead of re-deriving phrase-ness from spaces.

Blast radius is low-to-medium: primarily `src/services/enrichment.py`, `src/orchestration/feeder.py`, and tests.

### Option C — Post-enrichment decision layer

If "post-enrichment" means a second classifier after enrichment based only on `pos`, `word_target`, and the original string, I would reject it. The feeder is already the stage that consumes enrichment results and emits manifests (`src/orchestration/feeder.py:553-674`), so an additional decision layer there would duplicate logic without reducing schema churn or latency.

The only version of this option that makes sense is: **the enrichment LLM emits the routing hint, and the feeder consumes it immediately**. In practice, that collapses back into Option B.

### Q2 recommendation

Use **Option B: classify during the existing enrichment batch call, then apply the result in the feeder**.

## Q3. Schema decision

I recommend the less invasive option: **classify compound nouns internally, but emit `input_type = "word"` in the manifest and downstream payloads**.

Why:

- Both current public schemas are binary (`src/models.py:43-52`, `cloud_engines/concept_engine/models.py:29-44`).
- The concept engine and pipeline logic only need the binary distinction "phrase vs not phrase" (`cloud_engines/concept_engine/engine.py:79-90`, `src/pipeline.py:73-92`, `src/pipeline.py:95-160`, `src/pipeline.py:216-227`, `src/pipeline.py:277-286`).
- I found no current frontend/UI consumer that needs a third visible state; the UI reads `mnemonic` / `etymology` / `pos` directly from the `words` row (`frontend/src/pages/Study.tsx:202-214`, `frontend/src/pages/DeckViewPG.tsx:799-805`, `frontend/src/pages/DeckViewPG.tsx:851-885`, `frontend/src/pages/SharePage.tsx:103-113`).

A three-way `Literal["word", "compound_noun", "phrase"]` would force unnecessary churn through manifest validation, concept-engine validation, and every `input_type == "phrase"` branch, without any concrete downstream requirement today.

## Q4. LLM cost and latency

Yes: if classification uses the LLM, it can fold into the **existing** enrichment batch call.

- The call is already batched and returns one JSON object per input (`src/services/enrichment.py:43-79`).
- The prompt already enumerates exact keys and the parser simply runs `json.loads` on the response (`src/services/enrichment.py:37-40`, `src/services/enrichment.py:98-118`).

So the implementation is **not prompt-edit-only end to end** — the feeder must consume the new field — but it **is** prompt-edit-only on the service boundary. No new pipeline stage or extra LLM request is required.

Token estimate: one short routing field such as `"route_as": "word"` or `"route_as": "phrase"` should add only a small fixed prompt overhead plus roughly single-digit-to-low-teens completion tokens per item, which is comfortably inside the stated `<= 20 tokens/word` budget.

## Q5. User override path for v1

Recommendation: **no override UI / no override storage for v1**.

Reasons:

- Current misclassification failure is user-visible but non-destructive; it changes enrichment routing quality, not persistent data integrity (`src/pipeline.py:216-227`, `src/pipeline.py:277-286`).
- There is no current override field in the main generation submit path; the frontend inserts only bare word rows (`frontend/src/components/generate/submitGeneration.ts:56-63`, `frontend/src/components/generate/submitGeneration.ts:90-97`).
- `public.words` has no `input_type` or override column today (`frontend/supabase/migrations/20260322210000_phase2a_tables.sql:32-50`).

Shipping the classifier first and observing real traffic is the lower-risk v1 path. If misses prove visible and common, add an override in v2 with measured justification.

## Q6. Failure modes and safe default

### Current default on enrichment failure

If enrichment cannot run because the API key is missing, or if the response cannot be parsed as JSON, the service returns stubs with the original word as `word_target` and empty enrichment fields (`src/services/enrichment.py:50-54`, `src/services/enrichment.py:109-115`).

### Recommended default on classification failure

If the new routing field is missing, invalid, or absent because the LLM output fell back to the stub response, the feeder should **fall back to the current space-based behavior**. That preserves current production semantics and makes classification failure a no-regression event.

### Failure-mode assessment

- **Compound noun misclassified as phrase**: downstream concept/image/picker logic continues to treat it as phrase and skips word-style context (`src/pipeline.py:105-118`, `src/pipeline.py:216-227`, `src/pipeline.py:277-286`). User-visible quality loss, but no corruption.
- **Phrase misclassified as word**: downstream concept/image/picker logic receives mnemonic/etymology/POS and may produce awkward concept or image guidance, but still no corruption (`src/pipeline.py:105-118`, `src/pipeline.py:216-227`, `src/pipeline.py:277-286`).
- **Classifier absent/unparseable**: with the recommended fallback, behavior reverts to today’s space rule (`src/orchestration/feeder.py:557`, `src/orchestration/feeder.py:617`, `src/orchestration/feeder.py:624`).

## Q7. Frontend impact

Frontend impact is effectively **zero** for v1.

The frontend already selects and renders `mnemonic` and `etymology` on the existing word/detail surfaces:

- Study page renders both fields if present (`frontend/src/pages/Study.tsx:202-214`).
- Deck view renders `mnemonic` inline and `etymology` in the expandable metadata block (`frontend/src/pages/DeckViewPG.tsx:799-805`, `frontend/src/pages/DeckViewPG.tsx:851-885`).
- Share page renders `mnemonic` if present (`frontend/src/pages/SharePage.tsx:103-113`).

So if compound nouns are routed as words and the backend continues to populate the existing columns, there is no UI work required.

## Recommended approach

### Classification strategy

Use the **existing enrichment LLM call** to emit a transient English-only routing hint such as `route_as: "word" | "phrase"`.

Rules for the prompt should be explicit and narrow:

- Only make the special decision for **English** multi-word inputs.
- Route multi-word English **single-concept lexical units** (compound nouns and proper-name compounds) as `word`.
- Route clauses, idioms, greetings, and sentence-like inputs as `phrase`.
- Fall back to current space-based behavior if the field is missing/invalid.

This keeps the classifier at the one place in the current architecture that already has the input string, the target language, and the user’s base language (`src/orchestration/feeder.py:527-547`, `src/services/enrichment.py:19-40`).

### Schema strategy

Keep downstream schema binary: **emit `input_type = "word"` for compounds**.

### Override policy

**No override for v1.** Ship, observe miss rate, revisit only if real user traffic shows a meaningful error rate.

### Trade-offs

- **Pros**: zero extra round trip, minimal downstream churn, no frontend work, no DB migration required, easy safe fallback.
- **Cons**: routing depends on LLM judgment for the ambiguous English multi-word cases; purely local/manual manifest paths (`src/routers/words.py`, `src/csv_import.py`) will remain on the old space heuristic unless explicitly brought into parity.

## Proposed implementation plan

This can stay small enough for a **single commit + one adversarial review** if kept to the authoritative cloud path.

1. **`src/services/enrichment.py`** — ~20–30 LoC  
   Extend the prompt and expected JSON shape with one routing field (for example `route_as`). Add a short English-only instruction block with a few positive/negative examples (`hot dog`, `ice cream cone`, `New York` => `word`; `let it go`, `let that sink in`, `good morning` => `phrase`). Keep the existing fallback response shape compatible by defaulting the routing field to missing/empty. (`src/services/enrichment.py:19-40`, `src/services/enrichment.py:50-54`, `src/services/enrichment.py:109-115`)

2. **`src/orchestration/feeder.py`** — ~35–50 LoC  
   Compute routing once from the enrichment record with `space-rule` fallback, then reuse that result for both:  
   - the `word_target` overwrite decision in the Supabase writeback loop, and  
   - manifest `input_type` emission in the manifest loop.  
   Replace the three current space-based decisions (`src/orchestration/feeder.py:557`, `src/orchestration/feeder.py:617`, `src/orchestration/feeder.py:624`) with one authoritative helper/branch.

3. **Tests** — ~35–50 LoC total  
   Update/add focused tests for the feeder routing behavior and the enrichment parse/fallback behavior. Likely one feeder test module and one enrichment/service test. Keep cases explicit: `hot dog`, `ice cream`, `ice cream cone`, `high school`, `New York`, `United States`, `let it go`, `let that sink in`, plus hyphen sanity (`mother-in-law`, `t-shirt`).

### Expected diff size

- **Core cloud-path implementation**: roughly **90–130 LoC across 3–4 files**.
- **If local/manual parity is also required** (`src/routers/words.py`, `src/csv_import.py`): add roughly **10–25 LoC per file**, still likely within one commit but closer to the requested cap.

### Test plan

For each sample below, verify both feeder routing and downstream payload behavior:

#### Should route as `word`

- `hot dog`
- `ice cream`
- `ice cream cone`
- `kindergarten teacher`
- `post office`
- `high school`
- `New York`
- `United States`

Expected result:

- manifest `input_type = "word"`
- concept payload includes `mnemonic` / `pos` (`src/pipeline.py:216-227` behavior should follow the word path)
- image payload includes mnemonic/etymology context when visual references are enabled (`src/pipeline.py:277-286`)

#### Should route as `phrase`

- `let it go`
- `let that sink in`
- `I love pizza`
- `good morning`
- `thank you`

Expected result:

- manifest `input_type = "phrase"`
- concept/image/picker logic continues to suppress word-only enrichment context (`src/pipeline.py:105-118`, `src/pipeline.py:216-227`, `src/pipeline.py:277-286`)

#### Hyphen sanity

- `mother-in-law`
- `t-shirt`

Expected result:

- unchanged behavior; still `word` because the current classifier is space-based (`src/routers/words.py:325`, `src/csv_import.py:154`, `src/orchestration/feeder.py:557`, `src/orchestration/feeder.py:617`, `src/orchestration/feeder.py:624`)

## Bottom line

The least invasive production-safe path is:

- **classification strategy**: add a routing hint to the existing enrichment LLM batch;
- **schema strategy**: keep downstream `input_type` binary and map compounds to `word`;
- **override strategy**: no override in v1;
- **fallback strategy**: if classification is missing or invalid, keep today’s space-based behavior.
