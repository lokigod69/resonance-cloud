import { CheckCircle2, ClipboardCheck, X } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  getGuidedPathLessons,
  type GuidedPathMetadata,
  type GuidedTargetLanguage,
} from '@/data/guidedLessons'
import { formatGuidedPathLabel } from '@/lib/guidedPathLabels'
import { useTranslation } from '@/hooks/useTranslation'
import type { TodayProgressState } from '@/lib/todayProgress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type GuidedPathDirectoryProps = {
  open: boolean
  pathOptions: GuidedPathMetadata[]
  selectedPathId: string
  progress: TodayProgressState
  pathCheckHref: string
  targetLanguage?: GuidedTargetLanguage
  onSelectPath: (pathId: string) => void
  onClose: () => void
}

const DIRECTORY_GROUP_ID = 'practical'
const DIRECTORY_GROUP_CATEGORY_LABEL = 'Praktisch'

export function GuidedPathDirectory({
  open,
  pathOptions,
  selectedPathId,
  progress,
  pathCheckHref,
  targetLanguage = 'English',
  onSelectPath,
  onClose,
}: GuidedPathDirectoryProps) {
  const { t } = useTranslation()
  const selectedPath = pathOptions.find((path) => path.id === selectedPathId) ?? pathOptions[0]
  const pathsForSelectedLanguage = pathOptions.filter((path) => path.targetLanguage === targetLanguage)
  const groupedPathOptions = pathsForSelectedLanguage.length > 0
    ? [
        {
          id: DIRECTORY_GROUP_ID,
          categoryLabel: DIRECTORY_GROUP_CATEGORY_LABEL,
          paths: pathsForSelectedLanguage,
        },
      ]
    : []

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="today-path-directoryOverlay fixed inset-0 z-50 grid place-items-center bg-black/55 px-3 py-4 backdrop-blur-sm" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="today-path-directory-title"
        className="today-path-directoryPanel theme-panel grid max-h-[min(88dvh,44rem)] w-full max-w-3xl gap-4 overflow-y-auto rounded-lg border border-[var(--border-subtle)] p-4 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {t('today.path.directoryCurrent')}
            </p>
            <h2 id="today-path-directory-title" className="mt-1 text-2xl font-semibold leading-tight text-[var(--text-primary)]">
              {t('today.path.directoryTitle')}
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('common.cancel')}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {selectedPath && (
          <div className="today-path-directoryCurrent rounded-lg border border-[var(--border-subtle)] p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatGuidedPathLabel(selectedPath, t)}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {t('today.path.compactProgress', getPathProgress(progress, selectedPath.id))}
                </p>
              </div>
              <Button asChild type="button" size="sm" variant="outline">
                <Link to={pathCheckHref} onClick={onClose}>
                  <ClipboardCheck className="h-4 w-4" />
                  {t('today.path.pathCheck')}
                </Link>
              </Button>
            </div>
          </div>
        )}

        {groupedPathOptions.map((group) => (
          <div key={group.id} className="today-path-directoryGroup grid gap-2" data-directory-group={group.id}>
            <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
              {t('today.path.directoryGroupPractical') || group.categoryLabel}
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {group.paths.map((path) => {
                const isSelected = path.id === selectedPathId
                const pathProgress = getPathProgress(progress, path.id)

                return (
                  <button
                    key={path.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      onSelectPath(path.id)
                      onClose()
                    }}
                    className={cn(
                      'today-path-directoryOption min-w-0 rounded-lg border p-3 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                      isSelected
                        ? 'border-[color-mix(in_srgb,var(--accent)_58%,transparent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_42%,transparent)]',
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block text-base font-semibold text-[var(--text-primary)]">
                          {formatGuidedPathLabel(path, t)}
                        </span>
                      </span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />}
                    </span>
                    <span className="mt-3 block text-xs text-[var(--text-muted)]">
                      {t('today.path.compactProgress', pathProgress)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

function getPathProgress(progress: TodayProgressState, pathId: string) {
  return {
    completed: progress.courses[pathId]?.completedLessonIds.length ?? 0,
    total: getGuidedPathLessons(pathId).length,
  }
}
