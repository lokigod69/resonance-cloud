import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type SkinId = 'default' | 'polish-glass'

interface SkinContextValue {
  skin: SkinId
  setSkin: (skin: SkinId) => void
}

const STORAGE_KEY = 'resonance-skin'
const VALID_SKINS: SkinId[] = ['default', 'polish-glass']

const SkinContext = createContext<SkinContextValue>({
  skin: 'default',
  setSkin: () => {},
})

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skin, setSkinState] = useState<SkinId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as SkinId | null
    return stored && VALID_SKINS.includes(stored) ? stored : 'default'
  })

  // Apply/remove skin class on <html>
  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('skin-polish-glass')
    if (skin === 'polish-glass') {
      html.classList.add('skin-polish-glass')
    }
  }, [skin])

  const setSkin = (newSkin: SkinId) => {
    setSkinState(newSkin)
    localStorage.setItem(STORAGE_KEY, newSkin)
  }

  return (
    <SkinContext.Provider value={{ skin, setSkin }}>
      {children}
    </SkinContext.Provider>
  )
}

export const useSkin = () => useContext(SkinContext)
