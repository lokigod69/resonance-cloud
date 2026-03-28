import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type SkinId = 'classic' | 'glassy' | 'orbs'

interface SkinContextValue {
  skin: SkinId
  setSkin: (skin: SkinId) => void
}

const STORAGE_KEY = 'resonance-skin'
const VALID_SKINS: SkinId[] = ['classic', 'glassy', 'orbs']

// Map old stored/DB values to new skin IDs
const LEGACY_MAP: Record<string, SkinId> = {
  'default': 'classic',
  'polish-glass': 'glassy',
  'glass-orb': 'orbs',
}

function migrateSkinId(raw: string | null): SkinId {
  if (!raw) return 'classic'
  if (VALID_SKINS.includes(raw as SkinId)) return raw as SkinId
  if (raw in LEGACY_MAP) return LEGACY_MAP[raw]
  return 'classic'
}

const SkinContext = createContext<SkinContextValue>({
  skin: 'classic',
  setSkin: () => {},
})

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skin, setSkinState] = useState<SkinId>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    const resolved = migrateSkinId(raw)
    // Write back if migrated from legacy value
    if (raw && raw !== resolved) {
      localStorage.setItem(STORAGE_KEY, resolved)
    }
    return resolved
  })

  // Apply/remove skin class on <html>
  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('skin-glassy', 'skin-orbs')
    if (skin === 'glassy') html.classList.add('skin-glassy')
    if (skin === 'orbs') html.classList.add('skin-orbs')
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
