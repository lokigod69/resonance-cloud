import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

type HomeSheetFocusOptions = {
  open: boolean
  dialogRef: RefObject<HTMLElement | null>
  onClose: () => void
  /** A nested modal owns Escape and Tab while suspended. */
  suspended?: boolean
  initialFocusSelector?: string
  /** Refocuses replacement sheet content without recapturing the opener. */
  focusKey?: string | null
}

function isUsable(element: HTMLElement | null): element is HTMLElement {
  if (!element?.isConnected || element.closest('[inert]')) return false
  if ('disabled' in element && Boolean((element as HTMLButtonElement).disabled)) return false
  if (element.hidden || element.getClientRects().length === 0) return false
  return window.getComputedStyle(element).visibility !== 'hidden'
}

function focusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isUsable)
}

/** Shared modal focus behavior for the two body-portalled Home sheets. */
export function useHomeSheetFocus({
  open,
  dialogRef,
  onClose,
  suspended = false,
  initialFocusSelector,
  focusKey,
}: HomeSheetFocusOptions) {
  useEffect(() => {
    if (!open) return
    const appRoot = document.getElementById('root')
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const rootWasInert = appRoot?.inert ?? false
    if (appRoot) appRoot.inert = true

    return () => {
      if (appRoot) appRoot.inert = rootWasInert
      window.setTimeout(() => {
        if (isUsable(opener)) {
          opener.focus({ preventScroll: true })
          return
        }
        const fallback = Array.from(document.querySelectorAll<HTMLElement>('#root .lw-swell-cta')).find(isUsable)
        fallback?.focus({ preventScroll: true })
      }, 0)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const focusTimer = window.setTimeout(() => {
      const dialog = dialogRef.current
      if (!dialog) return
      const preferred = initialFocusSelector
        ? dialog.querySelector<HTMLElement>(initialFocusSelector)
        : null
      ;(isUsable(preferred) ? preferred : dialog).focus({ preventScroll: true })
    }, 0)
    return () => window.clearTimeout(focusTimer)
  }, [dialogRef, focusKey, initialFocusSelector, open])

  useEffect(() => {
    if (!open || suspended) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = focusableElements(dialog)
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus({ preventScroll: true })
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      const activeInside = active instanceof HTMLElement && focusable.includes(active)
      if (event.shiftKey && (!activeInside || active === first)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (!activeInside || active === last)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dialogRef, onClose, open, suspended])
}
