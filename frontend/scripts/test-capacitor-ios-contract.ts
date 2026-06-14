import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(relPath: string): string {
  return fs.readFileSync(path.join(root, relPath), 'utf8')
}

function json<T>(relPath: string): T {
  return JSON.parse(read(relPath)) as T
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
assert(scripts['cap:sync:ios']?.includes('cap sync ios'), 'package.json must define cap:sync:ios')

assert(exists('capacitor.config.ts'), 'capacitor.config.ts must exist')
const capacitorConfig = read('capacitor.config.ts')
assertIncludes(capacitorConfig, "appId: 'pro.resonanz.app'", 'capacitor.config.ts')
assertIncludes(capacitorConfig, "appName: 'Lingwave'", 'capacitor.config.ts')
assertIncludes(capacitorConfig, "webDir: 'dist'", 'capacitor.config.ts')

const tsconfigNode = read('tsconfig.node.json')
assertIncludes(tsconfigNode, 'capacitor.config.ts', 'tsconfig.node.json')

const publicOrigins = read('src/lib/publicOrigins.ts')
for (const token of [
  'VITE_PUBLIC_API_ORIGIN',
  'VITE_PUBLIC_WEB_ORIGIN',
  'VITE_NATIVE_AUTH_REDIRECT_URL',
  'publicApiUrl',
  'getOAuthRedirectTo',
]) {
  assertIncludes(publicOrigins, token, 'src/lib/publicOrigins.ts')
}

const cors = read('api/_shared/cors.ts')
assertIncludes(cors, 'capacitor://localhost', 'api/_shared/cors.ts')
assertIncludes(cors, 'ionic://localhost', 'api/_shared/cors.ts')

const apiClient = read('src/api.ts')
assertIncludes(apiClient, 'getBackendApiBase', 'src/api.ts')
assertNotIncludes(apiClient, "import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090'", 'src/api.ts')

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
  'src/components/RedeemCodeDialog.tsx',
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

const infoPlist = read('ios/App/App/Info.plist')
assertIncludes(infoPlist, 'NSMicrophoneUsageDescription', 'ios/App/App/Info.plist')
assertIncludes(infoPlist, 'CFBundleURLSchemes', 'ios/App/App/Info.plist')
assertIncludes(infoPlist, 'resonance', 'ios/App/App/Info.plist')

const appDelegate = read('ios/App/App/AppDelegate.swift')
assertIncludes(appDelegate, 'AVFoundation', 'ios/App/App/AppDelegate.swift')
assertIncludes(appDelegate, 'AVAudioSession.sharedInstance()', 'ios/App/App/AppDelegate.swift')

const xcodeProject = read('ios/App/App.xcodeproj/project.pbxproj')
assertIncludes(xcodeProject, 'IPHONEOS_DEPLOYMENT_TARGET = 15.0;', 'ios/App/App.xcodeproj/project.pbxproj')
assertIncludes(xcodeProject, 'CODE_SIGN_ENTITLEMENTS = App/App.entitlements;', 'ios/App/App.xcodeproj/project.pbxproj')

const entitlements = read('ios/App/App/App.entitlements')
assertIncludes(entitlements, 'applinks:resonanz.pro', 'ios/App/App/App.entitlements')
assertIncludes(entitlements, 'applinks:www.resonanz.pro', 'ios/App/App/App.entitlements')
assertIncludes(entitlements, 'applinks:lingwave.ai', 'ios/App/App/App.entitlements')
assertIncludes(entitlements, 'applinks:www.lingwave.ai', 'ios/App/App/App.entitlements')

const swiftPackage = read('ios/App/CapApp-SPM/Package.swift')
assertIncludes(swiftPackage, 'CapacitorBrowser', 'ios/App/CapApp-SPM/Package.swift')

console.log('Capacitor iOS shell contract passed')
