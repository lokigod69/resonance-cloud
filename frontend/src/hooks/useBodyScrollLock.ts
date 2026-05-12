import { useEffect } from 'react'

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === 'undefined' || typeof window === 'undefined') return undefined

    const { body } = document
    const root = document.documentElement
    const previousOverflow = body.style.overflow
    const previousOverscrollBehavior = body.style.overscrollBehavior
    const previousRootOverflow = root.style.overflow
    const previousRootOverscrollBehavior = root.style.overscrollBehavior

    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    root.style.overflow = 'hidden'
    root.style.overscrollBehavior = 'none'

    const preventBodyTouchMove = (event: TouchEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('[data-body-scroll-lock-scrollable="true"]')) return
      event.preventDefault()
    }

    document.addEventListener('touchmove', preventBodyTouchMove, { passive: false })

    return () => {
      body.style.overflow = previousOverflow
      body.style.overscrollBehavior = previousOverscrollBehavior
      root.style.overflow = previousRootOverflow
      root.style.overscrollBehavior = previousRootOverscrollBehavior
      document.removeEventListener('touchmove', preventBodyTouchMove)
    }
  }, [active])
}
