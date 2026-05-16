import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SkinContext, type SkinId } from './SkinContext'

const STORAGE_KEY = 'resonance-skin'
const VALID_SKINS: SkinId[] = ['classic', 'glassy']

// Map old stored/DB values to new skin IDs
const LEGACY_MAP: Record<string, SkinId> = {
  'default': 'classic',
  'polish-glass': 'glassy',
  'glass-orb': 'classic',   // Orbs users → Classic (has Orbs-style dashboard now)
  'orbs': 'classic',         // Direct orbs value → Classic
}

function migrateSkinId(raw: string | null): SkinId {
  if (!raw) return 'classic'
  if (VALID_SKINS.includes(raw as SkinId)) return raw as SkinId
  if (raw in LEGACY_MAP) return LEGACY_MAP[raw]
  return 'classic'
}

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

  // Apply skin attributes/classes on <html>
  useEffect(() => {
    const html = document.documentElement
    html.dataset.skin = skin
    html.classList.remove('skin-classic', 'skin-glassy')
    html.classList.add(`skin-${skin}`)
  }, [skin])

  const setSkin = useCallback((newSkin: SkinId) => {
    if (newSkin === skin) return
    setSkinState(newSkin)
    localStorage.setItem(STORAGE_KEY, newSkin)
  }, [skin])

  const value = useMemo(
    () => ({ skin, setSkin }),
    [skin, setSkin]
  )

  return (
    <SkinContext.Provider value={value}>
      {children}
    </SkinContext.Provider>
  )
}
