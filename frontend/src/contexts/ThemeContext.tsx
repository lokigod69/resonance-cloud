import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export type Theme = 'midnight' | 'rainy-day' | 'red-wine' | 'slate' | 'warm-linen'

export const DEFAULT_THEME: Theme = 'rainy-day'

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

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
})

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

export const useTheme = () => useContext(ThemeContext)
