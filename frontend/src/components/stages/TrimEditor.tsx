import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Scissors, Loader, Play } from 'lucide-react'
import { trimAssembly } from '../../api'

interface TrimEditorProps {
  slug: string
  version: string
  videoSrc: string
  videoDuration: number
  onSaved: () => void
  onClose: () => void
}

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) return '0.0'
  return s.toFixed(1)
}

export function TrimEditor({ slug, version, videoSrc, videoDuration, onSaved, onClose }: TrimEditorProps) {
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(videoDuration)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null)

  const dur = videoDuration
  const outputDur = trimEnd - trimStart
  const trimmedAmt = dur - outputDur
  const noChanges = trimStart === 0 && Math.abs(trimEnd - dur) < 0.05
  const canSave = !noChanges && outputDur >= 1.0 && !saving

  // Drag logic using pointer capture
  const updateFromPointer = useCallback((clientX: number, handle: 'start' | 'end') => {
    const bar = barRef.current
    if (!bar || dur <= 0) return
    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const time = Math.round(ratio * dur * 10) / 10 // snap to 0.1s

    if (handle === 'start') {
      setTrimStart(Math.max(0, Math.min(time, trimEnd - 1.0)))
    } else {
      setTrimEnd(Math.min(dur, Math.max(time, trimStart + 1.0)))
    }
  }, [dur, trimStart, trimEnd])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, handle: 'start' | 'end') => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(handle)
    updateFromPointer(e.clientX, handle)
  }, [updateFromPointer])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent) => updateFromPointer(e.clientX, dragging)
    const onUp = () => setDragging(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [dragging, updateFromPointer])

  // Track whether a drag just ended to suppress the click event
  const justDragged = useRef(false)
  useEffect(() => {
    if (dragging === null && justDragged.current) {
      // Reset after a tick so the click event is suppressed
      const id = setTimeout(() => { justDragged.current = false }, 50)
      return () => clearTimeout(id)
    }
    if (dragging !== null) justDragged.current = true
  }, [dragging])

  // Click on bar to seek video
  const onBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (justDragged.current) return
    const bar = barRef.current
    const vid = videoRef.current
    if (!bar || !vid || dur <= 0) return
    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    vid.currentTime = ratio * dur
  }, [dur])

  // Preview: play from trimStart to trimEnd
  const handlePreview = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    vid.currentTime = trimStart
    vid.play()
    setPreviewing(true)
  }, [trimStart])

  useEffect(() => {
    if (!previewing) return
    const vid = videoRef.current
    if (!vid) return
    const onTime = () => {
      if (vid.currentTime >= trimEnd) {
        vid.pause()
        setPreviewing(false)
      }
    }
    vid.addEventListener('timeupdate', onTime)
    return () => vid.removeEventListener('timeupdate', onTime)
  }, [previewing, trimEnd])

  // Stop previewing if video ends or is paused externally
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    const onPause = () => setPreviewing(false)
    vid.addEventListener('ended', onPause)
    return () => vid.removeEventListener('ended', onPause)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await trimAssembly(slug, version, trimStart, trimEnd)
      onSaved()
    } catch (err: any) {
      setError(err.message ?? 'Trim failed')
    } finally {
      setSaving(false)
    }
  }

  const startPct = dur > 0 ? (trimStart / dur) * 100 : 0
  const endPct = dur > 0 ? (trimEnd / dur) * 100 : 100

  return (
    <div className="mt-3 border border-[var(--border)] rounded-lg bg-[var(--bg-card)] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-primary)]">
          <Scissors size={14} />
          Trim
        </div>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
          <X size={16} />
        </button>
      </div>

      {/* Video preview */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full rounded border border-[var(--border)]"
        preload="metadata"
      />

      {/* Timeline bar */}
      <div
        ref={barRef}
        className="relative h-8 flex items-center cursor-pointer touch-none select-none"
        onClick={onBarClick}
      >
        {/* Track */}
        <div className="w-full h-2 bg-[var(--bg-hover)] rounded-full relative overflow-hidden">
          {/* Dimmed start region */}
          <div
            className="absolute inset-y-0 left-0 bg-black/40 rounded-l-full"
            style={{ width: `${startPct}%` }}
          />
          {/* Active (kept) region */}
          <div
            className="absolute inset-y-0 bg-emerald-500/70"
            style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
          />
          {/* Dimmed end region */}
          <div
            className="absolute inset-y-0 right-0 bg-black/40 rounded-r-full"
            style={{ width: `${100 - endPct}%` }}
          />
        </div>

        {/* Start handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-emerald-500 cursor-grab active:cursor-grabbing z-10"
          style={{ left: `calc(${startPct}% - 8px)` }}
          onPointerDown={e => onPointerDown(e, 'start')}
        />

        {/* End handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-emerald-500 cursor-grab active:cursor-grabbing z-10"
          style={{ left: `calc(${endPct}% - 8px)` }}
          onPointerDown={e => onPointerDown(e, 'end')}
        />

        {/* Time labels */}
        <span className="absolute -bottom-4 left-0 text-[10px] text-[var(--text-muted)] font-mono">0:00</span>
        <span className="absolute -bottom-4 right-0 text-[10px] text-[var(--text-muted)] font-mono">{fmt(dur)}s</span>
      </div>

      {/* Spacer for time labels */}
      <div className="h-2" />

      {/* Numeric inputs */}
      <div className="flex items-center gap-4 text-xs">
        <label className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          Start:
          <input
            type="number"
            step={0.1}
            min={0}
            max={Math.max(0, trimEnd - 1.0)}
            value={trimStart}
            onChange={e => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v)) setTrimStart(Math.max(0, Math.min(v, trimEnd - 1.0)))
            }}
            className="w-20 bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)] focus:border-[var(--accent)] outline-none"
          />
          <span className="text-[var(--text-muted)]">s</span>
        </label>
        <label className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          End:
          <input
            type="number"
            step={0.1}
            min={trimStart + 1.0}
            max={dur}
            value={trimEnd}
            onChange={e => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v)) setTrimEnd(Math.min(dur, Math.max(v, trimStart + 1.0)))
            }}
            className="w-20 bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)] focus:border-[var(--accent)] outline-none"
          />
          <span className="text-[var(--text-muted)]">s</span>
        </label>
      </div>

      {/* Duration display */}
      <div className="text-xs text-[var(--text-secondary)]">
        {noChanges ? (
          <span className="text-[var(--text-muted)]">No changes</span>
        ) : (
          <>
            Output duration: <span className="text-[var(--text-primary)]">{fmt(outputDur)}s</span>
            <span className="text-[var(--text-muted)] ml-2">(trimmed {fmt(trimmedAmt)}s)</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handlePreview}
          disabled={previewing}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 cursor-pointer disabled:cursor-default transition-colors"
        >
          <Play size={12} />
          {previewing ? 'Playing...' : 'Preview'}
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-default transition-colors"
        >
          {saving ? <Loader size={12} className="animate-spin" /> : <Scissors size={12} />}
          {saving ? 'Saving...' : 'Save as New Version'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-[var(--error)] bg-[var(--error)]/10 rounded px-3 py-2">{error}</div>
      )}
    </div>
  )
}
