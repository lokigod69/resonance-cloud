# Infographic Prompt V1/V2 Admin Lab Report

## Files Changed

- `cloud_engines/image_engine/infographic_prompt.py`
  - New infographic template registry, planner prompt builder, final prompt compiler, OpenRouter planner call, and metadata builder.
- `cloud_engines/image_engine/card_engine.py`
  - Added `infographic_prompt_v1` routing for GPT Image-2 cards when selected by Admin Lab metadata.
- `cloud_engines/image_engine/layer2_direct_prompt.py`
  - Registered `infographic_prompt_v1` as a valid backend template without making it a direct-prompt template.
- `frontend/src/lib/adminLayer2Lab.ts`
  - Added infographic template registry, labels, row metadata, and payload routing.
- `frontend/src/pages/admin/Layer2Lab.tsx`
  - Added Infographic Template selector and locked/disabled irrelevant controls when Quick Mode Preset is Infographic.
- `frontend/src/components/generate/useWizardState.ts`
  - Added `infographic_prompt_v1` and infographic template types.
- `frontend/src/components/admin/WordDetailPanel.tsx`
  - Surfaces infographic backend/template metadata in admin detail views.
- Tests:
  - `tests/test_infographic_prompt.py`
  - `tests/test_layer2_direct_prompt.py`
  - `tests/test_gpt_image_2_card_integration.py`
  - `frontend/scripts/test-admin-layer2-lab.ts`

## New Enum And Template Values

Backend template:

- `infographic_prompt_v1`

Infographic templates:

- `infographic_knowledge_guide_v1`
- `infographic_language_atlas_v1`
- `infographic_study_poster_v1`
- `infographic_visual_dictionary_v1`
- `infographic_museum_exhibit_v1`
- `infographic_knowledge_guide_v2`
- `infographic_language_atlas_v2`
- `infographic_study_poster_v2`
- `infographic_visual_dictionary_v2`
- `infographic_museum_exhibit_v2`

## Admin Lab UX Behavior

When Quick Mode Preset is `Infographic`:

- Meaning Strategy is disabled and marked as Infographic-owned.
- Presentation Form is locked to Infographic.
- Art Style is disabled and marked as not used by Infographic V1.
- Backend Template is replaced by Infographic Template.
- Script rows show the selected Infographic Template.
- The payload routes to `backend_template: infographic_prompt_v1`.
- The payload includes `infographic_template`.
- `layer2_eval` omits meaning strategy and art style for infographic rows because those are not required by this architecture.

Non-infographic Lab rows still use the existing backend template, meaning strategy, presentation form, and art style behavior.

## Backend Routing Behavior

`infographic_prompt_v1` is separate from `direct_prompt_v1/v2/v3`.

For GPT Image-2 card generation:

1. `card_engine` resolves the Layer 2 backend template.
2. If the selected backend is `infographic_prompt_v1`, it calls `write_infographic_prompt`.
3. The infographic planner produces a compact JSON plan.
4. The compiler turns that plan into a final GPT Image-2 prompt.
5. The normal GPT Image-2 provider plumbing renders the image.

Existing infographic production quick mode behavior is not changed. The dedicated route is used when Admin Lab sends `infographic_prompt_v1`.

## Planner And Compiler

V1 templates use fixed-menu, single-pass planning:

- Planner receives target word, translation, base language, target language, known scene, mnemonic, etymology, and template identity.
- Planner returns structured JSON with title, translation, visual anchor, panels, footer, and avoid list.
- Compiler produces a 16:9 educational infographic prompt with base-language text rules and factuality bans.

V2 templates use two-pass adaptive planning in a single LLM call:

- Pass 1: analysis summary about what is distinctive for this word and learner pair.
- Pass 2: curated panels with natural base-language headers.
- V2 metadata records `planner_pass_count: 2`.

V2 also records planner-chosen `hero_treatment` when present.

## V2 Variant Rules

Each V2 registry entry stores:

- role identity
- two-pass planning instruction
- hero treatment options
- guidance-only panel categories
- text budgets
- visual frame
- anti-pattern
- footer requirement
- compiler instruction

The compiler carries V2 text budgets, anti-pattern, footer requirement, and hero-treatment instruction into the final image prompt.

## Base-Language Rule

Compiler prompts explicitly require:

- all explanatory text, panel headers, labels, captions, and descriptions in the learner base language
- only the target word, target-language forms, and target-language example sentences in the target language

Admin Lab already passes `base_language` through `settings_override`. Backend metadata records `base_language_intended`.

## Future Versions

Future V3/V4 templates should be added by appending entries to:

- Python: `INFOGRAPHIC_TEMPLATES` in `cloud_engines/image_engine/infographic_prompt.py`
- Frontend: `INFOGRAPHIC_TEMPLATE_OPTIONS` and `InfographicTemplate`

The routing remains `backend_template: infographic_prompt_v1`; the selected template enum distinguishes the planner/compiler variant.

## Tests And Checks Run

- `npm run test:admin-layer2-lab`
- `npm run build`
- `.venv\Scripts\python.exe -m pytest tests/test_infographic_prompt.py tests/test_layer2_direct_prompt.py tests/test_gpt_image_2_card_integration.py tests/test_card_layer2_resolution.py tests/test_layer2_visual_planning.py -q`

## Not Tested

- No paid OpenRouter or GPT Image-2 provider calls were made.
- Visual quality was not judged with generated images.
- Browser interaction on `/admin/layer2-lab` was not exercised in this pass.

## Remaining Risks

- The final output quality depends on planner reliability and GPT Image-2 text rendering.
- The compiler can ban fake facts and internal labels, but image-model compliance still needs empirical scoring.
- Existing user-facing Infographic quick mode still uses the prior production path until a later pass changes it intentionally.
