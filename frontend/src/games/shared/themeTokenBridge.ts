export type GameThemeTokens = {
  background: string
  foreground: string
  surface: string
  accent: string
  accentWarm: string
  border: string
}

const TOKEN_DEFAULTS: GameThemeTokens = {
  background: '#050505',
  foreground: '#f8f4ea',
  surface: 'rgba(255, 255, 255, 0.08)',
  accent: '#f59e0b',
  accentWarm: '#fb923c',
  border: 'rgba(255, 255, 255, 0.18)',
}

function readToken(style: CSSStyleDeclaration, name: string, fallback: string): string {
  return style.getPropertyValue(name).trim() || fallback
}

export function readGameThemeTokens(root: Element = document.documentElement): GameThemeTokens {
  const style = getComputedStyle(root)
  return {
    background: readToken(style, '--background', TOKEN_DEFAULTS.background),
    foreground: readToken(style, '--foreground', TOKEN_DEFAULTS.foreground),
    surface: readToken(style, '--surface-1', TOKEN_DEFAULTS.surface),
    accent: readToken(style, '--accent', TOKEN_DEFAULTS.accent),
    accentWarm: readToken(style, '--accent-warm', TOKEN_DEFAULTS.accentWarm),
    border: readToken(style, '--border-subtle', TOKEN_DEFAULTS.border),
  }
}

