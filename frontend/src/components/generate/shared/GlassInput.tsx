import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="flex items-center gap-2"
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
        placeholder={placeholder ?? 'Type a word and press Enter'}
        disabled={disabled}
        className={cn(
          'flex-1 rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/30',
          'bg-white/[0.04] backdrop-blur-md border border-white/[0.06]',
          'outline-none transition-all duration-200',
          'focus:border-white/20 focus:bg-white/[0.06]',
          disabled && 'opacity-40 pointer-events-none'
        )}
      />
      <motion.button
        type="button"
        onClick={handleSubmit}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        disabled={!value.trim() || disabled}
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full',
          'glass border border-white/10 text-white/50',
          'hover:text-white/80 hover:border-white/20 transition-colors',
          'disabled:opacity-30 disabled:pointer-events-none'
        )}
      >
        <Plus className="h-4 w-4" />
      </motion.button>
    </motion.div>
  )
})

interface LockedWordProps {
  word: string
  onRemove: () => void
}

export function LockedWord({ word, onRemove }: LockedWordProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-2',
        'bg-white/[0.08] backdrop-blur-md',
        'border border-[#4ade80]/30',
        'shadow-[0_0_12px_oklch(0.7_0.18_145_/_0.1)]'
      )}
    >
      <Check className="h-3.5 w-3.5 text-[#4ade80]" />
      <span className="text-sm text-white/90">{word}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 text-white/30 hover:text-red-400 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </motion.div>
  )
}

interface WordChipsProps {
  words: string[]
  onRemove: (index: number) => void
}

export function WordChips({ words, onRemove }: WordChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <AnimatePresence mode="popLayout">
        {words.map((word, i) => (
          <LockedWord key={word} word={word} onRemove={() => onRemove(i)} />
        ))}
      </AnimatePresence>
    </div>
  )
}
