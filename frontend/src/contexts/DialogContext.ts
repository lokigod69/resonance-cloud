import { createContext, useContext } from 'react'

export interface DialogContextValue {
  profileOpen: boolean
  setProfileOpen: (open: boolean) => void
  redeemOpen: boolean
  setRedeemOpen: (open: boolean) => void
}

export const DialogContext = createContext<DialogContextValue | null>(null)

export function useDialogs(): DialogContextValue {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialogs must be used within DialogProvider')
  return ctx
}
