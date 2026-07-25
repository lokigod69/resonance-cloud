// waveField — the shared swell physics of the Lingwave brand ocean.
//
// One source of truth for the layered sine field that LingwaveWaves paints,
// the study Wave canvas rides, and the landing page choreographs against.
// Everything that "floats on the water" anywhere in the app should sample
// this exact field so all motion stays coherent.

/** Sum of the term amplitudes below — normalizes waveHeight to roughly [-1, 1]. */
export const WAVE_AMP_SUM = 1.51

/** Long, layered swells travelling toward the viewer (+t on z-terms). */
export function waveHeight(x: number, z: number, t: number): number {
  return (
    0.55 * Math.sin(x * 0.18 + z * 0.3 + t * 0.42) +
    0.38 * Math.sin(x * 0.3 - z * 0.16 + t * 0.27) +
    0.28 * Math.sin(x * 0.06 + z * 0.44 + t * 0.36) +
    0.18 * Math.sin(x * 0.52 + z * 0.08 - t * 0.22) +
    0.12 * Math.sin(x * 0.85 + z * 0.65 + t * 0.55)
  )
}

/** Local surface slope at x — used to tilt objects riding the swell. */
export function waveSlope(x: number, z: number, t: number, dx = 0.4): number {
  return waveHeight(x + dx, z, t) - waveHeight(x - dx, z, t)
}

/** Map a horizontal screen percentage (0..100) to the field's world X.
 * Flat approximation that ignores perspective — kept for the landing page's
 * choreography only. Anything that must sit ON the projected water (Home
 * buoys) goes through worldXForScreenX with its slot's real z instead. */
export function worldXFromPercent(xPercent: number): number {
  return (xPercent - 50) * 0.12
}

// ---------------------------------------------------------------------------
// Projection — the perspective camera LingwaveWaves paints with, shared so DOM
// elements (Home buoys, waterline chrome) can sit exactly on the drawn surface.
// LingwaveWaves imports these back: one source of truth, no drift.

/** The waterline: the canvas horizon sits at this fraction of its height. */
export const WAVE_HORIZON_FRACTION = 0.4
/** Focal length of the projection as a fraction of canvas height. */
export const WAVE_FOCAL_FRACTION = 0.85
/** Camera height above calm water. */
export const WAVE_CAM_HEIGHT = 3.2
/** How far the camera dives at full scroll energy. */
export const WAVE_ENERGY_CAM_DROP = 0.65
/** Depth range of the rendered field — slot z values live inside [near, far]. */
export const WAVE_Z_NEAR = 2
export const WAVE_Z_FAR = 46

/** Camera height at a given scroll energy (0..1). */
export function waveCamHeight(energy: number): number {
  return WAVE_CAM_HEIGHT - WAVE_ENERGY_CAM_DROP * energy
}

/** Screen Y (px) of the water surface at world (x, z) and time t — the same
 * projection the canvas strokes, so an element placed here rides the swell.
 * Ripple displacement is deliberately excluded: ripples perturb the drawn
 * contours, not the analytic field. */
export function screenYForWave(worldX: number, z: number, t: number, _w: number, h: number, energy = 0): number {
  const horizon = h * WAVE_HORIZON_FRACTION
  const focal = h * WAVE_FOCAL_FRACTION
  return horizon + ((waveCamHeight(energy) - waveHeight(worldX, z, t)) * focal) / z
}

/** Calm-water inverse of screenYForWave: the depth z whose flat-sea surface
 * projects to screenY. Returns Infinity at/above the horizon. */
export function zForScreenY(screenY: number, h: number, energy = 0): number {
  const horizon = h * WAVE_HORIZON_FRACTION
  const focal = h * WAVE_FOCAL_FRACTION
  const dy = screenY - horizon
  if (dy <= 0) return Infinity
  return (waveCamHeight(energy) * focal) / dy
}

/** World X whose projection at depth z lands on screenX — the x-inverse of the
 * canvas projection. A viewport X must map through its slot's z before
 * waveHeight(worldX, …) means anything. */
export function worldXForScreenX(screenXpx: number, z: number, w: number, h: number): number {
  const focal = h * WAVE_FOCAL_FRACTION
  return ((screenXpx - w / 2) * z) / focal
}
