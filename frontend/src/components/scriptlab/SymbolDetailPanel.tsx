import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ScriptDefinition, ScriptSymbol } from '@/lib/scriptlab/types'
import { localizeScriptText } from '@/lib/scriptlab/types'
import { markSymbolSeen } from '@/lib/scriptlab/progress'
import { useTranslation } from '@/hooks/useTranslation'
import { ScriptAudioButton } from './ScriptAudioButton'

type SymbolDetailPanelProps = {
  script: Pick<ScriptDefinition, 'id' | 'speechLang'>
  symbols: ScriptSymbol[]
  activeIndex: number | null
  locale: string
  onNavigate: (index: number) => void
  onClose: () => void
  onSeen?: (symbolId: string) => void
}

export function SymbolDetailPanel({
  script,
  symbols,
  activeIndex,
  locale,
  onNavigate,
  onClose,
  onSeen,
}: SymbolDetailPanelProps) {
  const { t } = useTranslation()
  const symbol = activeIndex !== null ? symbols[activeIndex] ?? null : null
  const symbolId = symbol?.id ?? null
  const open = symbol !== null
  const panelRef = useRef<HTMLDivElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!symbolId) return
    markSymbolSeen(script.id, symbolId)
    onSeen?.(symbolId)
  }, [symbolId, script.id, onSeen])

  // Modal contract: move focus into the sheet on open, keep Tab inside it,
  // lock the page scroll behind it, and put focus back where it was on close.
  useEffect(() => {
    if (!open) return
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      restoreFocusRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      const inside = active instanceof HTMLElement && panelRef.current.contains(active)
      if (event.shiftKey ? active === first || !inside : active === last || !inside) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const canPrev = activeIndex !== null && activeIndex > 0
  const canNext = activeIndex !== null && activeIndex < symbols.length - 1
  const syllableSpec = symbol?.exampleSyllableAudio ?? symbol?.audio

  return (
    <AnimatePresence>
      {symbol && activeIndex !== null && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={symbol.name ? `${symbol.character} ${symbol.name}` : symbol.character}
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 48 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md rounded-t-3xl border border-[var(--border-subtle)] bg-[var(--surface-glass-strong)] p-6 pb-8 shadow-2xl backdrop-blur-xl md:rounded-3xl"
          >
            <div
              aria-hidden="true"
              className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border-subtle)] md:hidden"
            />

            <div className="flex items-stretch gap-2">
              <NavButton
                direction="prev"
                label={t('scriptlab.prev')}
                target={canPrev ? symbols[activeIndex - 1] : null}
                onClick={() => canPrev && onNavigate(activeIndex - 1)}
              />

              <div className="relative flex flex-1 flex-col items-center text-center">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40"
                  style={{ background: 'radial-gradient(circle at 50% 40%, var(--accent-glow), transparent 62%)' }}
                />
                <span
                  className="font-display text-7xl leading-none text-[var(--text-primary)] md:text-8xl"
                  style={{ textShadow: '0 0 32px var(--accent-glow)' }}
                >
                  {symbol.character}
                </span>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-glass)] px-3 py-1 text-sm font-medium text-[var(--text-primary)]">
                    {symbol.romanization}
                  </span>
                </div>
                {symbol.name && (
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    <span className="text-[var(--text-muted)]">{t('scriptlab.letterName')}: </span>
                    {symbol.name}
                  </p>
                )}
                {symbol.ipa && <p className="mt-1 text-xs text-[var(--text-muted)]">{symbol.ipa}</p>}

                <div className="mt-4">
                  <ScriptAudioButton script={script} spec={symbol.audio} size="lg" />
                </div>
              </div>

              <NavButton
                direction="next"
                label={t('scriptlab.next')}
                target={canNext ? symbols[activeIndex + 1] : null}
                onClick={() => canNext && onNavigate(activeIndex + 1)}
              />
            </div>

            <p className="mt-5 text-center text-[15px] leading-relaxed text-[var(--text-secondary)]">
              {localizeScriptText(symbol.pronunciationNote, locale)}
            </p>

            <div className="pg-glass mt-5 divide-y divide-[var(--border-subtle)] rounded-2xl">
              {symbol.exampleSyllable && syllableSpec && (
                <ExampleRow
                  label={t('scriptlab.exampleSyllable')}
                  text={symbol.exampleSyllable}
                  romanization={symbol.exampleSyllableRomanization}
                >
                  <ScriptAudioButton script={script} spec={syllableSpec} size="sm" />
                </ExampleRow>
              )}
              <ExampleRow
                label={t('scriptlab.exampleWord')}
                text={symbol.exampleWord.word}
                romanization={symbol.exampleWord.romanization}
                meaning={localizeScriptText(symbol.exampleWord.meaning, locale)}
              >
                <ScriptAudioButton script={script} spec={symbol.exampleWord.audio} size="sm" />
              </ExampleRow>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

type NavButtonProps = {
  direction: 'prev' | 'next'
  label: string
  target: ScriptSymbol | null
  onClick: () => void
}

function NavButton({ direction, label, target, onClick }: NavButtonProps) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!target}
      aria-label={target ? `${label}: ${target.character} ${target.romanization}` : label}
      className="flex w-11 flex-shrink-0 items-center justify-center rounded-2xl text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-25"
    >
      <Icon size={22} aria-hidden="true" />
    </button>
  )
}

type ExampleRowProps = {
  label: string
  text: string
  romanization?: string
  meaning?: string
  children: React.ReactNode
}

function ExampleRow({ label, text, romanization, meaning, children }: ExampleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="font-display text-2xl text-[var(--text-primary)]">{text}</span>
          {romanization && <span className="text-sm text-[var(--text-muted)]">{romanization}</span>}
        </div>
        {meaning && <div className="mt-0.5 text-sm text-[var(--text-secondary)]">{meaning}</div>}
      </div>
      {children}
    </div>
  )
}
