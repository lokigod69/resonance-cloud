export type AvatarLoading = 'eager' | 'lazy'

export function getAvatarColors(name: string, gender: string) {
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  const sat = gender === 'female' ? '65%' : '55%'
  return {
    backgroundColor: `hsl(${hue}, ${sat}, 40%)`,
    ringColor: `hsl(${hue}, ${sat}, 54%)`,
  }
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
