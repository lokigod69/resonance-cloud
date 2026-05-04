import { useEffect } from 'react'
import { X, Play } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getDisplayArticle } from './articleDisplay'
import GeneratedMediaFrame from '@/components/media/GeneratedMediaFrame'

export type LibraryWord = {
  id: string
  word: string
  word_slug: string | null
  translation: string | null
  mnemonic: string | null
  etymology: string | null
  pos: string | null
  article: string | null
  video_url: string | null
  thumbnail_url: string | null
  metadata: Record<string, unknown> | null
  deck_id: string
  target_language: string | null
  created_at: string
}

interface WordDetailModalProps {
  word: LibraryWord | null
  onClose: () => void
  onWatchVideo: (word: LibraryWord) => void
  deckName?: string
}

function metaString(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!metadata) return null
  const value = metadata[key]
  if (typeof value === 'string' && value.trim()) return value
  return null
}

function metaArray(metadata: Record<string, unknown> | null | undefined, key: string): string[] | null {
  if (!metadata) return null
  const value = metadata[key]
  if (Array.isArray(value)) {
    const filtered = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    return filtered.length > 0 ? filtered : null
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return null
}

export default function WordDetailModal({ word, onClose, onWatchVideo, deckName }: WordDetailModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <AnimatePresence>
      {word && (
        <motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="pg-glass rounded-t-2xl sm:rounded-2xl w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto relative"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="sticky top-3 ml-auto mr-3 mt-3 w-11 h-11 flex items-center justify-center rounded-full bg-black/45 border border-white/10 text-foreground/80 hover:text-foreground hover:bg-black/60 transition-colors z-20"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <WordDetailBody word={word} onWatchVideo={onWatchVideo} deckName={deckName} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function WordDetailBody({ word, onWatchVideo, deckName }: { word: LibraryWord; onWatchVideo: (w: LibraryWord) => void; deckName?: string }) {
  const ipa = metaString(word.metadata, 'ipa')
  const example = metaString(word.metadata, 'example')
  const exampleGloss = metaString(word.metadata, 'example_gloss') ?? metaString(word.metadata, 'example_translation')
  const synonyms = metaArray(word.metadata, 'synonyms')
  const tags = metaArray(word.metadata, 'tags')

  const displayArticle = getDisplayArticle(word)
  const displayWord = displayArticle ? `${displayArticle} ${word.word}` : word.word

  return (
    <div className="p-5 pt-1 sm:p-7 sm:pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] space-y-4 text-foreground">
      {word.thumbnail_url && (
        <GeneratedMediaFrame
          src={word.thumbnail_url}
          alt={word.word}
          variant="detail"
          className="mb-4 max-h-[min(58vh,34rem)]"
        />
      )}
      {/* Headline */}
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight long-copy">{displayWord}</h2>
        {ipa && <p className="text-sm text-foreground/45 font-mono long-copy">/{ipa.replace(/^\/|\/$/g, '')}/</p>}
        {word.translation && <p className="text-lg text-foreground/75 long-copy">{word.translation}</p>}
        {word.pos && (
          <span className="inline-block mt-1 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full bg-foreground/10 text-foreground/70 border border-foreground/15">
            {word.pos}
          </span>
        )}
        {deckName && (
          <p className="text-xs text-foreground/40 mt-1">
            From: <span className="font-medium text-foreground/60 long-copy">{deckName}</span>
          </p>
        )}
      </div>

      {(word.mnemonic || word.etymology || example) && (
        <div className="h-px bg-foreground/10" />
      )}

      {word.mnemonic && (
        <section>
          <h3 className="text-[11px] uppercase tracking-wider text-foreground/40 mb-1">Mnemonic</h3>
          <p className="text-sm text-foreground/85 leading-relaxed long-copy">{word.mnemonic}</p>
        </section>
      )}

      {word.etymology && (
        <section>
          <h3 className="text-[11px] uppercase tracking-wider text-foreground/40 mb-1">Etymology</h3>
          <p className="text-sm text-foreground/85 leading-relaxed long-copy">{word.etymology}</p>
        </section>
      )}

      {example && (
        <section>
          <h3 className="text-[11px] uppercase tracking-wider text-foreground/40 mb-1">Example</h3>
          <p className="text-sm text-foreground/85 leading-relaxed italic long-copy">"{example}"</p>
          {exampleGloss && <p className="text-xs text-foreground/50 mt-1 long-copy">{exampleGloss}</p>}
        </section>
      )}

      {synonyms && synonyms.length > 0 && (
        <section>
          <h3 className="text-[11px] uppercase tracking-wider text-foreground/40 mb-1">Synonyms</h3>
          <p className="text-sm text-foreground/75 long-copy">{synonyms.join(', ')}</p>
        </section>
      )}

      {tags && tags.length > 0 && (
        <section>
          <h3 className="text-[11px] uppercase tracking-wider text-foreground/40 mb-2">Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[11px] rounded-full bg-foreground/8 text-foreground/70 border border-foreground/10 long-copy"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {word.video_url && (
        <>
          <div className="h-px bg-foreground/10" />
          <button
            onClick={() => onWatchVideo(word)}
            className="w-full flex items-center justify-center gap-2 min-h-[48px] py-3 rounded-xl bg-foreground/10 hover:bg-foreground/15 border border-foreground/15 text-sm font-medium text-foreground transition-colors"
          >
            <Play size={16} />
            Watch Video
          </button>
        </>
      )}
    </div>
  )
}
