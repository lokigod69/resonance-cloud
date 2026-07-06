/**
 * Product-level feature flags for learner-facing surfaces.
 *
 * Same idea as RUNNER_GAME_ROUTE_ENABLED in App.tsx and the role gating in
 * lib/speakCuration.ts: hide, never delete. Flipping a flag back restores the
 * surface without touching data, routes, or backend behavior.
 */

/**
 * Video generation is deprecated user-facing (2026-07): the lane tile is hidden
 * from the new-deck wizard in both skins. Legacy video decks keep working —
 * playback, deep links (/deck/:id/word/:wordId, /study/video), public shares,
 * appending words to an existing video deck, and the whole backend pipeline
 * are unaffected. See docs/Refactors/FABLE_VIDEO_DEPRECATION_BOUNDARY.md.
 */
export const VIDEO_LANE_ENABLED = false

/**
 * Lens is the capture-first visual vocabulary surface. Phase 2A keeps it
 * frontend-only with a mock scan provider; later phases add the API/RPC rails.
 * Hide, never delete: routes and entry points should be gated by this flag so
 * dogfood/TestFlight exposure can be changed without removing the surface.
 */
export const VISUAL_LENS_ENABLED = true
