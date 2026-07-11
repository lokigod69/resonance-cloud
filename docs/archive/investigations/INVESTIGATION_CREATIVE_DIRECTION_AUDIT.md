# Creative Direction Body Audit (Non-LITERAL)

Scope: `orchestrator/cloud_engines/image_engine/prompts.py`, focused only on `editorial`, `cinematic`, `minimal`, `movie`, and `movie_remix`, plus movie helper blocks and the movie/remix schema connection.

## Per-direction findings

### EDITORIAL

1. Cognitive anchor mechanism: The body appears to anchor memory through curated semantic framing: choose the clearest natural depiction or metaphor, then integrate the word into a polished visual context.

2. Anchor pollution: No named artists, photographers, directors, camera brands, film stocks, or named publications. Generic aesthetic language is present:
   - `orchestrator/cloud_engines/image_engine/prompts.py:519-520`: "clean, intentional, and curated. Think magazine-quality imagery."
   - `orchestrator/cloud_engines/image_engine/prompts.py:523`: "create a beautiful, compelling depiction in an interesting setting"
   - `orchestrator/cloud_engines/image_engine/prompts.py:526`: "Prioritize clarity and aesthetic quality over shock value"
   - `orchestrator/cloud_engines/image_engine/prompts.py:527`: "feel intentional, like it belongs in a curated collection"

3. Pattern density: No scene examples. This avoids the old same-shape-example problem, but also gives the LLM little concrete modeling guidance for what "editorial" means under the new schema.

4. Vocabulary alignment with new schema: Weak-to-moderate. The body mentions "setting" and "composition", but mostly uses abstract quality words instead of directing concrete `subject_identity`, `action_state`, `environment`, `composition`, `lighting`, `material_detail`, and `mood_palette` choices. It does not explicitly pull toward old field names, but it relies on legacy aesthetic terms like "curated", "beautiful", and "aesthetic quality".

5. Token weight: About 78 words. No compression concern.

6. Conflicts with other bodies/guidance: It says to "Integrate the word elegantly into the composition" at `prompts.py:525`, which conflicts when `WORD IN COMPOSITION: DISABLED` later says no readable text and `word_render.enabled` false at `prompts.py:1269-1271`.

### CINEMATIC

1. Cognitive anchor mechanism: The body anchors memory through emotional and narrative charge: the word should feel like the dramatic center of a film still.

2. Anchor pollution: No named artists, photographers, directors, camera brands, film stocks, or publications. Generic aesthetic language is dense:
   - `prompts.py:531-532`: "dramatic, emotional, and story-driven. Think movie poster energy."
   - `prompts.py:534`: "dramatic tension, emotional weight, and narrative implication"
   - `prompts.py:535`: "dramatic lighting, strong perspective, and cinematic compositional techniques"
   - `prompts.py:537`: "feel like a still from an emotionally powerful film"
   - `prompts.py:538`: "Lean into atmosphere: fog, rain, golden hour, harsh shadows, silhouettes"

3. Pattern density: No scene examples. It is principle-only, so it does not teach a narrow template, but it also gives no concrete examples of translating emotional resonance into schema fields.

4. Vocabulary alignment with new schema: Mixed. It gestures toward lighting and composition, and line 538 gives concrete atmospheric elements, but the main vocabulary is still "dramatic", "emotional", "cinematic", "atmosphere", and "movie poster energy". It relies on the global IMAGE PROMPT CONSTRUCTION GUIDANCE to translate those into concrete fields.

5. Token weight: About 75 words. No compression concern.

6. Conflicts with other bodies/guidance: It says the word should appear "as part of the drama" at `prompts.py:536`, which conflicts with the disabled word-in-composition block at `prompts.py:1269-1271`. No direct conflict with standalone-scene requirements; the body asks for "narrative implication", not multi-scene dependency.

### MINIMAL

1. Cognitive anchor mechanism: The body anchors memory through typographic dominance: the foreign word itself becomes the primary visual object.

2. Anchor pollution: No named artists, photographers, directors, camera brands, film stocks, or publications. Generic aesthetic language appears here:
   - `prompts.py:580`: "Intense, dramatic words -> bold, dramatic treatment"
   - `prompts.py:582`: "Think typography as art: 3D letters, environmental typography, material exploration"

3. Pattern density: Two treatment examples by emotional register at `prompts.py:579-580`, not scene examples. They are broad and not same-shape.

4. Vocabulary alignment with new schema: Weak. The direction is typographic-first, but the new `ImagePromptData` schema assumes a stable `subject_identity`, concrete `action_state`, environment, lighting, and material fields. The body does not explain whether the "subject" is the word, the letterforms, or an object/person interacting with typography. It also says "environment, colors, and materials" at `prompts.py:577`, which is compatible with new fields, but it does not map them to `environment`, `material_detail`, and `mood_palette`.

5. Token weight: About 69 words. No compression concern.

6. Conflicts with other bodies/guidance: Strong conflict with `WORD IN COMPOSITION: DISABLED`. Minimal says "The word IS the image" at `prompts.py:574` and "The word should be massive, dominant, and impossible to miss" at `prompts.py:581`, while the disabled word block says no readable text and false `word_render` at `prompts.py:1269-1271`. It also conflicts softly with `subject_identity` guidance at `prompts.py:1211-1213`, which is person/subject-oriented and not typography-oriented.

### MOVIE

1. Cognitive anchor mechanism: The body anchors memory through pop-cultural recognition: the viewer recognizes an iconic movie scene, then links the integrated target-language word to that remembered scene.

2. Anchor pollution: This body intentionally uses named anchors. It does not list specific named directors/photographers/artists/camera brands, but it instructs the LLM to use movie titles and actor names:
   - `prompts.py:276-278`: "Choose a movie that is SURPRISING and UNEXPECTED for this word..."
   - `prompts.py:284-290`: "Choose movies that a broad international audience aged 18-40 would recognize..." through "the audience must actually know it."
   - `prompts.py:346`: "Name actual actors: use full name and character name, not generic descriptions"
   - `prompts.py:410-414`: "Always describe actors with enough physical detail..." through "props they're holding or wearing."
   - `prompts.py:421-425`: "recreating iconic, universally recognizable movie scenes..." through "creating an instant mnemonic link."
   - `prompts.py:435-437`: "include a movie_reference object with: title, year, scene_description, actors..."
   Generic aesthetic language also appears:
   - `prompts.py:431`: "Movie-accurate color grading and lighting mood"
   - `prompts.py:388-395`: "most MEMORABLE", "emotional weight", "powerful choice"

3. Pattern density: High. The body includes many examples/templates, but mostly broad strategy rather than concrete scene examples:
   - 5 scene-arrangement patterns at `prompts.py:313-324`.
   - 4 connection-priority categories at `prompts.py:338-342`.
   - 5 word-integration location types at `prompts.py:352-358`.
   - 4 visual-precision field examples at `prompts.py:399-406`.
   - Optional movie override adds 5 same-shaped "word like X -> find a scene with Y" examples at `prompts.py:262-267`.
   The main body does not have >=3 full scene examples of the same shape, but it has enough templates that movie mode is heavily steered.

4. Vocabulary alignment with new schema: Mixed. The "VISUAL PRECISION" block aligns well with concrete `composition`, `lighting`, color, and detail vocabulary at `prompts.py:396-408`. However, it still references "lighting/style fields" at `prompts.py:347`; the redesigned per-scene schema has `lighting`, `mood_palette`, `material_detail`, and optional `style_medium_override`, not a generic scene-level `style` field.

5. Token weight: About 1,359 words rendered for `movie`; the shared movie block alone is about 1,241 words. With `movie_override`, add about 145 words. This is a major token-bloat candidate.

6. Conflicts with other bodies/guidance: There are three material conflicts. First, the movie body mandates word integration in the physical world at `prompts.py:351-363`, conflicting with `WORD IN COMPOSITION: DISABLED` at `prompts.py:1269-1271`. Second, the transition section asks the LLM to choose among morph/cut modes at `prompts.py:364-386`, but text-to-video output forces `"suggested_transition_mode": "all_cut"` and null transitions at `prompts.py:1584-1586` and `prompts.py:1606-1608`. Third, the body's named movie/actor anchoring conflicts with the Wan 2.7 research preference for descriptive vocabulary over named anchors.

### MOVIE_REMIX

1. Cognitive anchor mechanism: The body anchors memory through recognition plus violation: the viewer recognizes an iconic movie scene and remembers the word through one absurd altered element.

2. Anchor pollution: It inherits all movie named-anchor issues from `_movie_shared_blocks()`, including actual movie and actor naming. Additional body-specific named-anchor pressure:
   - `prompts.py:447-450`: "recreating iconic movie scenes with ONE absurd alteration..." through "The vocabulary word is integrated into the scene."
   - `prompts.py:453-455`: "Everything else stays faithful to the original film..."
   - `prompts.py:502-504`: "movie_reference..." and "remix_element..."
   Generic aesthetic/comedy language:
   - `prompts.py:449-450`: "hilariously wrong"
   - `prompts.py:473`: "natural comedy wins"
   - `prompts.py:483-484`: "dramatic contexts. The repetition IS the joke."

3. Pattern density: Very high. It inherits the movie shared templates and adds:
   - 6 alteration categories with examples at `prompts.py:457-468`.
   - 3 same-shape word-on-absurd-element examples at `prompts.py:498-500`.
   - running-gag/traveling-absurdity rules at `prompts.py:477-494`.
   This is a >=3 same-shape risk: the body strongly teaches "iconic scene + one absurd substitution" as the entire mechanism. That may be intended for this direction, but it is narrow and highly repetitive.

4. Vocabulary alignment with new schema: Weaker than MOVIE. It inherits the useful visual-precision block, but the remix-specific instructions focus on conceptual alteration taxonomy rather than concrete `subject_identity`, `action_state`, `material_detail`, and `continuity_anchor` instructions. It also asks the same absurd alteration to persist across scenes, but does not explicitly tell the LLM to put that into `continuity_anchor`.

5. Token weight: About 1,761 words rendered for `movie_remix`; with optional `movie_override`, about 1,906 words. This is the largest body and the strongest compression candidate.

6. Conflicts with other bodies/guidance: It inherits the MOVIE conflicts: mandatory word integration vs disabled word rendering, named movie/actor anchors vs no-named-anchor research, and transition-mode choice vs text-to-video all-cut forcing. It also creates a continuity tension: the same absurd alteration should appear in every scene at `prompts.py:477-491`, while the new schema requires byte-identical `subject_identity` but only says `continuity_anchor` for scenes 2+; the body does not map the persistent altered element into those fields.

## MOVIE / MOVIE_REMIX schema audit

- `ImagePromptData` no longer contains movie/remix-specific fields. It contains the redesigned prompt fields only: `subject_identity`, `action_state`, `environment`, `composition`, `lighting`, `material_detail`, `mood_palette`, `style_medium_override`, `continuity_anchor`, `change_request`, `aspect_ratio`, and `text_element` at `orchestrator/cloud_engines/image_engine/models.py:253-268`.
- Movie/remix fields still exist outside `ImagePromptData`. `MovieReference` is defined at `models.py:280-287`; `RemixElement` is defined at `models.py:290-296`.
- Standard image `Scene` still has optional `movie_reference` and `remix_element` at `models.py:364-365`.
- Top-level `Storyboard` still has optional `movie_source_strategy`, `movies_referenced`, `suggested_transition_mode`, and `transition_rationale` at `models.py:400-403`.
- Text-to-video scenes also still carry optional `movie_reference` and `remix_element` at `models.py:424-427`, and `StoryboardTextToVideo` carries the same top-level movie fields at `models.py:447-450`.
- The output schema still conditionally asks for movie fields. Text-to-video inserts `movie_source_strategy`, `movies_referenced`, `movie_reference`, and `remix_element` at `prompts.py:1540-1566`; standard image mode inserts top-level movie fields and scene-level movie/remix fields at `prompts.py:1671-1701`.
- The body still tells the LLM to populate them: MOVIE at `prompts.py:434-440`, MOVIE_REMIX at `prompts.py:501-507`.
- These fields are not orphaned. They are still generated, parsed, modeled, and sanitized. The important redesign fact is that they are no longer part of `ImagePromptData`; they live alongside each scene and at storyboard top level.
- Adjacent parser connection: `sanitize_storyboard_data()` validates top-level movie fields at `storyboard.py:314-330` and scene-level `movie_reference` / `remix_element` at `storyboard.py:387-399`.

## Cross-cutting findings

- All five audited directions contain some form of word-in-scene instruction, but the global word block can disable readable text. This is minor for EDITORIAL/CINEMATIC, severe for MINIMAL, and severe for MOVIE/MOVIE_REMIX.
- MOVIE and MOVIE_REMIX are outliers in token weight: 1,359 and 1,761 words versus 69-78 words for the other three. The shared movie block is doing most of the damage.
- MOVIE and MOVIE_REMIX intentionally violate the no-named-anchor research direction by requiring movie titles and actor names. This may be a product decision rather than an accidental bug, but it should be treated as a known exception.
- CINEMATIC and EDITORIAL are not polluted by named anchors, but both rely on older aesthetic vocabulary without enough local translation into `composition`, `lighting`, `material_detail`, and `mood_palette`.
- MINIMAL is the most schema-misaligned short body because the schema is subject-first while the body is typography-first.
- The movie shared block has the best concrete field-level prompt vocabulary in the whole audited set (`COMPOSITION`, `LIGHTING`, `COLOR`, `DETAIL` examples), but it is buried inside a very large, named-reference-heavy mode.
- Text-to-video introduces a real movie-mode contradiction: movie bodies ask for transition-mode selection, but text-to-video schema forces all cuts and null transitions.

## Recommended rewrite order

1. MOVIE_REMIX: Largest body, highest pattern density, inherits named-anchor issues, adds same-shape absurd-substitution examples, and needs explicit mapping to the new continuity fields.
2. MOVIE: Almost as large, intentionally named-anchor-driven, contains transition/text-to-video conflict, and should be compressed around concrete sensory field guidance.
3. MINIMAL: Short but conceptually mismatched with the new subject-first schema and directly conflicts with disabled word rendering.
4. CINEMATIC: Low token cost and no named anchors, but it leans heavily on generic aesthetic adjectives and should be rewritten into concrete emotional-cinematic vocabulary.
5. EDITORIAL: Lowest risk; needs clearer cognitive-anchor framing and concrete schema vocabulary, but has no examples, no named anchors, and minimal token cost.

## Anything out of scope that surfaced

- There are sibling/copy prompt files under `engines/image-engine/src/`, `_spotcheck/`, and `_review_async/`; this audit used only the requested `orchestrator/cloud_engines/image_engine/prompts.py`.
- The text-to-video prompt block still has legacy-ish "MOOD & STYLE" language at `prompts.py:1516-1518`; not investigated further because it is not a creative direction body.
- Provider behavior and prompt compilation were not investigated.
