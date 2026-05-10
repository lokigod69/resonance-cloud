import type { ComponentType } from 'react'

export type GameEntry = {
  id: string
  titleKey: string
  subtitleKey: string
  iconSrc: string
  route: string
  enabled: boolean
  component: () => Promise<{ default: ComponentType }>
}

const gameModules = import.meta.glob<{ default: ComponentType }>('../slicer/SlicerGame.tsx')

function loadGameComponent(path: string): () => Promise<{ default: ComponentType }> {
  return () => {
    const loader = gameModules[path]
    if (!loader) {
      return Promise.reject(new Error(`Game component is not available: ${path}`))
    }
    return loader()
  }
}

export const GAMES: GameEntry[] = [
  {
    id: 'slicer',
    titleKey: 'games.slicer.title',
    subtitleKey: 'games.slicer.subtitle',
    iconSrc: '/src/assets/study-mode-icons/slicer.webp',
    route: '/games/slicer',
    enabled: true,
    component: loadGameComponent('../slicer/SlicerGame.tsx'),
  },
]

