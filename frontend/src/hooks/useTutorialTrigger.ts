import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { TUTORIAL_START_SELECTORS, useTutorial } from '@/components/tutorial/TutorialProvider'
import type { TutorialId } from '@/lib/tutorials/types'

const MAX_READINESS_FRAMES = 50

function hasReadyTarget(id: TutorialId): boolean {
  return TUTORIAL_START_SELECTORS[id].some((selector) => document.querySelector(selector))
}

export function useTutorialTrigger(id: TutorialId): void {
  const { profile, profileLoading } = useAuth()
  const { pendingTutorial, setPendingTutorial, start, tutorialActive } = useTutorial()
  const requestedRef = useRef(false)

  useEffect(() => {
    if (tutorialActive) return
    if (profileLoading || !profile) return

    const pending = pendingTutorial?.id === id ? pendingTutorial : null
    if (requestedRef.current && !pending) return
    const versionedKey = `${id}.v1`
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
  }, [id, pendingTutorial, profile, profileLoading, setPendingTutorial, start, tutorialActive])
}
