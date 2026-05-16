import { useState } from 'react'
import { Check } from 'lucide-react'
import { deleteVersion, mediaUrl, getGenerationMeta } from '../../api'
import type { GenerationMeta } from '../../api'
import { AudioPlayer } from '../AudioPlayer'
import { CollapsibleRun } from '../CollapsibleRun'
import type { StageProps } from './shared'
import { EmptyStage } from './shared'

export function SongPanel({ slug, detail, onSelect, onRefresh }: StageProps) {
  const versions = detail.stages.song.versions
  const selected = detail.stages.song.selected
  const selectedVersion = selected?.split('/')[0]
  const [deletingVer, setDeletingVer] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(selectedVersion ? [selectedVersion] : versions.length ? [versions[versions.length - 1].version] : [])
  )
  const [meta, setMeta] = useState<Record<string, GenerationMeta | null>>({})

  const toggle = (v: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v); else next.add(v)
      return next
    })
    if (!(v in meta)) {
      getGenerationMeta(slug, 'song', v).then(res => setMeta(prev => ({ ...prev, [v]: res.meta }))).catch(() => setMeta(prev => ({ ...prev, [v]: null })))
    }
  }

  // Load meta for initially expanded versions
  useState(() => {
    expanded.forEach(v => {
      if (!(v in meta)) {
        getGenerationMeta(slug, 'song', v).then(res => setMeta(prev => ({ ...prev, [v]: res.meta }))).catch(() => {})
      }
    })
  })

  if (versions.length === 0) {
    return <EmptyStage message="No songs generated yet. Click Generate to create takes." />
  }

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {versions.map((v, i) => (
        <CollapsibleRun
          key={v.version}
          version={v.version}
          isSelected={!!selected?.startsWith(v.version)}
          isExpanded={expanded.has(v.version)}
          onToggle={() => toggle(v.version)}
          onDelete={async () => { setDeletingVer(v.version); try { await deleteVersion(slug, 'song', v.version); await onRefresh() } catch { /* noop: delete failure leaves the row visible */ } setDeletingVer(null) }}
          deleting={deletingVer === v.version}
          stage="song"
          index={i}
          total={versions.length}
        >
          {meta[v.version] && <SongInfoBar meta={meta[v.version]!} />}

          <div className="space-y-2">
            {v.takes.map(take => {
              const takeSelection = `${v.version}/${take}`
              const isTakeSelected = selected === takeSelection
              return (
                <div
                  key={take}
                  className={`flex items-center gap-3 p-2 rounded border ${
                    isTakeSelected ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] bg-[var(--bg-base)]'
                  }`}
                >
                  <button
                    onClick={() => onSelect(takeSelection)}
                    className={`w-4 h-4 rounded-full border flex-shrink-0 cursor-pointer ${
                      isTakeSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border-bright)]'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[var(--text-secondary)] truncate mb-1">{take}</div>
                    <AudioPlayer src={mediaUrl(slug, `songs/${v.version}/${take}`)} />
                  </div>
                  {isTakeSelected && (
                    <Check size={14} className="text-[var(--accent)] flex-shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </CollapsibleRun>
      ))}
    </div>
  )
}

/* ── Song Info Bar ──────────────────────────────────────────────────── */

function loraShortName(path: string): string {
  // Extract filename without extension from full path
  const parts = path.replace(/\\/g, '/').split('/')
  const file = parts[parts.length - 1]
  return file.replace(/\.(safetensors|pt|bin|ckpt)$/, '')
}

function SongInfoBar({ meta }: { meta: GenerationMeta }) {
  const settings = meta.inputs?.settings_used ?? {}
  const lora = meta.lora
  const outputs = meta.outputs
  const caption = meta.inputs?.caption

  const parts: Array<{ label: string; value: string }> = []

  // Duration
  const duration = settings.duration ?? outputs?.requested_duration
  if (duration != null) parts.push({ label: 'Dur', value: `${duration}s` })

  // LoRA
  if (lora?.active) {
    const name = loraShortName(lora.path ?? '')
    parts.push({ label: 'LoRA', value: `${name} @${lora.strength}` })
  } else {
    parts.push({ label: 'LoRA', value: 'none' })
  }

  // Caption (first 35 chars)
  if (caption) {
    const short = caption.length > 35 ? caption.slice(0, 35) + '\u2026' : caption
    parts.push({ label: 'Caption', value: short })
  }

  // Takes count
  if (outputs?.takes?.length) {
    parts.push({ label: 'Takes', value: String(outputs.takes.length) })
  }

  // Seed
  const seed = settings.seed
  if (seed != null) {
    parts.push({ label: 'Seed', value: seed === -1 ? 'random' : String(seed) })
  }

  // Model
  const model = meta.acestep?.model
  if (model) parts.push({ label: 'Model', value: model })

  // Generation time
  const totalTime = meta.duration_seconds
  if (totalTime != null) parts.push({ label: 'Time', value: `${Math.round(totalTime)}s` })

  if (parts.length === 0) return null

  return (
    <div className="mb-3 px-3 py-1.5 rounded bg-[var(--bg-hover)] font-mono text-[10px] text-[var(--text-muted)] leading-relaxed flex flex-wrap gap-x-3 gap-y-0.5">
      {parts.map((p, i) => (
        <span key={i}>
          <span className="text-[var(--text-muted)]">{p.label}:</span>{' '}
          <span className="text-[var(--text-secondary)]">{p.value}</span>
        </span>
      ))}
    </div>
  )
}
