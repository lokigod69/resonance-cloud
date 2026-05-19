import { Check, CheckCircle2, ChevronDown, ClipboardCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getPathVibesAvailable,
  getGuidedPathLessons,
  type GuidedPathMetadata,
  type GuidedTargetLanguage,
} from '@/data/guidedLessons'
import type { ActiveGuidedVibeId } from '@/data/guidedVibes'
import { formatGuidedPathLabel } from '@/lib/guidedPathLabels'
import { useTranslation } from '@/hooks/useTranslation'
import type { TodayProgressState } from '@/lib/todayProgress'
import { Button } from '@/components/ui/button'
import { GuidedVibePicker } from '@/components/today/TodayHero'
import { cn } from '@/lib/utils'

type GuidedPathDirectoryProps = {
  open: boolean
  pathOptions: GuidedPathMetadata[]
  selectedPathId: string
  progress: TodayProgressState
  pathCheckHref: string
  selectedLanguage?: GuidedTargetLanguage
  availableLanguages?: GuidedTargetLanguage[]
  selectedVibeId: ActiveGuidedVibeId
  onSelectPath: (pathId: string) => void
  onSelectLanguage?: (language: GuidedTargetLanguage) => void
  onSelectVibe: (vibeId: ActiveGuidedVibeId) => void
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
  selectedLanguage = 'English',
  availableLanguages = [],
  selectedVibeId,
  onSelectPath,
  onSelectLanguage,
  onSelectVibe,
  onClose,
}: GuidedPathDirectoryProps) {
  const { t } = useTranslation()
  const [languageExpanded, setLanguageExpanded] = useState(false)
  const selectedPath = pathOptions.find((path) => path.id === selectedPathId) ?? pathOptions[0]
  const languages = availableLanguages.length > 0 ? availableLanguages : collectLanguages(pathOptions)
  const pathVibesAvailable = getPathVibesAvailable(selectedPathId)
  const shouldShowVibePicker = selectedLanguage === 'English' && pathVibesAvailable.length > 1
  const pathsForSelectedLanguage = pathOptions.filter((path) => path.targetLanguage === selectedLanguage)
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

  const handleSelectLanguage = (language: GuidedTargetLanguage) => {
    onSelectLanguage?.(language)
    setLanguageExpanded(false)
  }

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

        {languages.length > 1 && (
          <div className="today-path-directoryLanguage rounded-lg border border-[var(--border-subtle)] p-3">
            <button
              type="button"
              className="flex w-full min-w-0 items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-expanded={languageExpanded}
              onClick={() => setLanguageExpanded((current) => !current)}
            >
              <span className="min-w-0">
                <span className="block text-xs font-medium text-[var(--text-secondary)]">
                  {t('today.language.title')}
                </span>
                <span className="mt-1 block truncate text-base font-semibold text-[var(--text-primary)]">
                  {t(`today.language.${selectedLanguage}`)}
                </span>
              </span>
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 text-[var(--accent)] transition-transform', languageExpanded && 'rotate-180')}
                aria-hidden="true"
              />
            </button>

            {languageExpanded && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {availableLanguages.map((language) => {
                  const isSelected = language === selectedLanguage

                  return (
                    <button
                      key={language}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handleSelectLanguage(language)}
                      className={cn(
                        'today-path-directoryLanguageOption flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                        isSelected
                          ? 'border-[color-mix(in_srgb,var(--accent)_58%,transparent)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_42%,transparent)]',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">
                        {t(`today.language.${language}`)}
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {shouldShowVibePicker && (
          <div className="today-path-directoryVibe rounded-lg border border-[var(--border-subtle)] p-3">
            <GuidedVibePicker
              selectedVibeId={selectedVibeId}
              onSelectVibe={onSelectVibe}
              compact
            />
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

function collectLanguages(pathOptions: GuidedPathMetadata[]): GuidedTargetLanguage[] {
  const seen = new Set<GuidedTargetLanguage>()
  const languages: GuidedTargetLanguage[] = []

  for (const path of pathOptions) {
    if (seen.has(path.targetLanguage)) continue
    seen.add(path.targetLanguage)
    languages.push(path.targetLanguage)
  }

  return languages
}
