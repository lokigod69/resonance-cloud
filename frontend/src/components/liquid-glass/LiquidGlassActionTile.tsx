import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SrsQueue } from '@/components/dashboard/SrsActionTile'
import {
  LiquidGlassRenderer,
  type LiquidGlassSettings,
  resolveLiquidGlassSettings,
} from './LiquidGlassRenderer'

type LiquidGlassActionTileProps = {
  label: string
  count: number
  queue: SrsQueue
  language: string
  accent?: 'cool' | 'warm' | 'gold' | 'neutral'
  disabled?: boolean
}

const ACCENT_CLASS: Record<NonNullable<LiquidGlassActionTileProps['accent']>, string> = {
  cool: 'stat-tile-accent-cool',
  warm: 'stat-tile-accent-warm',
  gold: 'stat-tile-accent-gold',
  neutral: 'stat-tile-accent-neutral',
}

const LIQUID_GLASS_FALLBACK_IMAGE = '/brand/cosmos/cosmos-auth.webp'
const TILE_PAD_X = 18
const TILE_PAD_Y = 14

export function LiquidGlassActionTile({
  label,
  count,
  queue,
  language,
  accent = 'neutral',
  disabled = false,
}: LiquidGlassActionTileProps) {
  const navigate = useNavigate()
  const rootRef = useRef<HTMLButtonElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<LiquidGlassRenderer | null>(null)
  const isDisabled = disabled || count === 0 || !language

  const mergedSettings = useMemo(
    () =>
      resolveLiquidGlassSettings('frosted', {
        blur: 0.36,
        refraction: 0.4,
        chromaticAberration: 0.028,
        distortion: 0.014,
        edgeHighlight: 0.12,
        specular: 0.16,
        fresnel: 0.98,
        depth: 38,
        darkTint: 0.16,
        tintStrength: 0.12,
        opacity: 0.98,
        shadow: 0.2,
        bevel: 0,
      } satisfies Partial<LiquidGlassSettings>),
    [],
  )

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return

    let renderer: LiquidGlassRenderer
    const backgroundImage = LIQUID_GLASS_FALLBACK_IMAGE
    try {
      renderer = new LiquidGlassRenderer(canvas, backgroundImage, mergedSettings)
      renderer.setBackgroundSampling(true)
      renderer.setTrack(-1000, -900, -1000, -950)
      rendererRef.current = renderer
      root.classList.remove('is-fallback')
    } catch {
      root.classList.add('is-fallback')
      return
    }

    const resize = (width: number, height: number) => {
      if (!width || !height) return
      renderer.resize(width + TILE_PAD_X * 2, height + TILE_PAD_Y * 2)
      renderer.setSettings({
        ...mergedSettings,
        lensWidth: Math.max(1, width - 4),
        lensHeight: Math.max(1, height - 4),
        radius: Math.min(mergedSettings.radius, height / 2),
      })
      renderer.setGeometry(width / 2 + TILE_PAD_X, height / 2 + TILE_PAD_Y, 0, false, 1, 1, 0)
    }

    const syncSize = () => {
      const rect = root.getBoundingClientRect()
      resize(rect.width, rect.height)
    }

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver === 'undefined') {
      syncSize()
      window.addEventListener('resize', syncSize)
    } else {
      observer = new ResizeObserver(([entry]) => {
        resize(entry.contentRect.width, entry.contentRect.height)
      })
      observer.observe(root)
      syncSize()
    }

    let sourceFrame = 0
    const syncWaveCanvas = () => {
      const canvasSource = document.querySelector('.dashboard-wave-bg canvas') as HTMLCanvasElement | null
      renderer.setCanvasSource(canvasSource)
      if (!canvasSource) sourceFrame = window.requestAnimationFrame(syncWaveCanvas)
    }
    syncWaveCanvas()

    return () => {
      if (sourceFrame) window.cancelAnimationFrame(sourceFrame)
      window.removeEventListener('resize', syncSize)
      observer?.disconnect()
      renderer.dispose()
      rendererRef.current = null
    }
  }, [mergedSettings])

  const handleClick = () => {
    if (isDisabled) return

    const params = new URLSearchParams({
      queue,
      lang: language,
    })
    navigate(`/study?${params.toString()}`)
  }

  return (
    <button
      ref={rootRef}
      type="button"
      aria-disabled={isDisabled}
      className={[
        'stat-tile stat-tile--liquid',
        ACCENT_CLASS[accent],
        'dashboard-action-tile min-h-[74px] rounded-xl px-4 py-3 gap-3',
        'flex w-full items-center justify-between text-left',
        isDisabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
      ].join(' ')}
      disabled={isDisabled}
      onClick={handleClick}
    >
      <span className="liquid-glass-tile-surface" aria-hidden="true">
        <canvas ref={canvasRef} className="liquid-glass-tile-surface__glass" />
      </span>
      <span className="stat-label-accent text-sm font-semibold uppercase tracking-[0.12em]">{label}</span>
      <span className="stat-tile-divider" aria-hidden="true" />
      <span className="stat-count text-2xl font-semibold leading-none">{count}</span>
    </button>
  )
}
