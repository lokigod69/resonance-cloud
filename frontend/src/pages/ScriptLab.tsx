import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { ScriptDefinition, ScriptSymbol } from '@/lib/scriptlab/types'
import { getScriptSymbol, localizeScriptText } from '@/lib/scriptlab/types'
import { SCRIPTS, getScriptEntry, getScriptsForLanguage } from '@/lib/scriptlab/registry'
import { loadScriptProgress } from '@/lib/scriptlab/progress'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'
import { LingwaveLoader } from '@/components/ui/LingwaveLoader'
import { SymbolGrid } from '@/components/scriptlab/SymbolGrid'
import { SymbolDetailPanel } from '@/components/scriptlab/SymbolDetailPanel'
import { BuildMode } from '@/components/scriptlab/BuildMode'
import { QuizMode } from '@/components/scriptlab/QuizMode'
import { cn } from '@/lib/utils'

type TabKey = 'learn' | 'build' | 'quiz'

type ResolvedSection = {
  section: ScriptDefinition['sections'][number]
  symbols: ScriptSymbol[]
}

export default function ScriptLab() {
  const { scriptId } = useParams()
  const { activeLanguage } = useLanguage()
  const { t, locale } = useTranslation()

  const entry = useMemo(() => {
    if (scriptId) return getScriptEntry(scriptId)
    const forLanguage = getScriptsForLanguage(activeLanguage)
    if (forLanguage.length > 0) return forLanguage[0]
    if (SCRIPTS.length === 1) return SCRIPTS[0]
    return undefined
  }, [scriptId, activeLanguage])

  const [script, setScript] = useState<ScriptDefinition | null>(null)
  const [tab, setTab] = useState<TabKey>('learn')
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set())
  const [detail, setDetail] = useState<{ sectionIndex: number; symbolIndex: number } | null>(null)
  const [failedEntryId, setFailedEntryId] = useState<string | null>(null)

  useEffect(() => {
    if (!entry) return
    let cancelled = false
    entry
      .load()
      .then((module) => {
        if (cancelled) return
        setScript(module.default)
        setSeen(new Set(loadScriptProgress(entry.id).seenSymbolIds))
        // Indices and tab choice belong to the previous script; reset both so
        // switching scripts can't reopen a stale detail sheet or land on a
        // Build tab the new script doesn't offer.
        setDetail(null)
        setTab('learn')
        setFailedEntryId(null)
      })
      .catch(() => {
        if (!cancelled) setFailedEntryId(entry.id)
      })
    return () => {
      cancelled = true
    }
  }, [entry])

  // Prime the async speech-voice list early so canPlayScriptAudio sees real
  // data by quiz time, and stop any in-flight utterance when leaving the page.
  useEffect(() => {
    if (!('speechSynthesis' in globalThis)) return
    globalThis.speechSynthesis.getVoices()
    return () => globalThis.speechSynthesis.cancel()
  }, [])

  // Derived (not stored) so switching scripts shows the loader without a
  // synchronous setState-in-effect: the loaded script must match the current entry.
  const ready = Boolean(script && entry && script.id === entry.id)

  const handleSeen = useCallback((symbolId: string) => {
    setSeen((prev) => (prev.has(symbolId) ? prev : new Set(prev).add(symbolId)))
  }, [])

  const closeDetail = useCallback(() => setDetail(null), [])
  const navigateDetail = useCallback(
    (symbolIndex: number) => setDetail((current) => (current ? { ...current, symbolIndex } : current)),
    [],
  )

  const resolvedSections = useMemo<ResolvedSection[]>(() => {
    if (!script) return []
    return script.sections.map((section) => ({
      section,
      symbols: section.symbolIds
        .map((id) => getScriptSymbol(script, id))
        .filter((symbol): symbol is ScriptSymbol => Boolean(symbol)),
    }))
  }, [script])

  const tabs = useMemo<{ key: TabKey; labelKey: string }[]>(() => {
    const list: { key: TabKey; labelKey: string }[] = [{ key: 'learn', labelKey: 'scriptlab.tab.learn' }]
    if (script?.composition) list.push({ key: 'build', labelKey: 'scriptlab.tab.build' })
    list.push({ key: 'quiz', labelKey: 'scriptlab.tab.quiz' })
    return list
  }, [script?.composition])

  if (!entry) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 sm:px-6">
        <h1 className="mb-4 font-display text-2xl font-semibold text-[var(--text-primary)]">
          {t('scriptlab.chooser.title')}
        </h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SCRIPTS.map((option) => (
            <Link
              key={option.id}
              to={`/alphabet/${option.id}`}
              className="pg-glass flex items-center gap-4 rounded-2xl p-4 transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
            >
              <span className="font-display text-4xl text-[var(--text-primary)]">{option.emblem}</span>
              <span className="min-w-0">
                <span className="block font-display text-lg font-medium text-[var(--text-primary)]">
                  {option.nativeName}
                </span>
                <span className="block text-sm text-[var(--text-secondary)]">{option.displayName}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  if (!ready || !script) {
    if (failedEntryId === entry.id) {
      return (
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-16 pb-24 text-center sm:px-6">
          <p className="text-[var(--text-secondary)]">{t('scriptlab.loadError')}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-[var(--accent)] px-6 py-2.5 font-medium text-[var(--on-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
          >
            {t('scriptlab.reload')}
          </button>
        </div>
      )
    }
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 sm:px-6">
        <LingwaveLoader />
      </div>
    )
  }

  const total = script.symbols.length
  const seenCount = script.symbols.reduce((count, symbol) => (seen.has(symbol.id) ? count + 1 : count), 0)
  const hasAdvanced = resolvedSections.some((resolved) => resolved.section.advanced)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 sm:px-6"
    >
      <header className="mb-6 text-center">
        <div
          className="font-display text-6xl leading-none text-[var(--text-primary)]"
          style={{ textShadow: '0 0 34px var(--accent-glow)' }}
        >
          {script.nativeName}
        </div>
        <h1 className="mt-3 font-display text-xl font-semibold text-[var(--text-primary)]">
          {script.displayName}
        </h1>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
          {localizeScriptText(script.tagline, locale)}
        </p>
        {seenCount > 0 && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {t('scriptlab.seen', { count: seenCount, total })}
          </p>
        )}
      </header>

      <div className="mb-6 flex justify-center">
        <div
          role="tablist"
          className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--surface-glass)] p-1"
        >
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30',
                tab === item.key
                  ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              )}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {tab === 'learn' && (
        <div className="space-y-8">
          <div className="pg-glass space-y-3 rounded-2xl p-5">
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
              {t('scriptlab.howItWorks')}
            </h2>
            {script.intro.map((paragraph) => (
              <p key={paragraph.en} className="text-sm leading-relaxed text-[var(--text-secondary)]">
                {localizeScriptText(paragraph, locale)}
              </p>
            ))}
          </div>

          {resolvedSections.map((resolved, index) =>
            resolved.section.advanced ? null : (
              <SymbolGrid
                key={resolved.section.id}
                section={resolved.section}
                symbols={resolved.symbols}
                locale={locale}
                seenSymbolIds={seen}
                onSelect={(symbol) =>
                  setDetail({ sectionIndex: index, symbolIndex: resolved.symbols.indexOf(symbol) })
                }
              />
            ),
          )}

          {hasAdvanced && (
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--border-subtle)]" />
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                {t('scriptlab.advanced')}
              </span>
              <span className="h-px flex-1 bg-[var(--border-subtle)]" />
            </div>
          )}

          {resolvedSections.map((resolved, index) =>
            resolved.section.advanced ? (
              <SymbolGrid
                key={resolved.section.id}
                section={resolved.section}
                symbols={resolved.symbols}
                locale={locale}
                seenSymbolIds={seen}
                onSelect={(symbol) =>
                  setDetail({ sectionIndex: index, symbolIndex: resolved.symbols.indexOf(symbol) })
                }
              />
            ) : null,
          )}
        </div>
      )}

      {tab === 'build' && script.composition && <BuildMode key={script.id} script={script} />}

      {tab === 'quiz' && <QuizMode key={script.id} script={script} />}

      <SymbolDetailPanel
        script={script}
        symbols={detail ? resolvedSections[detail.sectionIndex]?.symbols ?? [] : []}
        activeIndex={detail ? detail.symbolIndex : null}
        locale={locale}
        onNavigate={navigateDetail}
        onClose={closeDetail}
        onSeen={handleSeen}
      />
    </motion.div>
  )
}
