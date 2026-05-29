import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function useCategoryScrollReset(): void {
  const location = useLocation()

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname, location.search])
}
