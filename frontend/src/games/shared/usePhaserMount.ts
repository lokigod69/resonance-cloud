import { useEffect, useRef, useState, type RefObject } from 'react'
import type Phaser from 'phaser'

type PhaserModule = typeof Phaser

type PhaserMountBase = {
  parentRef: RefObject<HTMLElement | null>
  enabled: boolean
}

type PhaserMountWithBuildConfig = PhaserMountBase & {
  buildConfig: (Phaser: PhaserModule) => Phaser.Types.Core.GameConfig | null
  mount?: never
}

type PhaserMountWithExternal = PhaserMountBase & {
  mount: (parent: HTMLElement) => { destroy: () => void } | null
  buildConfig?: never
}

export type PhaserMountOptions = PhaserMountWithBuildConfig | PhaserMountWithExternal

export function usePhaserMount(options: PhaserMountOptions) {
  const { parentRef, enabled } = options
  const buildConfig = options.buildConfig ?? null
  const externalMount = options.mount ?? null
  const gameRef = useRef<Phaser.Game | null>(null)
  const externalHandleRef = useRef<{ destroy: () => void } | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    function destroyCurrentMount() {
      if (externalHandleRef.current) {
        externalHandleRef.current.destroy()
        externalHandleRef.current = null
      }

      if (gameRef.current) {
        gameRef.current.destroy(true, false)
        gameRef.current = null
      }
    }

    async function mount() {
      if (!enabled || !parentRef.current) {
        setReady(false)
        return
      }

      const parent = parentRef.current

      if (externalMount) {
        destroyCurrentMount()
        const handle = externalMount(parent)
        if (cancelled) {
          handle?.destroy()
          return
        }
        externalHandleRef.current = handle
        setReady(Boolean(handle))
        return
      }

      const { default: PhaserRuntime } = await import('phaser')
      if (cancelled || !parentRef.current) return

      destroyCurrentMount()

      const config = buildConfig?.(PhaserRuntime) ?? null
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
      destroyCurrentMount()
    }
  }, [buildConfig, enabled, externalMount, parentRef])

  return { gameRef, ready }
}
