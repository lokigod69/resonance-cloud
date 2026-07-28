import { createContext, useContext } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastContextValue {
  toast: (
    message: string,
    type?: ToastType,
    action?: { label: string; onClick: () => void },
  ) => void
}

export const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
})

export const useToast = () => useContext(ToastContext)
