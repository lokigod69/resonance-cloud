import { ChevronRight, Loader, CheckCircle, XCircle, AlertTriangle, Circle, Play, Square, SkipForward } from 'lucide-react'
import type { WordDetail, WordPipelineStatus } from '../api'

const STAGES = [
  { key: 'images',  label: 'IMAGE',   color: '#f59e0b' },
  { key: 'concept', label: 'CONCEPT', color: 'var(--info)' },
  { key: 'song',    label: 'SONG',    color: '#e879f9' },
  { key: 'video',   label: 'VIDEO',   color: '#34d399' },
  { key: 'assembly', label: 'ASSEMBLY', color: '#f87171' },
  { key: 'bookend', label: 'BOOKEND', color: '#c084fc' },
]

interface StageStatus {
  status: string
  version_count: number
  selected: string | null
}

interface PipelineViewProps {
  detail: WordDetail | null
  selectedStage: string
  onSelectStage: (stage: string) => void
  runningStage?: string | null
  wordPipelineStatus?: WordPipelineStatus | null
  onRunWord?: () => void
  onCancelPipeline?: () => void
  onResumePipeline?: () => void
}

function StageBox({
  stage,
  status,
  isSelected,
  isRunning,
  isQueued,
  onClick,
}: {
  stage: { key: string; label: string; color: string }
  status: StageStatus | undefined
  isSelected: boolean
  isRunning: boolean
  isQueued: boolean
  onClick: () => void
}) {
  const st = isRunning ? 'running' : isQueued ? 'queued' : (status?.status || 'empty')

  const iconEl = (() => {
    if (st === 'running') return <Loader size={16} className="animate-spin text-[var(--warning)]" />
    if (st === 'done') return <CheckCircle size={16} className="text-[var(--success)]" />
    if (st === 'failed') return <XCircle size={16} className="text-[var(--error)]" />
    if (st === 'pending_selection') return <AlertTriangle size={16} className="text-amber-400" />
    if (st === 'queued') return <Circle size={16} className="text-[var(--accent)] opacity-30" />
    return <Circle size={16} className="text-[var(--text-muted)]" />
  })()

  const borderStyle = (() => {
    if (isSelected) return { borderColor: 'var(--accent)', boxShadow: '0 0 12px var(--accent-glow)' }
    if (st === 'done') return { borderColor: 'rgba(62, 207, 106, 0.3)' }
    if (st === 'failed') return { borderColor: 'rgba(229, 66, 77, 0.3)' }
    if (st === 'running') return { borderColor: 'rgba(245, 166, 35, 0.3)' }
    if (st === 'pending_selection') return { borderColor: 'rgba(245, 158, 11, 0.3)' }
    if (st === 'queued') return { borderColor: 'rgba(168, 85, 247, 0.15)' }
    return { borderColor: 'var(--border)' }
  })()

  return (
    <button
      onClick={onClick}
      className={`stage-box flex flex-col items-center gap-2 px-5 py-3.5 rounded-lg border min-w-[100px] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] cursor-pointer ${st === 'queued' ? 'opacity-50' : ''}`}
      style={borderStyle}
    >
      {iconEl}
      <span className={`text-[10px] font-bold tracking-[0.15em] ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
        {stage.label}
      </span>
      {(status?.version_count ?? 0) > 0 && (
        <span className="text-[10px] text-[var(--text-muted)] -mt-1">
          {status!.version_count} take{status!.version_count !== 1 ? 's' : ''}
        </span>
      )}
    </button>
  )
}

export function PipelineView({ detail, selectedStage, onSelectStage, runningStage, wordPipelineStatus, onRunWord, onCancelPipeline, onResumePipeline }: PipelineViewProps) {
  const stageMap = detail ? {
    concept: detail.stages.concept,
    song: detail.stages.song,
    images: detail.stages.images,
    video: detail.stages.video,
    assembly: detail.stages.final,
    bookend: detail.stages.bookend,
  } : {}

  const getStatus = (key: string): StageStatus | undefined => {
    const m = detail?.manifest
    if (!m) return undefined
    const selectedKey = key === 'assembly' ? 'final' : key
    const selected = (m.selected as Record<string, string | null>)[selectedKey] ?? null
    const stage = stageMap[key as keyof typeof stageMap]
    const vCount = key === 'concept'
      ? (stage as typeof detail.stages.concept)?.versions?.length ?? 0
      : (stage as any)?.versions?.length ?? 0

    if (selected) return { status: 'done', version_count: vCount, selected }
    if (vCount > 0) return { status: 'pending_selection', version_count: vCount, selected: null }
    const lineageKey = key === 'assembly' ? 'assembly' : key
    const lineageFailed = m.lineage.some(l => l.stage === lineageKey && l.status === 'failed')
    if (lineageFailed) return { status: 'failed', version_count: vCount, selected: null }
    return { status: 'empty', version_count: vCount, selected: null }
  }

  // Compute queued stages during pipeline run
  const queuedStages = wordPipelineStatus?.running
    ? wordPipelineStatus.stages_remaining.filter(
        s => !wordPipelineStatus.completed_stages.includes(s) && s !== wordPipelineStatus.current_stage
      )
    : []

  const pipelineRunning = wordPipelineStatus?.running ?? false
  const pipelinePaused = wordPipelineStatus?.paused_for_song ?? false
  const pipelineError = wordPipelineStatus?.error ?? null
  // pipelineDone available if needed: wordPipelineStatus && !wordPipelineStatus.running && !wordPipelineStatus.error && wordPipelineStatus.completed_stages.length > 0

  // Run Word button content
  const renderRunWordButton = () => {
    if (!onRunWord) return null

    if (pipelinePaused) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-400 font-medium">
            Paused -- select a song take
          </span>
          <button
            onClick={onResumePipeline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 transition-colors"
          >
            <SkipForward size={12} />
            Continue
          </button>
          <button
            onClick={onCancelPipeline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[var(--error)]/10 hover:bg-[var(--error)]/20 border border-[var(--error)]/30 text-[var(--error)] transition-colors"
          >
            <Square size={10} />
            Stop
          </button>
        </div>
      )
    }

    if (pipelineRunning) {
      const stageIdx = STAGES.findIndex(s => s.key === wordPipelineStatus?.current_stage)
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={onCancelPipeline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[var(--error)]/10 hover:bg-[var(--error)]/20 border border-[var(--error)]/30 text-[var(--error)] transition-colors"
          >
            <Square size={10} />
            Cancel
          </button>
          <span className="text-xs text-[var(--text-muted)]">
            Stage {stageIdx + 1}/5: {wordPipelineStatus?.current_stage}
          </span>
        </div>
      )
    }

    if (pipelineError) {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={onRunWord}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white transition-colors"
          >
            <Play size={12} />
            Retry
          </button>
          <span className="text-xs text-[var(--error)]">
            Failed at {pipelineError.stage}
          </span>
        </div>
      )
    }

    return (
      <button
        onClick={onRunWord}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white transition-colors"
      >
        <Play size={12} />
        Run Word
      </button>
    )
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-20 text-[var(--text-muted)] text-sm">
        Select a word to view its pipeline
      </div>
    )
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center gap-2.5">
        {STAGES.map((stage, i) => (
          <div key={stage.key} className="flex items-center gap-2.5">
            <StageBox
              stage={stage}
              status={getStatus(stage.key)}
              isSelected={selectedStage === stage.key}
              isRunning={runningStage === stage.key}
              isQueued={queuedStages.includes(stage.key)}
              onClick={() => onSelectStage(stage.key)}
            />
            {i < STAGES.length - 1 && (
              <div className="flex items-center">
                <div className="w-6 h-px bg-[var(--border-bright)]" />
                <ChevronRight size={14} className="text-[var(--border-bright)] -mx-1" />
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Run Word button row */}
      <div className="flex items-center justify-center">
        {renderRunWordButton()}
      </div>
    </div>
  )
}
