# Guided Today Atmosphere V1 Report

## Scope

Guided Today Atmosphere V1 is scoped to `/today` presentation only. The work changes the active launch vibe emblems, adds a Today-local `data-guided-vibe` atmosphere layer, and documents the Bright, Wistful, and Sharp identities. It does not change global theme providers, routing, backend, Supabase, generation, providers, decks, words, or persistence.

## Production Emblems

Production files:

- `frontend/public/guided/vibes/bright-emblem.webp`
- `frontend/public/guided/vibes/wistful-emblem.webp`
- `frontend/public/guided/vibes/sharp-emblem.webp`

The selected source identities were preserved:

- Bright remains the warm sunwell orb.
- Wistful remains the moonlit glass moonstone.
- Sharp remains the black-metal cyanline prism.

The production WebPs were regenerated as alpha-friendly cutouts. The square preview backgrounds were removed, the emblems remain centered in a 512 x 512 canvas, and the glow fades naturally into transparency instead of ending at a hard rectangular edge. The files are still reasonable for production use: Bright is about 45 KB, Wistful about 58 KB, and Sharp about 101 KB.

Alpha verification note:

- Final files contain transparency/alpha.
- Canvas corners are transparent, so no full-canvas opaque square remains.
- The assets visually sit on the dark glass UI without a dark square matte, hard canvas edge, green halo, or opaque 512 x 512 background.
- Images are rendered with `object-fit: contain` and are not stretched or cropped.

## Theme Tokens

Today now sets `data-guided-vibe={selectedVibeId}` on the `/today` root shell. `frontend/src/components/today/Today.css` defines Today-local tokens:

- `--today-accent`
- `--today-accent-strong`
- `--today-accent-soft`
- `--today-glow`
- `--today-border`
- `--today-panel`
- `--today-text-soft`

The same scoped shell aliases those tokens to existing Today accent consumers, including `--accent`, `--accent-soft`, `--accent-glow`, `--border-subtle`, `--surface-glass`, `--primary`, and focus ring color. This keeps the atmosphere local to `/today` while allowing existing Today components to respond immediately when the active vibe changes.

Applied surfaces:

- Selected vibe card glow and border.
- Lesson selected and recommended states.
- Session progress indicator.
- Focus-visible ring.
- Default primary button accent inside Today.
- Completion trophy panel accent.

Lesson progress remains vibe-agnostic because progress helpers and storage continue to operate at lesson/path level, not vibe level.

## Vibe Identity Bible

### Bright

Mood sentence: Sunny, warm, open, and encouraging, like daylight making the first step feel easy.

Palette tokens: Gold, yellow, cream, amber, warm panel glass, gentle golden glow.

Emblem treatment: The sunwell orb stays large and centered with a soft bloom that fades into alpha.

UI behavior: Selected states feel luminous and friendly. Buttons use a warm gold accent with readable dark foreground. Glows are broad and gentle.

What not to do: Avoid neon orange, childish cartoon styling, harsh contrast, or loud saturation.

### Wistful

Mood sentence: Moonlit, blue-gray, reflective, calm, and spacious without becoming sad or hard to read.

Palette tokens: Mist blue, slate, soft lavender hint, moon highlight, cool glass panel.

Emblem treatment: The moonstone remains hazy and reflective with a misty edge glow fading into transparency.

UI behavior: Selected states feel quiet and spacious. Panels use cool blue-gray borders, muted glow, and soft text accents.

What not to do: Avoid making it depressing, low-contrast, unreadable, or overly blurred.

### Sharp

Mood sentence: Graphite, silver, cyan-edged, precise, and focused with high-contrast intent.

Palette tokens: Black metal, graphite panel, silver highlight, cyan edge, narrow glow.

Emblem treatment: The cyanline prism keeps its angular black-metal silhouette with a crisp cyan edge and transparent surroundings.

UI behavior: Selected states use tighter glow, crisp borders, and high-contrast button accents. The atmosphere feels precise rather than soft.

What not to do: Avoid warm glow, soft blur, or generic sci-fi overload.

## QA Notes

- Bright, Wistful, and Sharp are visibly different at a glance through root tokens, selected states, progress, buttons, and emblems.
- Switching the active vibe changes the `/today` atmosphere immediately through the root `data-guided-vibe`.
- Completed lesson state remains readable because completion green remains stable while surrounding Today accents change.
- Future vibes remain non-selectable; the active launch list is still Bright, Wistful, and Sharp only.
- No backend, Supabase, generation, provider, deck, word, persistence, routing, global theme, or global skin provider files were changed.
