import { useLayoutEffect } from 'react'

let safeAreaBottomPx: number | null = null

export function useCanvasSafeAreaCacheReset() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined

    const resetSafeAreaCache = () => {
      safeAreaBottomPx = null
    }

    window.addEventListener('resize', resetSafeAreaCache)
    window.addEventListener('orientationchange', resetSafeAreaCache)
    window.visualViewport?.addEventListener('resize', resetSafeAreaCache)

    return () => {
      window.removeEventListener('resize', resetSafeAreaCache)
      window.removeEventListener('orientationchange', resetSafeAreaCache)
      window.visualViewport?.removeEventListener('resize', resetSafeAreaCache)
    }
  }, [])
}

function getSafeAreaBottomPx() {
  if (safeAreaBottomPx !== null) return safeAreaBottomPx
  if (typeof document === 'undefined') return 0

  const probe = document.createElement('div')
  probe.style.position = 'fixed'
  probe.style.left = '-9999px'
  probe.style.bottom = '0'
  probe.style.paddingBottom = 'env(safe-area-inset-bottom)'
  document.body.appendChild(probe)
  const value = Number.parseFloat(getComputedStyle(probe).paddingBottom || '0')
  probe.remove()

  safeAreaBottomPx = Number.isFinite(value) ? value : 0
  return safeAreaBottomPx
}

function getRenderedCardRect(element: HTMLElement) {
  const wrapperRect = element.getBoundingClientRect()
  const child = element.firstElementChild instanceof HTMLElement ? element.firstElementChild : null
  if (!child) return wrapperRect

  const childRect = child.getBoundingClientRect()
  return {
    top: Math.min(wrapperRect.top, childRect.top),
    bottom: Math.max(wrapperRect.bottom, childRect.bottom),
  }
}

export function syncCanvasCardTop(element: HTMLElement, preferredTop: string) {
  element.style.top = preferredTop

  const limit = (window.visualViewport?.height ?? window.innerHeight) - getSafeAreaBottomPx()
  const rect = getRenderedCardRect(element)
  const overflow = rect.bottom - limit

  if (rect.top < limit && overflow > 0) {
    element.style.top = `calc(${preferredTop} - ${Math.ceil(overflow)}px)`
  }
}
