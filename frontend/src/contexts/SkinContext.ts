import { createContext, useContext } from 'react'

export type SkinId = 'classic' | 'glassy'

export interface SkinContextValue {
  skin: SkinId
  setSkin: (skin: SkinId) => void
}

export const SkinContext = createContext<SkinContextValue>({
  skin: 'classic',
  setSkin: () => {},
})

export const useSkin = () => useContext(SkinContext)
