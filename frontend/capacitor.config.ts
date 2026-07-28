import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Permanent from the first App Store Connect upload onward. Chosen 2026-07-26 (reverse-DNS
  // from lingwave.ai, the live domain) while no App Store record existed yet — renaming after
  // the first upload is impossible without abandoning the app record and its TestFlight history.
  appId: 'ai.lingwave.app',
  appName: 'Lingwave',
  webDir: 'dist',
  ios: {
    // Cosmos near-black. Without this the native webview paints white between the
    // launch screen and the app's first frame — a full-screen flash on every cold start.
    backgroundColor: '#0e0810',
  },
}

export default config
