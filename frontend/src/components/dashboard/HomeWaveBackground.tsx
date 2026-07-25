import { LingwaveWaves, type WaveRipple } from '@/components/branding/LingwaveWaves'

/**
 * HomeWaveBackground — the animated brand swell/star field from the login page,
 * pinned to the full viewport behind the dashboard. Replaces the old static
 * cosmos photo so Home and Login share one consistent backdrop. The canvas
 * caps DPR, pauses while the tab is hidden and respects prefers-reduced-motion,
 * so it is cheap enough to run on the landing surface.
 *
 * The First Light home drives the sea live through the optional pass-through
 * props: `dawn` (session progress → sky warmth, eased inside the renderer),
 * `ripplesRef` (grade taps roll through the contours), and `clockRef` (the
 * canvas's wave clock, read back by the buoys so both ride one time base).
 */
export function HomeWaveBackground({
  dawn,
  ripplesRef,
  clockRef,
}: {
  dawn?: number
  ripplesRef?: { current: WaveRipple[] }
  clockRef?: { current: number }
} = {}) {
  // fixed so the waves always fill the whole viewport, including below the
  // dashboard section. Note: browsers composite fixed layers independently and
  // may leave them out of backdrop-filter sampling, so card materials must not
  // rely on blur to hide the waves — their body color is near-opaque instead.
  return (
    <div aria-hidden="true" className="dashboard-wave-bg pointer-events-none fixed inset-0">
      <LingwaveWaves dawn={dawn} ripplesRef={ripplesRef} clockRef={clockRef} />
    </div>
  )
}
