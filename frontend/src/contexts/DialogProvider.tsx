import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { DialogContext, type DialogContextValue } from './DialogContext'

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
