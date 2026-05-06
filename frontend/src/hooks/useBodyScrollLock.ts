import { useEffect } from 'react'

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === 'undefined' || typeof window === 'undefined') return undefined

    const { body } = document
    const root = document.documentElement
    const scrollY = window.scrollY
    const previousOverflow = body.style.overflow
    const previousPosition = body.style.position
    const previousTop = body.style.top
    const previousLeft = body.style.left
    const previousRight = body.style.right
    const previousWidth = body.style.width
    const previousOverscrollBehavior = body.style.overscrollBehavior
    const previousRootOverflow = root.style.overflow
    const previousRootOverscrollBehavior = root.style.overscrollBehavior

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
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
      body.style.position = previousPosition
      body.style.top = previousTop
      body.style.left = previousLeft
      body.style.right = previousRight
      body.style.width = previousWidth
      body.style.overscrollBehavior = previousOverscrollBehavior
      root.style.overflow = previousRootOverflow
      root.style.overscrollBehavior = previousRootOverscrollBehavior
      document.removeEventListener('touchmove', preventBodyTouchMove)
      window.scrollTo(0, scrollY)
    }
  }, [active])
}
