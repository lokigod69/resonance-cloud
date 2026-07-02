import { LingwaveWaves } from '@/components/branding/LingwaveWaves'

/**
 * HomeWaveBackground — the animated brand swell/star field from the login page,
 * pinned to the full viewport behind the dashboard. Replaces the old static
 * cosmos photo so Home and Login share one consistent backdrop. The canvas
 * caps DPR, pauses while the tab is hidden and respects prefers-reduced-motion,
 * so it is cheap enough to run on the landing surface.
 */
export function HomeWaveBackground() {
  // fixed so the waves always fill the whole viewport, including below the
  // dashboard section. Note: browsers composite fixed layers independently and
  // may leave them out of backdrop-filter sampling, so card materials must not
  // rely on blur to hide the waves — their body color is near-opaque instead.
  return (
    <div aria-hidden="true" className="dashboard-wave-bg pointer-events-none fixed inset-0">
      <LingwaveWaves />
    </div>
  )
}
