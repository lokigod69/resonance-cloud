import { createContext, useContext } from 'react'

export type Theme = 'midnight' | 'rainy-day' | 'red-wine' | 'slate' | 'warm-linen'

export const DEFAULT_THEME: Theme = 'rainy-day'

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)
