export const routeImports = {
  landingPage: () => import('@/pages/LandingPage'),
  login: () => import('@/pages/Login'),
  resetPassword: () => import('@/pages/ResetPassword'),
  onboarding: () => import('@/pages/Onboarding'),
  sharePage: () => import('@/pages/SharePage'),
  hybridALanding: () => import('@/landing-experiments/hybrid-a/HybridALanding'),
  hybridBLanding: () => import('@/landing-experiments/hybrid-b/HybridBLanding'),
  landingExperimentIndex: () => import('@/landing-experiments/hybrid-a/LandingExperimentIndex'),
  dashboard: () => import('@/pages/Dashboard'),
  dashboardPG: () => import('@/pages/DashboardPG'),
  lens: () => import('@/pages/Lens'),
  today: () => import('@/pages/Today'),
  guidedCheckpoint: () => import('@/pages/GuidedCheckpoint'),
  categoryList: () => import('@/pages/categories/CategoryListPage'),
  categoryDetail: () => import('@/pages/categories/CategoryDetailPage'),
  levelDetail: () => import('@/pages/categories/LevelDetailPage'),
  gamesHub: () => import('@/pages/GamesHub'),
  generate: () => import('@/pages/Generate'),
  generateGO: () => import('@/pages/GenerateGO'),
  decks: () => import('@/pages/Decks'),
  decksPG: () => import('@/pages/DecksPG'),
  deckView: () => import('@/pages/DeckView'),
  deckViewPG: () => import('@/pages/DeckViewPG'),
  videoPlayer: () => import('@/pages/VideoPlayer'),
  study: () => import('@/pages/Study'),
  studyPG: () => import('@/pages/StudyPG'),
  studyImage: () => import('@/pages/StudyImage'),
  studyImagePG: () => import('@/pages/StudyImagePG'),
  studyModeSelector: () => import('@/pages/StudyModeSelector'),
  studyFlashcard: () => import('@/pages/StudyFlashcard'),
  studyType: () => import('@/pages/StudyType'),
  studyAudio: () => import('@/pages/StudyAudio'),
  studyCanvas: () => import('@/pages/StudyCanvas'),
  canvasDeckPicker: () => import('@/pages/CanvasDeckPicker'),
  music: () => import('@/pages/Music'),
  musicPG: () => import('@/pages/MusicPG'),
  speak: () => import('@/pages/Speak'),
  scriptLab: () => import('@/pages/ScriptLab'),
  adminUsers: () => import('@/pages/admin/Users'),
  adminContent: () => import('@/pages/admin/Content'),
  adminMetrics: () => import('@/pages/admin/Metrics'),
  adminQueue: () => import('@/pages/admin/Queue'),
  adminProfiles: () => import('@/pages/admin/Profiles'),
  adminVoices: () => import('@/pages/admin/Voices'),
  adminQuotas: () => import('@/pages/admin/Quotas'),
  adminLayer2Lab: () => import('@/pages/admin/Layer2Lab'),
  adminCurriculumImageSets: () => import('@/pages/admin/CurriculumImageSets'),
  adminObservabilityAggregate: () => import('@/pages/admin/ObservabilityAggregate'),
  adminObservabilityWordDetail: () => import('@/pages/admin/ObservabilityWordDetail'),
  adminObservabilityCost: () => import('@/pages/admin/ObservabilityCost'),
  slicerGame: () => import('@/games/slicer/SlicerGame'),
} as const

export type RouteImport = () => Promise<unknown>

const idleWindow = () => window as Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
  cancelIdleCallback?: (id: number) => void
}

export function prefetchRouteImport(routeImport: RouteImport) {
  void routeImport().catch(() => undefined)
}

export function scheduleIdleRoutePrefetch(routeImportList: readonly RouteImport[], timeout = 1500) {
  if (typeof window === 'undefined' || routeImportList.length === 0) return () => undefined

  let cancelled = false
  const run = () => {
    if (cancelled) return
    for (const routeImport of routeImportList) {
      prefetchRouteImport(routeImport)
    }
  }

  const win = idleWindow()
  if (typeof win.requestIdleCallback === 'function') {
    const id = win.requestIdleCallback(run, { timeout })
    return () => {
      cancelled = true
      win.cancelIdleCallback?.(id)
    }
  }

  const id = window.setTimeout(run, 600)
  return () => {
    cancelled = true
    window.clearTimeout(id)
  }
}

// NOTE: /today is deliberately not prefetched — its chunk statically depends on
// the ~2.8MB guidedLessons module (guided helpers live in the same file as the
// data), so warming it would pull megabytes on every app boot.
export function getPrimaryNavRouteImports(skin: 'classic' | 'glassy'): RouteImport[] {
  return skin === 'glassy'
    ? [
        routeImports.dashboardPG,
        routeImports.decksPG,
        routeImports.studyModeSelector,
        routeImports.musicPG,
        routeImports.speak,
      ]
    : [
        routeImports.dashboard,
        routeImports.decks,
        routeImports.studyModeSelector,
        routeImports.music,
        routeImports.speak,
      ]
}
