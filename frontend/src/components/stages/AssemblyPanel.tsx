import { useState, useEffect } from 'react'
import { Download, Trash2, Loader, Scissors, AlertTriangle } from 'lucide-react'
import { deleteVersion, mediaUrl, getGenerationMeta } from '../../api'
import { TrimEditor } from './TrimEditor'
import type { WordDetail } from '../../api'
import { getVersionStyle } from '../../lib/stageColors'
import { EmptyStage } from './shared'

interface AssemblyPanelProps {
  slug: string
  detail: WordDetail
  onSelect: (v: string) => void
  onRefresh: () => void
}

function formatDuration(s: number): string {
  if (!isFinite(s) || s < 0) return '--:--'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function formatSize(bytes: number): string {
  if (!bytes || bytes < 0) return '--'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AssemblyPanel({ slug, detail, onSelect, onRefresh }: AssemblyPanelProps) {
  const versions = detail.stages.final.versions
  const selected = detail.stages.final.selected
  const [deletingVer, setDeletingVer] = useState<string | null>(null)
  const [editingVer, setEditingVer] = useState<string | null>(null)
  const [meta, setMeta] = useState<Record<string, Record<string, any> | null>>({})

  useEffect(() => {
    versions.forEach(v => {
      if (!(v.version in meta)) {
        getGenerationMeta(slug, 'assembly', v.version)
          .then(res => setMeta(prev => ({ ...prev, [v.version]: res.meta })))
          .catch(() => setMeta(prev => ({ ...prev, [v.version]: null })))
      }
    })
  }, [slug, versions])

  if (versions.length === 0) {
    return <EmptyStage message="No assembled videos yet. Click Generate to assemble the final MP4." />
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {versions.map((v, i) => {
        const m = meta[v.version]
        const outputs = m?.outputs
        const settings = m?.inputs?.settings_used
        const versionStyle = getVersionStyle('assembly', i, versions.length, selected === v.version)
        const failedStyle = v.status === 'failed' ? { borderColor: 'var(--error)', opacity: 0.7 } : {}

        return (
          <div key={v.version} className="border rounded p-3 group/ver" style={{ ...versionStyle, ...failedStyle }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--text-muted)]">{v.version}</span>
                {v.status === 'failed' && (
                  <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-[var(--error)]/15 text-[var(--error)]">
                    <AlertTriangle size={10} /> Failed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelect(v.version)}
                  className={`text-xs px-2 py-1 rounded cursor-pointer ${
                    selected === v.version
                      ? 'bg-[var(--accent)] text-white'
                      : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {selected === v.version ? '\u2713 Selected' : 'Select'}
                </button>
                <a
                  href={mediaUrl(slug, `final/${v.version}/final.mp4`)}
                  download
                  className="flex items-center gap-1 text-xs px-2 py-1 border border-[var(--border)] rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  <Download size={10} /> Download
                </a>
                {outputs?.duration_seconds != null && outputs.duration_seconds > 0 && (
                  <button
                    onClick={() => setEditingVer(editingVer === v.version ? null : v.version)}
                    className="flex items-center gap-1 text-xs px-2 py-1 border border-[var(--border)] rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                    title="Trim video"
                  >
                    <Scissors size={10} /> Trim
                  </button>
                )}
                <button
                  onClick={async () => { setDeletingVer(v.version); try { await deleteVersion(slug, 'assembly', v.version); await onRefresh() } catch {} setDeletingVer(null) }}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--error)] opacity-0 group-hover/ver:opacity-100 transition-opacity cursor-pointer"
                  title="Delete run"
                >
                  {deletingVer === v.version ? <Loader size={10} className="animate-spin" /> : <Trash2 size={10} />}
                </button>
              </div>
            </div>

            {m && (
              <div className="flex flex-wrap gap-2 mb-2 text-xs">
                {settings?.assembly_mode && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]">{settings.assembly_mode}</span>
                )}
                {outputs?.duration_seconds != null && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]">{formatDuration(outputs.duration_seconds)}</span>
                )}
                {outputs?.resolution && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]">{outputs.resolution}</span>
                )}
                {outputs?.file_size_bytes != null && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]">{formatSize(outputs.file_size_bytes)}</span>
                )}
              </div>
            )}

            {v.files.includes('final.mp4') && (
              <video
                controls
                className="w-full rounded border border-[var(--border)]"
                src={mediaUrl(slug, `final/${v.version}/final.mp4`)}
              />
            )}

            {editingVer === v.version && outputs?.duration_seconds != null && (
              <TrimEditor
                slug={slug}
                version={v.version}
                videoSrc={mediaUrl(slug, `final/${v.version}/final.mp4`)}
                videoDuration={outputs.duration_seconds}
                onSaved={() => { setEditingVer(null); onRefresh() }}
                onClose={() => setEditingVer(null)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
