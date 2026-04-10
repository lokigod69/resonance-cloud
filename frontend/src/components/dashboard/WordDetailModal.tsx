import { useEffect } from 'react'
import { X, Play } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  created_at: string
}

interface WordDetailModalProps {
  word: LibraryWord | null
  onClose: () => void
  onWatchVideo: (word: LibraryWord) => void
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

export default function WordDetailModal({ word, onClose, onWatchVideo }: WordDetailModalProps) {
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
            className="pg-glass rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] overflow-y-auto relative"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors z-10"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <WordDetailBody word={word} onWatchVideo={onWatchVideo} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function WordDetailBody({ word, onWatchVideo }: { word: LibraryWord; onWatchVideo: (w: LibraryWord) => void }) {
  const ipa = metaString(word.metadata, 'ipa')
  const example = metaString(word.metadata, 'example')
  const exampleGloss = metaString(word.metadata, 'example_gloss') ?? metaString(word.metadata, 'example_translation')
  const synonyms = metaArray(word.metadata, 'synonyms')
  const tags = metaArray(word.metadata, 'tags')

  const displayWord = (word.article && word.article !== 'null') ? `${word.article} ${word.word}` : word.word

  return (
    <div className="p-5 pt-12 sm:p-7 sm:pt-10 pb-[env(safe-area-inset-bottom,1rem)] space-y-4 text-white">
      {word.thumbnail_url && (
        <div className="w-full h-48 rounded-xl overflow-hidden mb-4 -mt-2">
          <img src={word.thumbnail_url} alt={word.word} className="w-full h-full object-cover" />
        </div>
      )}
      {/* Headline */}
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight break-words">{displayWord}</h2>
        {ipa && <p className="text-sm text-white/45 font-mono">/{ipa.replace(/^\/|\/$/g, '')}/</p>}
        {word.translation && <p className="text-lg text-white/75">{word.translation}</p>}
        {word.pos && (
          <span className="inline-block mt-1 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full bg-white/10 text-white/70 border border-white/15">
            {word.pos}
          </span>
        )}
      </div>

      {(word.mnemonic || word.etymology || example) && (
        <div className="h-px bg-white/10" />
      )}

      {word.mnemonic && (
        <section>
          <h3 className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Mnemonic</h3>
          <p className="text-sm text-white/85 leading-relaxed">{word.mnemonic}</p>
        </section>
      )}

      {word.etymology && (
        <section>
          <h3 className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Etymology</h3>
          <p className="text-sm text-white/85 leading-relaxed">{word.etymology}</p>
        </section>
      )}

      {example && (
        <section>
          <h3 className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Example</h3>
          <p className="text-sm text-white/85 leading-relaxed italic">"{example}"</p>
          {exampleGloss && <p className="text-xs text-white/50 mt-1">{exampleGloss}</p>}
        </section>
      )}

      {synonyms && synonyms.length > 0 && (
        <section>
          <h3 className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Synonyms</h3>
          <p className="text-sm text-white/75">{synonyms.join(', ')}</p>
        </section>
      )}

      {tags && tags.length > 0 && (
        <section>
          <h3 className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[11px] rounded-full bg-white/8 text-white/70 border border-white/10"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {word.video_url && (
        <>
          <div className="h-px bg-white/10" />
          <button
            onClick={() => onWatchVideo(word)}
            className="w-full flex items-center justify-center gap-2 min-h-[48px] py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-medium text-white transition-colors"
          >
            <Play size={16} />
            Watch Video
          </button>
        </>
      )}
    </div>
  )
}
