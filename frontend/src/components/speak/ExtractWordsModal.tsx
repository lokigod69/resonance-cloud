import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { WordChips } from '@/components/generate/shared/GlassInput'
import { LingwaveLoader } from '@/components/ui/LingwaveLoader'
import { useExtractVocabulary, type ExtractVocabularyItem } from '@/hooks/useExtractVocabulary'
import { useSubmitImagelessImport } from '@/hooks/useSubmitImagelessImport'
import { useTranslation } from '@/hooks/useTranslation'
import { canonicalizeLanguageValue } from '@/lib/languages'

interface ExtractWordsModalProps {
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
  conversationId?: string
  targetLanguage: string
  baseLanguage: string
  defaultDeckName: string
  onClose: () => void
  onImported: (deckId: string) => void
}

export function ExtractWordsModal({
  messages,
  conversationId,
  targetLanguage,
  baseLanguage,
  defaultDeckName,
  onClose,
  onImported,
}: ExtractWordsModalProps) {
  const { t } = useTranslation()
  const { extractVocabulary, loading, error } = useExtractVocabulary()
  const { submitImagelessImport, submitting, error: importError } = useSubmitImagelessImport()
  const [items, setItems] = useState<ExtractVocabularyItem[]>([])
  const [deckName, setDeckName] = useState(defaultDeckName)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [retryToken, setRetryToken] = useState(0)
  const importInFlightRef = useRef(false)

  const words = useMemo(() => items.map((item) => item.word), [items])
  const details = useMemo(
    () => items.map((item) => ({ translation: item.translation, ipa: item.ipa })),
    [items],
  )

  useEffect(() => {
    let cancelled = false
    setHasLoaded(false)
    void (async () => {
      try {
        const extracted = await extractVocabulary({
          messages,
          conversation_id: conversationId,
          target_language: targetLanguage,
          base_language: baseLanguage,
          max_items: 10,
          include_words: true,
          include_phrases: true,
        })
        if (!cancelled) setItems(extracted)
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setHasLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [baseLanguage, conversationId, extractVocabulary, messages, retryToken, targetLanguage])

  async function handleImport() {
    if (items.length === 0 || submitting || importInFlightRef.current) return
    importInFlightRef.current = true
    try {
      const targetLanguageValue = canonicalizeLanguageValue(targetLanguage)
      const baseLanguageValue = canonicalizeLanguageValue(baseLanguage)
      const deckId = await submitImagelessImport({
        deckName: deckName.trim() || defaultDeckName,
        targetLanguage: targetLanguageValue,
        baseLanguage: baseLanguageValue,
        origin: 'tutor_extraction',
        items,
      })
      onImported(deckId)
    } catch {
      importInFlightRef.current = false
      // Error state is surfaced by useSubmitImagelessImport.
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-gray-950 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">{t('speak.extractWords.title')}</h2>
            <p className="text-xs text-gray-500">{targetLanguage} {'->'} {baseLanguage}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
            aria-label={t('speak.extractWords.cancelButton')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
          {(loading || !hasLoaded) && (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-sm text-gray-400">
              <LingwaveLoader size={64} className="py-0" />
              {t('speak.extractWords.loading')}
            </div>
          )}

          {hasLoaded && error && (
            <div className="flex min-h-48 flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-red-300">{t('speak.extractWords.error')}</p>
              <button
                type="button"
                onClick={() => setRetryToken((value) => value + 1)}
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-gray-200 transition-colors hover:bg-white/5"
              >
                {t('speak.extractWords.retry')}
              </button>
            </div>
          )}

          {hasLoaded && !error && (
            <div className="space-y-5">
              {items.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-gray-400">
                  {t('speak.extractWords.empty')}
                </p>
              ) : (
                <WordChips
                  words={words}
                  details={details}
                  onRemove={(index) => setItems((prev) => prev.filter((_, i) => i !== index))}
                />
              )}

              <label className="block space-y-2">
                <span className="text-xs font-medium text-gray-400">{t('speak.extractWords.deckNamePlaceholder')}</span>
                <input
                  value={deckName}
                  onChange={(event) => setDeckName(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-cyan-400/60"
                  placeholder={t('speak.extractWords.deckNamePlaceholder')}
                />
              </label>

              {importError && (
                <p className="rounded-lg border border-red-500/20 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                  {importError}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/5"
          >
            {t('speak.extractWords.cancelButton')}
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={items.length === 0 || submitting || loading || !!error}
            className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-gray-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? t('common.loading')
              : t('speak.extractWords.importButton', { count: items.length })}
          </button>
        </div>
      </div>
    </div>
  )
}
