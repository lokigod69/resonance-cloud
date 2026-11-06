import { Check, CheckCircle2, ChevronDown, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Dialog } from 'radix-ui'
import {
  getGuidedPathLessonIds,
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
  selectedLanguage?: GuidedTargetLanguage
  availableLanguages?: GuidedTargetLanguage[]
  selectedVibeId: ActiveGuidedVibeId
  onSelectPath: (pathId: string) => void
  onSelectLanguage?: (language: GuidedTargetLanguage) => void
  onSelectVibe: (vibeId: ActiveGuidedVibeId) => void
  onClose: () => void
}

export function GuidedPathDirectory({
  open,
  pathOptions,
  selectedPathId,
  progress,
  selectedLanguage = 'English',
  availableLanguages = [],
  selectedVibeId,
  onSelectPath,
  onSelectLanguage,
  onSelectVibe,
  onClose,
}: GuidedPathDirectoryProps) {
  const { t } = useTranslation()
  const triggerRef = useRef<HTMLElement | null>(null)
  const [languageExpanded, setLanguageExpanded] = useState(false)
  const [browsedLevel, setBrowsedLevel] = useState<GuidedPathMetadata['level']>()
  const languages = availableLanguages.length > 0 ? availableLanguages : collectLanguages(pathOptions)
  const pathsForSelectedLanguage = pathOptions.filter((path) => path.targetLanguage === selectedLanguage)
  const levels = [...new Set(pathsForSelectedLanguage.map((path) => path.level))]
  const activeLevel = pathsForSelectedLanguage.find((path) => path.id === selectedPathId)?.level
  const level = browsedLevel && levels.includes(browsedLevel) ? browsedLevel : activeLevel ?? levels[0]
  const visiblePaths = pathsForSelectedLanguage.filter((path) => path.level === level)

  if (!open) return null

  const handleSelectLanguage = (language: GuidedTargetLanguage) => {
    setBrowsedLevel(undefined)
    onSelectLanguage?.(language)
    setLanguageExpanded(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <Dialog.Portal>
      <div className="today-shell today-directoryPortal" data-guided-vibe={selectedVibeId}>
      <Dialog.Overlay className="today-path-directoryOverlay fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />
      <Dialog.Content
        aria-describedby={undefined}
        className="today-path-directoryPanel theme-panel fixed left-1/2 top-1/2 z-50 grid max-h-[min(88dvh,44rem)] w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-lg border border-[var(--border-subtle)] p-4 shadow-2xl sm:p-6"
        onOpenAutoFocus={() => { triggerRef.current = document.activeElement as HTMLElement | null }}
        onCloseAutoFocus={(event) => { event.preventDefault(); (triggerRef.current?.isConnected ? triggerRef.current : document.querySelector<HTMLElement>('.today-journey-options'))?.focus() }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {t('today.path.directoryCurrent')}
            </p>
            <Dialog.Title className="mt-1 text-2xl font-semibold leading-tight text-[var(--text-primary)]">
              {t('today.path.directoryTitle')}
            </Dialog.Title>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={t('common.cancel')}>
            <X className="h-4 w-4" />
          </Button>
        </div>

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
                {languages.map((language) => {
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

        <div className="today-path-directoryVibe rounded-lg border border-[var(--border-subtle)] p-3">
          <GuidedVibePicker
            selectedVibeId={selectedVibeId}
            onSelectVibe={onSelectVibe}
            compact
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[6rem_minmax(0,1fr)]">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-[var(--text-muted)]">{t('dashboard.level')}</p>
            <div className="flex gap-2 sm:flex-col" role="group" aria-label={t('dashboard.level')}>
              {levels.map((option) => (
                <button
                  type="button"
                  key={option}
                  aria-pressed={level === option}
                  onClick={() => setBrowsedLevel(option)}
                  className={cn(
                    'inline-flex min-w-14 items-center justify-center gap-1 rounded-lg border px-2 font-semibold focus-visible:ring-2',
                    option === level ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border-subtle)]',
                  )}
                >
                  {option}
                  {level === option && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-[var(--text-muted)]">{t('today.path.directoryGroupPractical')}</p>
            <div className="today-path-directoryPathGrid grid gap-2">
              {visiblePaths.map((path) => {
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
                          {formatGuidedPathLabel(path, t, { includeLanguage: false })}
                        </span>
                      </span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />}
                    </span>
                    <span className="mt-3 block text-xs text-[var(--text-muted)]">
                      {formatPathProgressFraction(pathProgress)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Dialog.Content>
      </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function getPathProgress(progress: TodayProgressState, pathId: string) {
  return {
    completed: progress.courses[pathId]?.completedLessonIds.length ?? 0,
    total: getGuidedPathLessonIds(pathId).length,
  }
}

function formatPathProgressFraction(pathProgress: ReturnType<typeof getPathProgress>) {
  return `${pathProgress.completed}/${pathProgress.total}`
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
