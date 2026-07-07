import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
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
  // No stored choice = new device/user → glassy (the beta ships in the glassy skin);
  // unrecognized legacy values stay on classic, matching the LEGACY_MAP mappings.
  if (!raw) return 'glassy'
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

  // Restore the profile-saved skin when this device has no local choice
  // (e.g. after the user clears site data) — the profile modal writes to
  // profiles.skin but nothing read it back before this.
  useEffect(() => {
    let cancelled = false
    const restoreFromProfile = async () => {
      if (localStorage.getItem(STORAGE_KEY)) return
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return
        const { data } = await supabase
          .from('profiles')
          .select('skin')
          .eq('id', user.id)
          .single()
        const saved = (data?.skin as string | undefined) ?? null
        if (cancelled || !saved) return
        const resolved = migrateSkinId(saved)
        localStorage.setItem(STORAGE_KEY, resolved)
        setSkinState(resolved)
      } catch {
        // Best-effort — the default skin stands if the profile can't be read
      }
    }
    void restoreFromProfile()
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') void restoreFromProfile()
    })
    return () => {
      cancelled = true
      authSub.subscription.unsubscribe()
    }
  }, [])

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
