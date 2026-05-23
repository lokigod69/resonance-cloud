import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import { wordsEqual } from '@/lib/wordEquality'
import type { SelectedCategoryVocabularyItem } from '@/data/categories'

interface GlassInputProps {
  onLock: (word: string) => void
  autoFocus?: boolean
  placeholder?: string
  disabled?: boolean
}

export interface GlassInputHandle {
  /** Flush any typed-but-unlocked text. Returns the flushed word, or null if input was empty. */
  flush: () => string | null
}

export const GlassInput = forwardRef<GlassInputHandle, GlassInputProps>(
function GlassInput({ onLock, autoFocus, placeholder, disabled }: GlassInputProps, ref) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const hasValue = value.trim().length > 0

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed) return null
    onLock(trimmed)
    setValue('')
    return trimmed
  }

  useImperativeHandle(ref, () => ({ flush: handleSubmit }))

  const addLabel = t('generate.words.addWordAriaLabel')

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="flex w-full min-w-0 items-center gap-2"
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit()
          }
        }}
        placeholder={placeholder ?? t('generate.words.manualPlaceholder')}
        disabled={disabled}
        className={cn(
          'flex-1 rounded-xl px-4 py-3 text-sm text-foreground/90 placeholder:text-muted-foreground',
          'min-w-0',
          'bg-card backdrop-blur-md border border-border',
          'outline-none transition-all duration-200',
          'focus:border-accent focus:bg-card',
          disabled && 'opacity-40 pointer-events-none'
        )}
      />
      <motion.button
        type="button"
        onClick={handleSubmit}
        aria-label={addLabel}
        title={addLabel}
        whileHover={hasValue ? { scale: 1.08 } : undefined}
        whileTap={hasValue ? { scale: 0.95 } : undefined}
        disabled={!hasValue || disabled}
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
          'border-2 transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          hasValue && !disabled
            ? 'bg-[#4ade80]/20 border-[#4ade80]/60 text-[#4ade80] shadow-[0_0_18px_rgba(74,222,128,0.35)] hover:bg-[#4ade80]/30 hover:border-[#4ade80]/80'
            : 'glass border-border text-muted-foreground',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none'
        )}
      >
        <Plus className="h-5 w-5" strokeWidth={2.6} />
      </motion.button>
    </motion.div>
  )
})

interface LockedWordProps {
  word: string
  helperTerm?: string
  onRemove: () => void
}

export function LockedWord({ word, helperTerm, onRemove }: LockedWordProps) {
  const showHelper = helperTerm && !wordsEqual(helperTerm, word)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-2',
        'max-w-full min-w-0',
        'bg-[#4ade80]/10 backdrop-blur-md',
        'border border-[#4ade80]/30',
        'shadow-[0_0_12px_oklch(0.7_0.18_145_/_0.1)]'
      )}
      aria-label={showHelper ? `${word} / ${helperTerm}` : word}
    >
      <Check className="h-3.5 w-3.5 text-[#4ade80]" />
      <span className="min-w-0 break-words [hyphens:auto] text-sm text-foreground/90">
        {word}
        {showHelper && (
          <span className="text-muted-foreground/85">
            {' / '}
            {helperTerm}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </motion.div>
  )
}

interface WordChipsProps {
  words: string[]
  vocabularyItems?: SelectedCategoryVocabularyItem[]
  onRemove: (index: number) => void
}

export function WordChips({ words, vocabularyItems = [], onRemove }: WordChipsProps) {
  return (
    <div className="flex w-full min-w-0 flex-wrap justify-center gap-2">
      <AnimatePresence mode="popLayout">
        {words.map((word, i) => {
          const vocabularyItem = vocabularyItems.find((item) => wordsEqual(item.targetTerm, word))
          return (
            <LockedWord
              key={word}
              word={word}
              helperTerm={vocabularyItem?.helperTerm}
              onRemove={() => onRemove(i)}
            />
          )
        })}
      </AnimatePresence>
    </div>
  )
}
