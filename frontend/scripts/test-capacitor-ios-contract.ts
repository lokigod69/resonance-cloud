import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(relPath: string): string {
  return fs.readFileSync(path.join(root, relPath), 'utf8')
}

function json<T>(relPath: string): T {
  return JSON.parse(read(relPath)) as T
}

// PNG IHDR: width/height at bytes 16-23, colour type at byte 25 (4 and 6 carry alpha).
function pngHeader(relPath: string): { width: number, height: number, hasAlpha: boolean } {
  const buf = fs.readFileSync(path.join(root, relPath))
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    hasAlpha: buf[25] === 4 || buf[25] === 6,
  }
}

function exists(relPath: string): boolean {
  return fs.existsSync(path.join(root, relPath))
}

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function assertIncludes(source: string, needle: string, label: string): void {
  assert(source.includes(needle), `${label} must include ${needle}`)
}

function assertNotIncludes(source: string, needle: string, label: string): void {
  assert(!source.includes(needle), `${label} must not include ${needle}`)
}

type PackageJson = {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const packageJson = json<PackageJson>('package.json')
const deps = packageJson.dependencies ?? {}
const devDeps = packageJson.devDependencies ?? {}
const scripts = packageJson.scripts ?? {}

for (const dep of ['@capacitor/app', '@capacitor/browser', '@capacitor/core', '@capacitor/preferences']) {
  assert(dep in deps, `package.json dependencies must include ${dep}`)
}

for (const dep of ['@capacitor/cli', '@capacitor/ios']) {
  assert(dep in devDeps, `package.json devDependencies must include ${dep}`)
}

assert(scripts['build:ios']?.includes('vite build'), 'package.json must define build:ios')
assert(scripts['build:ios']?.includes('strip-ios-bundle'), 'build:ios must strip web-served asset trees before cap sync')
assert(scripts['build:ios']?.includes('guard-cap-sync-platform'), 'build:ios must refuse to cap sync off macOS (Windows writes backslash paths into Package.swift)')
assert(scripts['cap:sync:ios']?.includes('cap sync ios'), 'package.json must define cap:sync:ios')

assert(exists('capacitor.config.ts'), 'capacitor.config.ts must exist')
const capacitorConfig = read('capacitor.config.ts')
// The bundle id becomes permanent at the first App Store Connect upload. It must be identical in
// four places or the archive is signed as one app and the universal links point at another.
const BUNDLE_ID = 'ai.lingwave.app'
const APPLE_TEAM_ID = 'ZL69STWQHV'

assertIncludes(capacitorConfig, `appId: '${BUNDLE_ID}'`, 'capacitor.config.ts')
assertIncludes(capacitorConfig, "appName: 'Lingwave'", 'capacitor.config.ts')
assertIncludes(capacitorConfig, "webDir: 'dist'", 'capacitor.config.ts')

const pbxproj = read('ios/App/App.xcodeproj/project.pbxproj')
assertIncludes(pbxproj, `PRODUCT_BUNDLE_IDENTIFIER = ${BUNDLE_ID};`, 'ios/App/App.xcodeproj/project.pbxproj')
assertNotIncludes(pbxproj, 'pro.resonanz.app', 'ios/App/App.xcodeproj/project.pbxproj')
// Without a signing team Xcode cannot produce an archive at all — the failure only surfaces on the
// Mac, halfway through an upload session, so it is asserted here where it is cheap to catch.
assertIncludes(pbxproj, `DEVELOPMENT_TEAM = ${APPLE_TEAM_ID};`, 'ios/App/App.xcodeproj/project.pbxproj')
assert(
  pbxproj.split(`DEVELOPMENT_TEAM = ${APPLE_TEAM_ID};`).length - 1 === 2,
  'both the Debug and Release build configurations must set DEVELOPMENT_TEAM',
)

// The AASA appID is `<TeamID>.<BundleID>`; a mismatch silently breaks universal links with no error.
const aasa = read('public/.well-known/apple-app-site-association')
assertIncludes(aasa, `"appID": "${APPLE_TEAM_ID}.${BUNDLE_ID}"`, 'public/.well-known/apple-app-site-association')

const tsconfigNode = read('tsconfig.node.json')
assertIncludes(tsconfigNode, 'capacitor.config.ts', 'tsconfig.node.json')

const publicOrigins = read('src/lib/publicOrigins.ts')
for (const token of [
  'VITE_PUBLIC_API_ORIGIN',
  'VITE_PUBLIC_WEB_ORIGIN',
  'VITE_NATIVE_AUTH_REDIRECT_URL',
  'publicApiUrl',
  'publicAssetUrl',
  'getOAuthRedirectTo',
]) {
  assertIncludes(publicOrigins, token, 'src/lib/publicOrigins.ts')
}

const stripScript = read('scripts/strip-ios-bundle.ts')
for (const target of ["'curriculum'", "'guided/trophy-songs'", "'guided/vibes'"]) {
  assertIncludes(stripScript, target, 'scripts/strip-ios-bundle.ts')
}

// Stripped trees must be fetched from the web origin on device.
for (const relPath of ['src/data/guidedVibes.ts', 'src/data/guidedTrophySongs.ts']) {
  assertIncludes(read(relPath), 'publicAssetUrl(', relPath)
}

const cors = read('api/_shared/cors.ts')
assertIncludes(cors, 'capacitor://localhost', 'api/_shared/cors.ts')
assertIncludes(cors, 'ionic://localhost', 'api/_shared/cors.ts')

const apiClient = read('src/api.ts')
assertIncludes(apiClient, 'getBackendApiBase', 'src/api.ts')
assertNotIncludes(apiClient, "import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090'", 'src/api.ts')
assertIncludes(apiClient, 'isNativeApp() ? getPublicApiOrigin() : configuredBackendOrigin ?? LOCAL_BACKEND_ORIGIN', 'src/api.ts')

const supabaseClient = read('src/lib/supabase.ts')
for (const token of [
  '@capacitor/preferences',
  "flowType: 'pkce'",
  'detectSessionInUrl: false',
  'capacitorPreferencesStorage',
]) {
  assertIncludes(supabaseClient, token, 'src/lib/supabase.ts')
}

for (const relPath of [
  'src/hooks/useGenerateImagelessTts.ts',
  'src/hooks/useExtractVocabulary.ts',
  'src/pages/Speak.tsx',
  'src/hooks/useGuidedSpeechRecognition.ts',
  'src/hooks/useGrokRealtime.ts',
  'src/hooks/useVoiceTutor.ts',
  'src/hooks/useRegenerateImagelessTts.ts',
  'src/hooks/useTranslateAndIpa.ts',
  'src/pages/PlansPage.tsx',
  'src/components/generate/steps/CategoryPicker.tsx',
  'src/components/speak/VoiceSampleButton.tsx',
  'src/components/speak/SpeakHistoryPanel.tsx',
]) {
  const source = read(relPath)
  assertNotIncludes(source, "fetch('/api", relPath)
  assertIncludes(source, 'publicApiUrl(', relPath)
}

const useAuth = read('src/hooks/useAuth.ts')
assertNotIncludes(useAuth, 'window.location.origin +', 'src/hooks/useAuth.ts')
assertIncludes(useAuth, 'skipBrowserRedirect: true', 'src/hooks/useAuth.ts')
assertIncludes(useAuth, 'Browser.open', 'src/hooks/useAuth.ts')
assertNotIncludes(read('src/lib/shareWord.ts'), 'window.location.origin', 'src/lib/shareWord.ts')

const login = read('src/pages/Login.tsx')
assertNotIncludes(login, 'window.location.origin', 'src/pages/Login.tsx')
assertIncludes(login, 'getPublicWebUrl', 'src/pages/Login.tsx')
assertIncludes(login, "redirectTo: getPublicWebUrl('/reset-password')", 'src/pages/Login.tsx')

// Checkout moved from RedeemCodeDialog to /plans (2026-07-28 tier batch).
// The dialog only links to the page and must hide that link on native; the
// page itself must never render checkout buttons on native (App Review 3.1.1).
const redeemCodeDialog = read('src/components/RedeemCodeDialog.tsx')
assertIncludes(redeemCodeDialog, 'isNativeApp', 'src/components/RedeemCodeDialog.tsx')
assertNotIncludes(redeemCodeDialog, 'create-checkout-session', 'src/components/RedeemCodeDialog.tsx')
const plansPage = read('src/pages/PlansPage.tsx')
assertIncludes(plansPage, 'isNativeApp', 'src/pages/PlansPage.tsx')
assertIncludes(plansPage, 'if (native) return', 'src/pages/PlansPage.tsx')

const deepLinks = read('src/hooks/useCapacitorDeepLinks.ts')
assertIncludes(deepLinks, "App.addListener('appUrlOpen'", 'src/hooks/useCapacitorDeepLinks.ts')
assertIncludes(deepLinks, 'exchangeCodeForSession', 'src/hooks/useCapacitorDeepLinks.ts')
assertIncludes(deepLinks, 'Browser.close', 'src/hooks/useCapacitorDeepLinks.ts')
assertIncludes(deepLinks, 'navigate(', 'src/hooks/useCapacitorDeepLinks.ts')

const app = read('src/App.tsx')
assertIncludes(app, 'useCapacitorDeepLinks', 'src/App.tsx')

for (const relPath of [
  'src/hooks/useGuidedSpeechRecognition.ts',
  'src/hooks/useGrokRealtime.ts',
  'src/hooks/useVoiceTutor.ts',
]) {
  const source = read(relPath)
  assertIncludes(source, 'ensureNativeMicrophonePermission', relPath)
}

const videoPlayer = read('src/pages/VideoPlayer.tsx')
assertIncludes(videoPlayer, 'muted={videoMuted}', 'src/pages/VideoPlayer.tsx')
assertIncludes(videoPlayer, 'Volume2', 'src/pages/VideoPlayer.tsx')

// Guideline 3.1.1: the native app must never offer the Stripe checkout path. The gate has
// to live in code, not in env — VITE_STRIPE_BILLING_SANDBOX_ENABLED is baked in from the
// .env of whatever machine builds the iOS bundle, and it was `true` here on 2026-07-25.
const billingFlags = read('src/lib/billingFlags.ts')
assertIncludes(billingFlags, 'if (isNativeApp()) return false', 'src/lib/billingFlags.ts')

const infoPlist = read('ios/App/App/Info.plist')
assertIncludes(infoPlist, 'NSMicrophoneUsageDescription', 'ios/App/App/Info.plist')
// HTTPS-only app: declaring the standard exemption up front stops App Store Connect
// asking the export-compliance question on every single upload.
assertIncludes(infoPlist, 'ITSAppUsesNonExemptEncryption', 'ios/App/App/Info.plist')
assertIncludes(infoPlist, 'CFBundleURLSchemes', 'ios/App/App/Info.plist')
assertIncludes(infoPlist, 'resonance', 'ios/App/App/Info.plist')

// The App Store icon must be exactly 1024x1024 with NO alpha channel — Xcode rejects
// alpha outright. Generated from public/android-chrome-512x512.png (2026-07-25), replacing
// the stock Capacitor placeholder that had shipped in this slot since the project was created.
const appIcon = pngHeader('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
assert(appIcon.width === 1024 && appIcon.height === 1024, `app icon must be 1024x1024, got ${appIcon.width}x${appIcon.height}`)
assert(!appIcon.hasAlpha, 'app icon must not carry an alpha channel — Xcode rejects it')
const splash = pngHeader('ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png')
assert(splash.width === 2732 && splash.height === 2732, `splash must be 2732x2732, got ${splash.width}x${splash.height}`)

assertIncludes(capacitorConfig, "backgroundColor: '#0e0810'", 'capacitor.config.ts')

assert(exists('ios/App/App/PrivacyInfo.xcprivacy'), 'ios/App/App/PrivacyInfo.xcprivacy must exist')
const privacyManifest = read('ios/App/App/PrivacyInfo.xcprivacy')
assertIncludes(privacyManifest, 'NSPrivacyAccessedAPICategoryUserDefaults', 'ios/App/App/PrivacyInfo.xcprivacy')
assertIncludes(privacyManifest, 'CA92.1', 'ios/App/App/PrivacyInfo.xcprivacy')

const appDelegate = read('ios/App/App/AppDelegate.swift')
assertIncludes(appDelegate, 'AVFoundation', 'ios/App/App/AppDelegate.swift')
assertIncludes(appDelegate, 'AVAudioSession.sharedInstance()', 'ios/App/App/AppDelegate.swift')

const xcodeProject = read('ios/App/App.xcodeproj/project.pbxproj')
assertIncludes(xcodeProject, 'IPHONEOS_DEPLOYMENT_TARGET = 15.0;', 'ios/App/App.xcodeproj/project.pbxproj')
assertIncludes(xcodeProject, 'CODE_SIGN_ENTITLEMENTS = App/App.entitlements;', 'ios/App/App.xcodeproj/project.pbxproj')
assertIncludes(xcodeProject, 'PrivacyInfo.xcprivacy in Resources', 'ios/App/App.xcodeproj/project.pbxproj')

const entitlements = read('ios/App/App/App.entitlements')
// resonanz.pro is dead (DEPLOYMENT_NOT_FOUND) so it can never serve an AASA file —
// an applinks entry for it is a domain the App ID has to provision and can never validate.
assertNotIncludes(entitlements, 'applinks:resonanz.pro', 'ios/App/App/App.entitlements')
assertNotIncludes(entitlements, 'applinks:www.resonanz.pro', 'ios/App/App/App.entitlements')
assertIncludes(entitlements, 'applinks:lingwave.ai', 'ios/App/App/App.entitlements')
assertIncludes(entitlements, 'applinks:www.lingwave.ai', 'ios/App/App/App.entitlements')

const swiftPackage = read('ios/App/CapApp-SPM/Package.swift')
assertIncludes(swiftPackage, 'CapacitorBrowser', 'ios/App/CapApp-SPM/Package.swift')
assertNotIncludes(swiftPackage, '..\\..\\..\\node_modules', 'ios/App/CapApp-SPM/Package.swift')
assertIncludes(swiftPackage, '../../../node_modules/@capacitor/app', 'ios/App/CapApp-SPM/Package.swift')
assertIncludes(swiftPackage, '../../../node_modules/@capacitor/browser', 'ios/App/CapApp-SPM/Package.swift')
assertIncludes(swiftPackage, '../../../node_modules/@capacitor/preferences', 'ios/App/CapApp-SPM/Package.swift')

console.log('Capacitor iOS shell contract passed')
