import { useState, useEffect } from 'react'
import { Download, Trash2, Loader } from 'lucide-react'
import { deleteVersion, mediaUrl, getGenerationMeta } from '../../api'
import type { WordDetail } from '../../api'
import { getVersionStyle } from '../../lib/stageColors'
import { EmptyStage } from './shared'

interface BookendPanelProps {
  slug: string
  detail: WordDetail
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

export function BookendPanel({ slug, detail, onRefresh }: BookendPanelProps) {
  const versions = detail.stages.bookend?.versions ?? []
  const selected = detail.stages.bookend?.selected ?? null
  const [deletingVer, setDeletingVer] = useState<string | null>(null)
  const [meta, setMeta] = useState<Record<string, Record<string, any> | null>>({})

  useEffect(() => {
    versions.forEach(v => {
      if (!(v.version in meta)) {
        getGenerationMeta(slug, 'bookend', v.version)
          .then(res => setMeta(prev => ({ ...prev, [v.version]: res.meta })))
          .catch(() => setMeta(prev => ({ ...prev, [v.version]: null })))
      }
    })
  }, [slug, versions])

  if (versions.length === 0) {
    return <EmptyStage message="No bookend videos yet. Click Generate to wrap the assembled video with TTS intro/outro cards." />
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {versions.map((v, i) => {
        const m = meta[v.version]
        const outputs = m?.outputs
        const settings = m?.inputs?.settings_used
        const versionStyle = getVersionStyle('bookend', i, versions.length, selected === v.version)

        return (
          <div key={v.version} className="border rounded p-3 group/ver" style={versionStyle}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--text-muted)]">{v.version}</span>
              <div className="flex items-center gap-2">
                <a
                  href={mediaUrl(slug, `bookend/${v.version}/final.mp4`)}
                  download
                  className="flex items-center gap-1 text-xs px-2 py-1 border border-[var(--border)] rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  <Download size={10} /> Download
                </a>
                <button
                  onClick={async () => { setDeletingVer(v.version); try { await deleteVersion(slug, 'bookend', v.version); await onRefresh() } catch {} setDeletingVer(null) }}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--error)] opacity-0 group-hover/ver:opacity-100 transition-opacity cursor-pointer"
                  title="Delete run"
                >
                  {deletingVer === v.version ? <Loader size={10} className="animate-spin" /> : <Trash2 size={10} />}
                </button>
              </div>
            </div>

            {m && (
              <div className="flex flex-wrap gap-2 mb-2 text-xs">
                {outputs?.tts_duration_seconds != null && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]">TTS {formatDuration(outputs.tts_duration_seconds)}</span>
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
                {settings?.voice_id && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]" title="Voice ID">voice: {settings.voice_id.slice(0, 8)}...</span>
                )}
                {settings?.text_color && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]">color: {settings.text_color}</span>
                )}
              </div>
            )}

            {v.files.includes('final.mp4') && (
              <video
                controls
                className="w-full rounded border border-[var(--border)]"
                src={mediaUrl(slug, `bookend/${v.version}/final.mp4`)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
