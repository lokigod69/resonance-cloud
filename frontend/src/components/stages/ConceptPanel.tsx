import { useState } from 'react'
import { Edit3, Save, X, Loader } from 'lucide-react'
import type { ConceptArtifact } from '../../api'
import { getConceptArtifact, saveConceptEdit } from '../../api'
import { getVersionStyle } from '../../lib/stageColors'
import type { StageProps } from './shared'
import { EmptyStage } from './shared'

export function ConceptPanel({ slug, detail, onSelect, onRefresh }: StageProps) {
  const [editing, setEditing] = useState<{version: string, data: ConceptArtifact} | null>(null)
  const [saving, setSaving] = useState(false)
  const versions = detail.stages.concept.versions
  const selected = detail.stages.concept.selected

  const handleEdit = async (versionName: string) => {
    try {
      const data = await getConceptArtifact(slug, versionName)
      setEditing({ version: versionName, data })
    } catch { /* noop: failed fetch leaves edit modal closed */ }
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const result = await saveConceptEdit(slug, editing.version, {
        lyrics: editing.data.lyrics,
        music_caption: editing.data.music_caption,
        visual_hint: editing.data.visual_hint,
      })
      setEditing(null)
      await onRefresh()
      onSelect(result.new_version)
    } catch { /* noop: save failure leaves edit modal open with current values */ }
    setSaving(false)
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">Editing: {editing.version}</span>
          <div className="flex gap-2">
            <button onClick={() => setEditing(null)} className="px-2 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--bg-hover)]">
              <X size={12} />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--accent)] text-white rounded hover:bg-[var(--accent)]/80"
            >
              {saving ? <Loader size={12} className="animate-spin" /> : <Save size={12} />}
              Save as new version
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Music Caption</label>
          <textarea
            value={editing.data.music_caption}
            onChange={e => setEditing({...editing, data: {...editing.data, music_caption: e.target.value}})}
            className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--accent)]"
            rows={2}
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Lyrics</label>
          <textarea
            value={editing.data.lyrics}
            onChange={e => setEditing({...editing, data: {...editing.data, lyrics: e.target.value}})}
            className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded p-2 text-sm font-mono text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--accent)]"
            rows={12}
          />
        </div>
      </div>
    )
  }

  if (versions.length === 0) {
    return <EmptyStage message="No concepts generated yet. Click Generate to create one." />
  }

  return (
    <div className="space-y-2 max-w-3xl mx-auto">
      {versions.map((v, i) => (
        <ConceptVersionCard
          key={v.name}
          slug={slug}
          versionName={v.name}
          isSelected={v.selected || selected === v.name}
          onSelect={() => onSelect(v.name)}
          onEdit={() => handleEdit(v.name)}
          index={i}
          total={versions.length}
        />
      ))}
    </div>
  )
}

function ConceptVersionCard({ slug, versionName, isSelected, onSelect, onEdit, index, total }: {
  slug: string, versionName: string, isSelected: boolean,
  onSelect: () => void, onEdit: () => void, index: number, total: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [data, setData] = useState<ConceptArtifact | null>(null)
  const versionStyle = getVersionStyle('concept', index, total, isSelected)

  const handleExpand = async () => {
    if (!data) {
      try {
        const d = await getConceptArtifact(slug, versionName)
        setData(d)
      } catch { /* noop: missing artifact leaves card body empty when expanded */ }
    }
    setExpanded(!expanded)
  }

  return (
    <div className="border rounded overflow-hidden transition-colors" style={versionStyle}>
      <div className="flex items-center gap-2 p-3">
        <button
          onClick={onSelect}
          className={`w-4 h-4 rounded-full border flex-shrink-0 cursor-pointer ${isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border-bright)]'}`}
        />
        <button className="flex-1 text-left" onClick={handleExpand}>
          <span className="text-sm text-[var(--text-secondary)]">{versionName.replace('.json', '')}</span>
        </button>
        <button onClick={onEdit} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
          <Edit3 size={12} />
        </button>
      </div>
      {expanded && data && (
        <div className="px-3 pb-3 space-y-2 border-t border-[var(--border)]">
          <div className="mt-2">
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Music Caption</span>
            <p className="text-xs text-[var(--text-secondary)] mt-1 italic">{data.music_caption}</p>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Lyrics</span>
            <pre className="text-xs text-[var(--text-secondary)] mt-1 font-mono whitespace-pre-wrap">{data.lyrics}</pre>
          </div>
          {data.visual_hint && (
            <div>
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Visual Hint</span>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{data.visual_hint}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
