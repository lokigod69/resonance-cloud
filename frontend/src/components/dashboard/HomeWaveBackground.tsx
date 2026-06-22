import { LingwaveWaves } from '@/components/branding/LingwaveWaves'

/**
 * HomeWaveBackground — the animated brand swell/star field from the login page,
 * pinned to the full viewport behind the dashboard. Replaces the old static
 * cosmos photo so Home and Login share one consistent backdrop. The canvas
 * caps DPR, pauses while the tab is hidden and respects prefers-reduced-motion,
 * so it is cheap enough to run on the landing surface.
 */
export function HomeWaveBackground() {
  return (
    <div aria-hidden="true" className="dashboard-wave-bg pointer-events-none fixed inset-0">
      <LingwaveWaves />
    </div>
  )
}
