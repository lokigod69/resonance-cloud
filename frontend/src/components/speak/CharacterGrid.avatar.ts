export type AvatarLoading = 'eager' | 'lazy'

const STYLE_TUTOR_RING_COLORS: Record<string, string> = {
  Cleo: 'hsl(27, 65%, 54%)',
  Jaxon: '#9a5a38',
  Nova: '#111827',
  Orion: '#e8e2d4',
  Arthur: '#8b5a36',
  Dante: '#7f1d1d',
  Elias: '#2563eb',
  Kael: 'hsl(21, 55%, 54%)',
  Briggs: '#556b2f',
  Zoe: 'hsl(302, 65%, 54%)',
}

export function getAvatarColors(name: string, gender: string) {
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  const sat = gender === 'female' ? '65%' : '55%'
  return {
    backgroundColor: `hsl(${hue}, ${sat}, 40%)`,
    ringColor: getStyleTutorRingColor(name) ?? `hsl(${hue}, ${sat}, 54%)`,
  }
}

export function getStyleTutorRingColor(tutorName: string) {
  return STYLE_TUTOR_RING_COLORS[tutorName]
}

export function getStyleTutorAvatarUrl(tutorName: string) {
  return `/characters/${tutorName.toLowerCase()}.webp`
}

export function getStyleTutorAvatarLoading(index: number): AvatarLoading {
  return index < 5 ? 'eager' : 'lazy'
}

export function getStyleTutorFallbackInitial(tutorName: string) {
  return tutorName.charAt(0).toUpperCase()
}
