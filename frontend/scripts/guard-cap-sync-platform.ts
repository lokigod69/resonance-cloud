// Refuses to run `cap sync ios` anywhere but macOS.
//
// On Windows the Capacitor CLI writes native Windows paths into the tracked
// ios/App/CapApp-SPM/Package.swift:
//   .package(name: "CapacitorApp", path: "..\..\..\node_modules\@capacitor\app")
// Swift reads \. and \n as escape sequences, so the manifest no longer compiles
// and the Xcode build dies on the Mac — after the corruption has been committed.
// Proven 2026-07-25 (investigations/TESTFLIGHT_READINESS_SCOPE_2026_07_25.md, B1).
//
// Use build:ios:web to prepare and verify the portable payload on Windows.
if (process.platform !== 'darwin') {
  console.error(
    `guard-cap-sync-platform: refusing to run \`cap sync ios\` on ${process.platform}.\n`
    + '  Run `npm run build:ios:web` to build and verify the portable payload here.\n'
    + '  Run `npm run build:ios` on the Mac to sync it into ios/ and archive.\n'
    + '  (Syncing here would corrupt ios/App/CapApp-SPM/Package.swift with Windows paths.)',
  )
  process.exit(1)
}
