import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

type SpeakModalFocusOptions = {
  open: boolean
  dialogRef: RefObject<HTMLElement | null>
  onClose: () => void
  suspended?: boolean
  initialFocusSelector?: string
}

type RootLock = { holders: number; originalInert: boolean }
const rootLocks = new WeakMap<HTMLElement, RootLock>()

function acquireRootLock(root: HTMLElement) {
  const lock = rootLocks.get(root)
  if (lock) {
    lock.holders += 1
  } else {
    rootLocks.set(root, { holders: 1, originalInert: root.inert })
  }
  root.inert = true
}

function releaseRootLock(root: HTMLElement) {
  const lock = rootLocks.get(root)
  if (!lock) return
  lock.holders -= 1
  if (lock.holders > 0) return
  root.inert = lock.originalInert
  rootLocks.delete(root)
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

/** Focus containment and restoration for Speak overlays portalled outside #root. */
export function useSpeakModalFocus({
  open,
  dialogRef,
  onClose,
  suspended = false,
  initialFocusSelector,
}: SpeakModalFocusOptions) {
  useEffect(() => {
    if (!open) return
    const appRoot = document.getElementById('root')
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (appRoot) acquireRootLock(appRoot)

    return () => {
      if (appRoot) releaseRootLock(appRoot)
      window.setTimeout(() => {
        if (isUsable(opener)) opener.focus({ preventScroll: true })
      }, 0)
    }
  }, [open])

  useEffect(() => {
    if (!open || suspended) return
    const focusTimer = window.setTimeout(() => {
      const dialog = dialogRef.current
      if (!dialog) return
      const preferred = initialFocusSelector
        ? dialog.querySelector<HTMLElement>(initialFocusSelector)
        : null
      ;(isUsable(preferred) ? preferred : dialog).focus({ preventScroll: true })
    }, 0)
    return () => window.clearTimeout(focusTimer)
  }, [dialogRef, initialFocusSelector, open, suspended])

  useEffect(() => {
    if (!open || suspended) return
    const onKeyDown = (event: KeyboardEvent) => {
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

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dialogRef, onClose, open, suspended])
}
