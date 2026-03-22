import { useState } from 'react'
import { type WordSummary, deleteWord, toggleMute, muteAll, toggleApprove } from '../api'
import { Loader, Trash2, Volume2, VolumeX, Heart } from 'lucide-react'
import { useToast } from './Toast'

const STAGES = ['images', 'concept', 'song', 'video', 'final', 'bookend']

function StageDot({ status }: { status: string }) {
  if (status === 'done') return <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" title="Done" />
  if (status === 'failed') return <div className="w-1.5 h-1.5 rounded-full bg-[var(--error)]" title="Failed" />
  if (status === 'running') return <div className="w-1.5 h-1.5 rounded-full bg-[var(--warning)] animate-pulse" title="Running" />
  if (status === 'pending_selection') return <div className="w-1.5 h-1.5 rounded-full bg-[var(--info)]" title="Needs selection" />
  return <div className="w-1.5 h-1.5 rounded-full bg-[var(--border-bright)]" title="Empty" />
}

interface WordListProps {
  words: WordSummary[]
  selectedSlug: string | null
  onSelect: (slug: string) => void
  onRefresh: () => void
  runningWord?: string | null
  runningStage?: string | null
}

export function WordList({ words, selectedSlug, onSelect, onRefresh, runningWord, runningStage }: WordListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const { toast } = useToast()

  const getDoneCount = (w: WordSummary) =>
    STAGES.filter(s => w.stages?.[s]?.status === 'done').length

  const handleDelete = async (e: React.MouseEvent, slug: string, wordOriginal: string) => {
    e.stopPropagation()
    if (!confirm(`Delete "${wordOriginal}" and all its generated content?`)) return
    setDeleting(slug)
    try {
      await deleteWord(slug)
      onRefresh()
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`)
    }
    setDeleting(null)
  }

  const handleToggleMute = async (e: React.MouseEvent, slug: string, currentMuted: boolean) => {
    e.stopPropagation()
    try {
      await toggleMute(slug, !currentMuted)
      onRefresh()
    } catch (err: any) {
      alert(`Failed to toggle mute: ${err.message}`)
    }
  }

  const handleToggleApprove = async (e: React.MouseEvent, slug: string) => {
    e.stopPropagation()
    try {
      await toggleApprove(slug)
      onRefresh()
    } catch (err: any) {
      const text = typeof err.message === 'string' ? err.message : String(err)
      // Extract the meaningful part from "400: ..." error format
      const match = text.match(/Cannot approve[^"]*/)
      toast(match ? match[0] : 'Complete all stages first', 'error')
    }
  }

  const handleMuteAll = async (muted: boolean) => {
    try {
      await muteAll(muted)
      onRefresh()
    } catch (err: any) {
      alert(`Failed: ${err.message}`)
    }
  }

  const mutedCount = words.filter(w => w.muted).length
  const approvedCount = words.filter(w => w.approved).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Words</span>
        <div className="flex items-center gap-2">
          {words.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleMuteAll(true)}
                className="text-[9px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                title="Mute all"
              >
                Mute all
              </button>
              <span className="text-[var(--border-bright)]">|</span>
              <button
                onClick={() => handleMuteAll(false)}
                className="text-[9px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                title="Unmute all"
              >
                Unmute
              </button>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {approvedCount > 0 && (
              <span className="text-[10px] text-[var(--success)] font-medium" title={`${approvedCount} of ${words.length} approved`}>
                {approvedCount}/{words.length}
              </span>
            )}
            <span className="text-xs text-[var(--text-muted)]">
              {mutedCount > 0 ? `${words.length - mutedCount}/${words.length}` : words.length}
            </span>
          </div>
        </div>
      </div>

      {/* Word list */}
      <div className="flex-1 overflow-y-auto">
        {words.length === 0 && (
          <div className="px-3 py-6 text-center text-[var(--text-muted)] text-xs">
            Import a CSV or add a word to get started
          </div>
        )}
        {words.map((word) => {
          const isSelected = word.word_slug === selectedSlug
          const isRunning = word.word_slug === runningWord
          const isMuted = word.muted
          const done = getDoneCount(word)

          return (
            <div
              key={word.word_slug}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(word.word_slug)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(word.word_slug) } }}
              className={`w-full text-left px-3 py-2.5 border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors group cursor-pointer ${
                isSelected ? 'bg-[var(--bg-hover)] border-l-2 border-l-[var(--accent)]' : ''
              } ${isMuted ? 'opacity-40' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                  <button
                    onClick={(e) => handleToggleMute(e, word.word_slug, isMuted)}
                    className={`p-0.5 transition-all ${
                      isMuted
                        ? 'text-[var(--warning)] opacity-100'
                        : 'text-[var(--text-muted)] opacity-0 group-hover:opacity-60 hover:!opacity-100'
                    }`}
                    title={isMuted ? 'Unmute (include in Run All)' : 'Mute (skip in Run All)'}
                  >
                    {isMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
                  </button>
                  <button
                    onClick={(e) => handleToggleApprove(e, word.word_slug)}
                    className={`p-0.5 transition-all ${
                      word.approved
                        ? 'text-[#EF4444]'
                        : 'text-[var(--text-muted)] opacity-0 group-hover:opacity-60 hover:!opacity-100'
                    }`}
                    title={word.approved ? 'Approved — click to un-approve' : 'Approve word'}
                  >
                    <Heart size={11} fill={word.approved ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {isRunning && <Loader size={10} className="animate-spin text-[var(--warning)] flex-shrink-0" />}
                    <span className={`text-sm font-medium truncate ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {word.word_original}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                    {word.translation}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                  <div className="flex items-center gap-0.5">
                    {STAGES.map(s => {
                      const status = isRunning && runningStage === s ? 'running' : (word.stages?.[s]?.status || 'empty')
                      return <StageDot key={s} status={status} />
                    })}
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, word.word_slug, word.word_original)}
                    disabled={deleting === word.word_slug}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--error)] opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete word"
                  >
                    {deleting === word.word_slug
                      ? <Loader size={10} className="animate-spin" />
                      : <Trash2 size={10} />
                    }
                  </button>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-1.5 h-0.5 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all"
                  style={{ width: `${(done / STAGES.length) * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
