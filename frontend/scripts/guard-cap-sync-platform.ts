// Refuses to run `cap sync ios` anywhere but macOS.
//
// On Windows the Capacitor CLI writes native Windows paths into the tracked
// ios/App/CapApp-SPM/Package.swift:
//   .package(name: "CapacitorApp", path: "..\..\..\node_modules\@capacitor\app")
// Swift reads \. and \n as escape sequences, so the manifest no longer compiles
// and the Xcode build dies on the Mac — after the corruption has been committed.
// Proven 2026-07-25 (investigations/TESTFLIGHT_READINESS_SCOPE_2026_07_25.md, B1).
//
// The `vite build --mode ios` + strip-ios-bundle steps ahead of this guard are
// platform-safe, so a Windows run still produces (and measures) the iOS dist —
// it just stops before touching the native project.
if (process.platform !== 'darwin') {
  console.error(
    `guard-cap-sync-platform: refusing to run \`cap sync ios\` on ${process.platform}.\n`
    + '  dist/ is built and stripped — the iOS-mode web bundle is ready to inspect.\n'
    + '  Run `npm run build:ios` on the Mac to sync it into ios/ and archive.\n'
    + '  (Syncing here would corrupt ios/App/CapApp-SPM/Package.swift with Windows paths.)',
  )
  process.exit(1)
}
