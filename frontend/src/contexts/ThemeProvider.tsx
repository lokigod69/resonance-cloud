import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { ThemeContext, DEFAULT_THEME, type Theme } from './ThemeContext'

const VALID_THEMES: Theme[] = ['rainy-day', 'midnight', 'red-wine', 'slate', 'warm-linen']
const LEGACY_THEME_CLASSES = ['theme-deep-blue']
const STORAGE_KEY = 'resonance-theme'

// Migrate old theme names to new ones
const MIGRATION_MAP: Record<string, Theme> = {
  standard: DEFAULT_THEME,
  retro: DEFAULT_THEME,
  soft: DEFAULT_THEME,
  'deep-blue': 'midnight',
}

const LIGHT_THEMES: Theme[] = ['warm-linen']

function applyThemeClass(theme: Theme) {
  const html = document.documentElement
  // Remove all theme classes
  VALID_THEMES.forEach((t) => html.classList.remove(`theme-${t}`))
  LEGACY_THEME_CLASSES.forEach((t) => html.classList.remove(t))
  // Add current theme class
  html.classList.add(`theme-${theme}`)
  // Light themes should NOT get dark class
  if (LIGHT_THEMES.includes(theme)) {
    html.classList.remove('dark')
  } else {
    html.classList.add('dark')
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    // Migrate old theme names
    const migrated = MIGRATION_MAP[saved as string] ?? saved
    if (migrated && VALID_THEMES.includes(migrated as Theme)) {
      // Persist migration if value changed
      if (migrated !== saved) localStorage.setItem(STORAGE_KEY, migrated)
      return migrated as Theme
    }
    return DEFAULT_THEME
  })

  // Apply theme class on mount and whenever theme changes
  useEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  // Restore the profile-saved theme when this device has no local choice
  // (e.g. after the user clears site data) — setTheme writes to profiles.theme
  // but nothing read it back before this.
  useEffect(() => {
    let cancelled = false
    const restoreFromProfile = async () => {
      if (localStorage.getItem(STORAGE_KEY)) return
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return
        const { data } = await supabase
          .from('profiles')
          .select('theme')
          .eq('id', user.id)
          .single()
        const saved = data?.theme as string | undefined
        const migrated = MIGRATION_MAP[saved as string] ?? saved
        if (!cancelled && migrated && VALID_THEMES.includes(migrated as Theme)) {
          localStorage.setItem(STORAGE_KEY, migrated)
          setThemeState(migrated as Theme)
        }
      } catch {
        // Best-effort — the default theme stands if the profile can't be read
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

  const setTheme = useCallback(async (newTheme: Theme) => {
    if (!VALID_THEMES.includes(newTheme)) return

    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
    applyThemeClass(newTheme)

    // Persist to Supabase if user is logged in
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ theme: newTheme })
          .eq('id', user.id)
      }
    } catch {
      // Silently fail — localStorage is the primary store
    }
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme }),
    [theme, setTheme]
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
