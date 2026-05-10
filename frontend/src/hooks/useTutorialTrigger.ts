import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getTutorialDefinition, TUTORIAL_START_SELECTORS, useTutorial } from '@/components/tutorial/TutorialProvider'
import { useTranslation } from '@/hooks/useTranslation'
import type { TutorialId } from '@/lib/tutorials/types'

const MAX_READINESS_FRAMES = 50

function isReadyTarget(target: Element): boolean {
  if (!(target instanceof HTMLElement)) return true
  return target.offsetWidth > 0 || target.offsetHeight > 0 || target.getClientRects().length > 0
}

function hasReadyTarget(id: TutorialId): boolean {
  return TUTORIAL_START_SELECTORS[id].some((selector) =>
    Array.from(document.querySelectorAll(selector)).some(isReadyTarget)
  )
}

export function useTutorialTrigger(id: TutorialId): void {
  const { profile, profileLoading } = useAuth()
  const { pendingTutorial, setPendingTutorial, start, tutorialActive } = useTutorial()
  const { t } = useTranslation()
  const requestedRef = useRef(false)

  useEffect(() => {
    if (tutorialActive) return
    if (profileLoading || !profile) return

    const pending = pendingTutorial?.id === id ? pendingTutorial : null
    if (id === 'dashboard-pointer' && pendingTutorial) return
    if (requestedRef.current && !pending) return
    const definition = getTutorialDefinition(id, t)
    if (!definition) return
    const versionedKey = definition.versionedKey
    const shouldStart = pending || profile.seen_tutorials?.[versionedKey] == null
    if (!shouldStart) return

    let cancelled = false
    let frame = 0
    let rafId = 0

    const tick = () => {
      if (cancelled) return
      if (hasReadyTarget(id)) {
        requestedRef.current = true
        if (pending) {
          setPendingTutorial(null)
        }
        void start(id, pending ? { force: pending.force } : undefined)
        return
      }
      frame += 1
      if (frame >= MAX_READINESS_FRAMES) {
        if (pending) {
          setPendingTutorial(null)
        }
        return
      }
      rafId = window.requestAnimationFrame(tick)
    }

    rafId = window.requestAnimationFrame(tick)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(rafId)
    }
  }, [id, pendingTutorial, profile, profileLoading, setPendingTutorial, start, t, tutorialActive])
}
