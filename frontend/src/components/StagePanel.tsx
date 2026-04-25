import { useState, useEffect, useRef } from 'react'
import { Play, Loader, SlidersHorizontal } from 'lucide-react'
import type { WordDetail } from '../api'
import { runStage, selectVersion } from '../api'
import { StageSettings } from './settings/StageSettings'
import { ConceptPanel } from './stages/ConceptPanel'
import { SongPanel } from './stages/SongPanel'
import { ImagePanel } from './stages/ImagePanel'
import { VideoPanel } from './stages/VideoPanel'
import { AssemblyPanel } from './stages/AssemblyPanel'
import { BookendPanel } from './stages/BookendPanel'
import { GenerationWheelLoader } from './ui/GenerationWheelLoader'
import { VerbCycler } from './ui/VerbCycler'

interface StagePanelProps {
  slug: string
  stage: string
  detail: WordDetail
  onRefresh: () => void
  setRunningStage: (s: string | null) => void
  pipelineRunning?: boolean
}

export function StagePanel({ slug, stage, detail, onRefresh, setRunningStage, pipelineRunning }: StagePanelProps) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [hasOverrides, setHasOverrides] = useState(false)
  const prevStageRef = useRef(stage)

  // Reset running/error and recompute overrides when stage changes (component no longer remounts)
  useEffect(() => {
    if (prevStageRef.current !== stage) {
      setRunning(false)
      setError(null)
      prevStageRef.current = stage
    }
    const stageSettings = detail.manifest.settings?.[stage]
    setHasOverrides(stageSettings ? Object.keys(stageSettings).length > 0 : false)
  }, [stage, detail.manifest.settings])

  const handleRun = async () => {
    setRunning(true)
    setRunningStage(stage)
    setError(null)
    try {
      await runStage(slug, stage)
      await onRefresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRunning(false)
      setRunningStage(null)
    }
  }

  const handleSelect = async (version: string) => {
    try {
      await selectVersion(slug, stage, version)
      await onRefresh()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const renderStageContent = () => {
    if (running) {
      return (
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-5">
          <GenerationWheelLoader size={120} className="gap-0" />
          <VerbCycler intervalMs={5000} />
        </div>
      )
    }

    return (
      <>
        {stage === 'concept' && (
          <ConceptPanel slug={slug} detail={detail} onSelect={handleSelect} onRefresh={onRefresh} />
        )}
        {stage === 'song' && (
          <SongPanel slug={slug} detail={detail} onSelect={handleSelect} onRefresh={onRefresh} />
        )}
        {stage === 'images' && (
          <ImagePanel slug={slug} detail={detail} onSelect={handleSelect} onRefresh={onRefresh} />
        )}
        {stage === 'video' && (
          <VideoPanel slug={slug} detail={detail} onSelect={handleSelect} onRefresh={onRefresh} />
        )}
        {stage === 'assembly' && (
          <AssemblyPanel slug={slug} detail={detail} onSelect={handleSelect} onRefresh={onRefresh} />
        )}
        {stage === 'bookend' && (
          <BookendPanel slug={slug} detail={detail} onRefresh={onRefresh} />
        )}
      </>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stage header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
          {stage.toUpperCase()}
        </h3>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-[var(--error)] max-w-xs truncate">{error}</span>
          )}
          <button
            onClick={() => setShowSettings(s => !s)}
            className={`relative p-1.5 rounded transition-colors cursor-pointer ${
              showSettings
                ? 'text-[var(--accent)] bg-[var(--accent)]/10'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
            title="Per-word settings"
          >
            <SlidersHorizontal size={14} />
            {hasOverrides && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--accent)]" />
            )}
          </button>
          <button
            onClick={handleRun}
            disabled={running || pipelineRunning}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all
              ${running || pipelineRunning
                ? 'bg-[var(--bg-card)] text-[var(--text-muted)] cursor-not-allowed'
                : 'bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white cursor-pointer'
              }
            `}
            title={pipelineRunning ? 'Pipeline is running' : undefined}
          >
            {running ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
            {running ? 'Running...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Stage content */}
      <div className="flex-1 overflow-y-auto p-4">
        {showSettings && (
          <div className="max-w-[700px] mx-auto">
            <StageSettings
              slug={slug}
              stage={stage}
              onOverridesChange={setHasOverrides}
            />
          </div>
        )}
        {renderStageContent()}
      </div>
    </div>
  )
}
