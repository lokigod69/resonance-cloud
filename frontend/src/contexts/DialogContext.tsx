import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface DialogContextValue {
  profileOpen: boolean
  setProfileOpen: (open: boolean) => void
  redeemOpen: boolean
  setRedeemOpen: (open: boolean) => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [profileOpen, setProfileOpenState] = useState(false)
  const [redeemOpen, setRedeemOpenState] = useState(false)

  const setProfileOpen = useCallback((open: boolean) => {
    setProfileOpenState(open)
  }, [])

  const setRedeemOpen = useCallback((open: boolean) => {
    setRedeemOpenState(open)
  }, [])

  const value = useMemo<DialogContextValue>(
    () => ({ profileOpen, setProfileOpen, redeemOpen, setRedeemOpen }),
    [profileOpen, setProfileOpen, redeemOpen, setRedeemOpen],
  )

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

export function useDialogs(): DialogContextValue {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialogs must be used within DialogProvider')
  return ctx
}
