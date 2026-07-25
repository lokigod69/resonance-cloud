import { createContext } from 'react'
import { record } from './scenario'

export interface DialogContextValue {
  profileOpen: boolean
  setProfileOpen: (open: boolean) => void
  redeemOpen: boolean
  setRedeemOpen: (open: boolean) => void
}

export const DialogContext = createContext<DialogContextValue | null>(null)

const value: DialogContextValue = {
  profileOpen: false,
  setProfileOpen: (open) => record('dialog:profile', open),
  redeemOpen: false,
  setRedeemOpen: (open) => record('dialog:redeem', open),
}

export function useDialogs(): DialogContextValue {
  return value
}
