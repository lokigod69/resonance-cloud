/* eslint-disable */
// Toasts are recorded, not rendered — the harness mounts no ToastProvider.

import { record } from './scenario'

export function useToast() {
  return {
    toast: (message: string, kind?: string, action?: unknown) => record('toast', { message, kind, action: Boolean(action) }),
  }
}
