import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export type Theme = 'standard' | 'retro' | 'soft'

const VALID_THEMES: Theme[] = ['standard', 'retro', 'soft']
const STORAGE_KEY = 'resonance-theme'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'standard',
  setTheme: () => {},
})

function applyThemeClass(theme: Theme) {
  const html = document.documentElement
  // Remove all theme classes
  VALID_THEMES.forEach((t) => html.classList.remove(`theme-${t}`))
  // Add current theme class
  html.classList.add(`theme-${theme}`)
  // Manage dark class — soft theme is light mode, others are dark
  if (theme === 'soft') {
    html.classList.remove('dark')
  } else {
    html.classList.add('dark')
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Read from localStorage immediately to avoid flash
    const saved = localStorage.getItem(STORAGE_KEY) as Theme
    if (saved && VALID_THEMES.includes(saved)) {
      return saved
    }
    return 'standard'
  })

  // Apply theme class on mount and whenever theme changes
  useEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  const setTheme = async (newTheme: Theme) => {
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
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
      {theme === 'retro' && <div className="crt-overlay" />}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
