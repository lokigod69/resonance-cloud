import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import 'driver.js/dist/driver.css'
import { useAuth } from '@/hooks/useAuth'
import { useSkin, type SkinId } from '@/contexts/SkinContext'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase, type AuthProfile } from '@/lib/supabase'
import { createDashboardPointerTutorial } from '@/lib/tutorials/dashboard'
import { createGenerateTutorial } from '@/lib/tutorials/generate'
import type { TFunction, TutorialDefinition, TutorialId } from '@/lib/tutorials/types'
import type { Driver, PopoverDOM } from 'driver.js'

const driverPromise = () => import('driver.js').then((m) => m.driver)
const dashboardGenerateSelector = '[data-tutorial-id="dashboard.go_to_generate"]'

export const TUTORIAL_START_SELECTORS: Record<TutorialId, string[]> = {
  'dashboard-pointer': [
    dashboardGenerateSelector,
  ],
  generate: [
    '[data-tutorial-id="generate.lang_picker"]',
    '[data-tutorial-id="generate.product_lane"]',
    '[data-tutorial-id="generate.category_picker"]',
    '[data-tutorial-id="generate.words_input"]',
    '[data-tutorial-id="generate.quick_generate_button"]',
    '[data-tutorial-id="generate.customize_button"]',
  ],
}

export const TUTORIAL_FACTORIES: Record<TutorialId, (t: TFunction) => TutorialDefinition> = {
  'dashboard-pointer': createDashboardPointerTutorial,
  generate: createGenerateTutorial,
}

export function getTutorialDefinition(id: TutorialId, t: TFunction): TutorialDefinition | null {
  const createDefinition = TUTORIAL_FACTORIES[id]
  return createDefinition ? createDefinition(t) : null
}

export interface PendingTutorial {
  id: TutorialId
  force?: boolean
}

interface TutorialContextValue {
  start: (id: TutorialId, opts?: { force?: boolean }) => Promise<void>
  pendingTutorial: PendingTutorial | null
  setPendingTutorial: (request: PendingTutorial | null) => void
  tutorialActive: boolean
}

const TutorialContext = createContext<TutorialContextValue | null>(null)

function applyTutorialPopover(popover: PopoverDOM, activeIndex: number, activeTutorialId: TutorialId | null, skin: SkinId, t: TFunction) {
  popover.wrapper.classList.add('resonance-tutorial-popover')
  popover.wrapper.classList.toggle('resonance-tutorial-popover--glassy', skin === 'glassy')
  popover.wrapper.classList.toggle('resonance-tutorial-popover--classic', skin === 'classic')
  popover.wrapper.dataset.tutorialId = activeTutorialId ?? ''
  popover.wrapper.dataset.tutorialStep = String(activeIndex)

  if (activeIndex === 0 || activeTutorialId === 'dashboard-pointer') {
    popover.closeButton.textContent = t('tutorial.welcome.skip')
  }
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth()
  const { skin } = useSkin()
  const { t } = useTranslation()
  const location = useLocation()
  const [pendingTutorial, setPendingTutorial] = useState<PendingTutorial | null>(null)
  const [tutorialActive, setTutorialActive] = useState(false)
  const profileRef = useRef<AuthProfile | null>(profile)
  const userIdRef = useRef<string | null>(user?.id ?? null)
  const driverRef = useRef<Driver | null>(null)
  const activeTutorialIdRef = useRef<TutorialId | null>(null)
  const suppressMarkOnDestroyRef = useRef(false)
  const pathnameRef = useRef(location.pathname)

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    userIdRef.current = user?.id ?? null
  }, [user?.id])

  const markSeen = useCallback(async (definition: TutorialDefinition) => {
    const userId = userIdRef.current
    if (!userId) return

    const current = profileRef.current?.seen_tutorials ?? {}
    if (current[definition.versionedKey] != null) return

    const seenTutorials = {
      ...current,
      [definition.versionedKey]: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('profiles')
      .update({ seen_tutorials: seenTutorials })
      .eq('id', userId)

    if (!error) {
      await refreshProfile()
    }
  }, [refreshProfile])

  const start = useCallback(async (id: TutorialId, opts?: { force?: boolean }) => {
    const definition = getTutorialDefinition(id, t)
    if (!definition) return

    const createDriver = await driverPromise()
    let finalized = false

    driverRef.current?.destroy()
    activeTutorialIdRef.current = id
    suppressMarkOnDestroyRef.current = false
    setTutorialActive(true)

    const driver = createDriver({
      steps: definition.steps,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayClickBehavior: 'close',
      overlayColor: '#020617',
      overlayOpacity: 0.78,
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: 'resonance-tutorial-popover',
      showButtons: ['previous', 'next', 'close'],
      doneBtnText: t(definition.completionDismissKey),
      nextBtnText: t('common.next'),
      prevBtnText: t('common.back'),
      onPopoverRender: (popover, { state }) => {
        applyTutorialPopover(popover, state.activeIndex ?? 0, activeTutorialIdRef.current, skin, t)
      },
      onDestroyed: () => {
        if (finalized) return
        finalized = true
        const suppressMark = suppressMarkOnDestroyRef.current
        suppressMarkOnDestroyRef.current = false
        driverRef.current = null
        activeTutorialIdRef.current = null
        setTutorialActive(false)
        if (!suppressMark && opts?.force !== true) {
          void markSeen(definition)
        }
      },
    })

    driverRef.current = driver
    driver.drive()
  }, [markSeen, skin, t])

  useEffect(() => {
    const handleDashboardGenerateClick = (event: MouseEvent) => {
      if (activeTutorialIdRef.current !== 'dashboard-pointer') return
      const target = event.target instanceof Element
        ? event.target.closest(dashboardGenerateSelector)
        : null
      if (!target) return

      setPendingTutorial({ id: 'generate', force: false })
      suppressMarkOnDestroyRef.current = true
      driverRef.current?.destroy()
    }

    document.addEventListener('click', handleDashboardGenerateClick, true)
    return () => {
      document.removeEventListener('click', handleDashboardGenerateClick, true)
    }
  }, [])

  useEffect(() => {
    if (pathnameRef.current === location.pathname) return
    pathnameRef.current = location.pathname
    if (!driverRef.current) return

    suppressMarkOnDestroyRef.current = true
    driverRef.current.destroy()
  }, [location.pathname])

  useEffect(() => {
    return () => {
      suppressMarkOnDestroyRef.current = true
      driverRef.current?.destroy()
    }
  }, [])

  const value = useMemo<TutorialContextValue>(
    () => ({ start, pendingTutorial, setPendingTutorial, tutorialActive }),
    [pendingTutorial, start, tutorialActive]
  )

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  const context = useContext(TutorialContext)
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider')
  }
  return context
}
