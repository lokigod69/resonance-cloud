import { useState } from 'react'
import { deleteVersion, mediaUrl, getGenerationMeta } from '../../api'
import { CollapsibleRun } from '../CollapsibleRun'
import type { StageProps } from './shared'
import { EmptyStage } from './shared'

export function VideoPanel({ slug, detail, onSelect, onRefresh }: StageProps) {
  const versions = detail.stages.video.versions
  const selected = detail.stages.video.selected
  const [deletingVer, setDeletingVer] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(selected ? [selected] : versions.length ? [versions[versions.length - 1].version] : [])
  )
  const [meta, setMeta] = useState<Record<string, Record<string, any> | null>>({})

  const toggle = (v: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(v) ? next.delete(v) : next.add(v)
      return next
    })
    if (!(v in meta)) {
      getGenerationMeta(slug, 'video', v).then(res => setMeta(prev => ({ ...prev, [v]: res.meta }))).catch(() => setMeta(prev => ({ ...prev, [v]: null })))
    }
  }

  // Load meta for initially expanded versions
  useState(() => {
    expanded.forEach(v => {
      if (!(v in meta)) {
        getGenerationMeta(slug, 'video', v).then(res => setMeta(prev => ({ ...prev, [v]: res.meta }))).catch(() => {})
      }
    })
  })

  if (versions.length === 0) {
    return <EmptyStage message="No video clips generated yet. Click Generate to create clips." />
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {versions.map((v, i) => (
        <CollapsibleRun
          key={v.version}
          version={v.version}
          isSelected={selected === v.version}
          isExpanded={expanded.has(v.version)}
          onToggle={() => toggle(v.version)}
          onSelect={() => onSelect(v.version)}
          onDelete={async () => { setDeletingVer(v.version); try { await deleteVersion(slug, 'video', v.version); await onRefresh() } catch {} setDeletingVer(null) }}
          deleting={deletingVer === v.version}
          stage="video"
          index={i}
          total={versions.length}
        >
          {meta[v.version] && <MetaRow meta={meta[v.version]!} />}
          <div className="grid grid-cols-2 gap-2">
            {v.clips.map(clip => (
              <div key={clip}>
                <video
                  controls
                  className="w-full rounded border border-[var(--border)]"
                  src={mediaUrl(slug, `videos/${v.version}/${clip}`)}
                />
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{clip}</div>
              </div>
            ))}
          </div>
        </CollapsibleRun>
      ))}
    </div>
  )
}

function MetaRow({ meta }: { meta: Record<string, any> }) {
  const settings = meta.inputs?.settings_used ?? {}
  const cost = meta.cost?.estimated_usd
  const prompt = meta.inputs?.video_prompt

  const pills: string[] = []
  const modeLabels: Record<string, string> = { ken_burns: 'Ken Burns', ltx_fast: 'LTX 2.3 Fast', ltx_pro: 'LTX 2.3 Pro', ltx: 'LTX', kling_standard: 'Kling Standard', kling_pro: 'Kling Pro' }
  if (settings.video_mode) pills.push(modeLabels[settings.video_mode] ?? settings.video_mode.replace(/_/g, ' '))
  if (settings.duration) pills.push(`${settings.duration}s`)
  if (settings.resolution) pills.push(settings.resolution)
  if (settings.fps) pills.push(`${settings.fps} fps`)
  if (cost != null) pills.push(`~$${Number(cost).toFixed(2)}`)

  if (pills.length === 0 && !prompt) return null

  return (
    <div className="mb-3 text-xs text-[var(--text-muted)] space-y-1.5">
      {pills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pills.map((p, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]">{p}</span>
          ))}
        </div>
      )}
      {prompt && (
        <details>
          <summary className="text-[10px] uppercase tracking-wider cursor-pointer select-none">Video Prompt</summary>
          <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">{prompt}</p>
        </details>
      )}
    </div>
  )
}
