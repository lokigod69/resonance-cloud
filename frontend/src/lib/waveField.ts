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

/** Map a horizontal screen percentage (0..100) to the field's world X. */
export function worldXFromPercent(xPercent: number): number {
  return (xPercent - 50) * 0.12
}
