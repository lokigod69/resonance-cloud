import { useEffect } from 'react'

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined

    const { body } = document
    const previousOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    const preventBodyTouchMove = (event: TouchEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('[data-body-scroll-lock-scrollable="true"]')) return
      event.preventDefault()
    }

    body.addEventListener('touchmove', preventBodyTouchMove, { passive: false })

    return () => {
      body.style.overflow = previousOverflow
      body.removeEventListener('touchmove', preventBodyTouchMove)
    }
  }, [active])
}
