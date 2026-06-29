/*
 * MIT License
 *
 * Copyright (c) 2026 Liquid Glass OSS contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * Vendored from @ogtirth/liquid-glass-oss 0.1.0 and scoped to the dashboard
 * language popover surface.
 */

import { type ReactNode, useEffect, useMemo, useRef } from 'react'
import {
  LiquidGlassRenderer,
  type LiquidGlassSettings,
  type LiquidGlassVariant,
  resolveLiquidGlassSettings,
} from './LiquidGlassRenderer'

const POPOVER_PAD_X = 18
const POPOVER_PAD_Y = 14

type LiquidGlassPopoverOverlayProps = {
  backgroundImage: string
  canvasSource: HTMLCanvasElement | null
  open: boolean
  variant?: LiquidGlassVariant
  settings?: Partial<LiquidGlassSettings>
  children: ReactNode
  className?: string
  'aria-label'?: string
}

export function LiquidGlassPopoverOverlay({
  backgroundImage,
  canvasSource,
  open,
  variant = 'frosted',
  settings,
  children,
  className = '',
  'aria-label': ariaLabel = 'Liquid glass popover',
}: LiquidGlassPopoverOverlayProps) {
  const rootRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<LiquidGlassRenderer | null>(null)

  const mergedSettings = useMemo(
    () =>
      resolveLiquidGlassSettings(variant, {
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
        ...settings,
      }),
    [settings, variant],
  )

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return

    let renderer: LiquidGlassRenderer
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
      renderer.resize(width + POPOVER_PAD_X * 2, height + POPOVER_PAD_Y * 2)
      renderer.setSettings({
        ...mergedSettings,
        lensWidth: Math.max(1, width - 4),
        lensHeight: Math.max(1, height - 4),
        radius: Math.min(mergedSettings.radius, height / 2),
      })
      renderer.setGeometry(width / 2 + POPOVER_PAD_X, height / 2 + POPOVER_PAD_Y, 0, false, 1, 1, 0)
    }

    const syncSize = () => {
      const rect = root.getBoundingClientRect()
      resize(rect.width, rect.height)
    }

    if (typeof ResizeObserver === 'undefined') {
      syncSize()
      window.addEventListener('resize', syncSize)
    } else {
      const observer = new ResizeObserver(([entry]) => {
        resize(entry.contentRect.width, entry.contentRect.height)
      })
      observer.observe(root)
      syncSize()
      return () => {
        observer.disconnect()
        renderer.dispose()
        rendererRef.current = null
      }
    }

    return () => {
      window.removeEventListener('resize', syncSize)
      renderer.dispose()
      rendererRef.current = null
    }
  }, [backgroundImage, mergedSettings])

  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    renderer.setCanvasSource(canvasSource)
  }, [canvasSource])

  return (
    <section
      ref={rootRef}
      role="listbox"
      aria-label={ariaLabel}
      className={`liquid-glass-popover-overlay ${open ? 'is-open' : ''} ${className}`.trim()}
    >
      <canvas ref={canvasRef} className="liquid-glass-popover-overlay__glass" aria-hidden="true" />
      <div className="liquid-glass-popover-overlay__content">{children}</div>
    </section>
  )
}
