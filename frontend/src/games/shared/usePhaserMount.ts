import { useEffect, useRef, useState, type RefObject } from 'react'
import type Phaser from 'phaser'

type PhaserModule = typeof Phaser

type PhaserMountOptions = {
  parentRef: RefObject<HTMLElement | null>
  enabled: boolean
  buildConfig: (Phaser: PhaserModule) => Phaser.Types.Core.GameConfig | null
}

export function usePhaserMount({ parentRef, enabled, buildConfig }: PhaserMountOptions) {
  const gameRef = useRef<Phaser.Game | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function mount() {
      if (!enabled || !parentRef.current) {
        setReady(false)
        return
      }

      const { default: PhaserRuntime } = await import('phaser')
      if (cancelled || !parentRef.current) return

      gameRef.current?.destroy(true, false)
      gameRef.current = null

      const config = buildConfig(PhaserRuntime)
      if (!config) {
        setReady(false)
        return
      }

      gameRef.current = new PhaserRuntime.Game({
        ...config,
        parent: parentRef.current,
      })
      setReady(true)
    }

    void mount()

    return () => {
      cancelled = true
      setReady(false)
      if (gameRef.current) {
        gameRef.current.destroy(true, false)
        gameRef.current = null
      }
    }
  }, [buildConfig, enabled, parentRef])

  return { gameRef, ready }
}
