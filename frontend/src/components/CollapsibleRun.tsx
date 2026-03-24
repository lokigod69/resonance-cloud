import { Check, Trash2, Loader, ChevronDown, ChevronRight } from 'lucide-react'
import { getVersionStyle } from '../lib/stageColors'

interface CollapsibleRunProps {
  version: string
  isSelected: boolean
  isExpanded: boolean
  onToggle: () => void
  onSelect?: () => void
  onDelete: () => Promise<void>
  deleting: boolean
  children: React.ReactNode
  stage: string
  index: number
  total: number
}

export function CollapsibleRun({
  version, isSelected, isExpanded, onToggle, onSelect, onDelete, deleting, children,
  stage, index, total,
}: CollapsibleRunProps) {
  const versionStyle = getVersionStyle(stage, index, total, isSelected)

  return (
    <div
      className="border rounded overflow-hidden group/ver"
      style={versionStyle}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        onClick={onToggle}
      >
        {isExpanded ? <ChevronDown size={12} className="text-[var(--text-muted)]" /> : <ChevronRight size={12} className="text-[var(--text-muted)]" />}
        <span className="text-xs font-medium text-[var(--text-muted)] flex-1">{version}</span>
        {isSelected && <Check size={12} className="text-[var(--accent)]" />}
        {onSelect && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect() }}
            className={`text-xs px-2 py-1 rounded cursor-pointer ${
              isSelected
                ? 'bg-[var(--accent)] text-white'
                : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {isSelected ? '\u2713 Selected' : 'Select'}
          </button>
        )}
        <button
          onClick={async (e) => { e.stopPropagation(); await onDelete() }}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--error)] opacity-0 group-hover/ver:opacity-100 transition-opacity cursor-pointer"
          title="Delete run"
        >
          {deleting ? <Loader size={10} className="animate-spin" /> : <Trash2 size={10} />}
        </button>
      </div>
      {isExpanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}
