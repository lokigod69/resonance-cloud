import { useState } from 'react'
import { Info } from 'lucide-react'
import StarRating from '@/components/ui/StarRating'

interface WordInfoPanelProps {
  word: {
    id: string
    word: string
    translation: string | null
    mnemonic?: string | null
    etymology?: string | null
    pos?: string | null
    article?: string | null
    rating?: number | null
    word_slug?: string | null
    metadata?: {
      creative_direction?: string
      art_style?: string
      music_caption?: string
    } | null
  }
  onRate: (wordId: string, rating: number) => void
}

const hasMetadata = (word: WordInfoPanelProps['word']) =>
  word.etymology ||
  word.pos ||
  word.metadata?.creative_direction ||
  word.metadata?.art_style ||
  word.metadata?.music_caption

export default function WordInfoPanel({ word, onRate }: WordInfoPanelProps) {
  const [showMetadata, setShowMetadata] = useState(false)

  return (
    <div className="text-center space-y-3 relative">
      {/* Info toggle */}
      {hasMetadata(word) && (
        <button
          onClick={() => setShowMetadata(!showMetadata)}
          className="absolute top-0 right-0 w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <Info size={14} />
        </button>
      )}

      {/* Always visible */}
      <h1 className="text-4xl font-bold">{word.word}</h1>
      {word.translation && (
        <p className="text-xl text-muted-foreground">{word.translation}</p>
      )}
      {word.mnemonic && (
        <p className="text-sm text-muted-foreground/70 max-w-2xl mx-auto italic">
          {word.mnemonic}
        </p>
      )}

      {/* Star rating */}
      <div className="flex justify-center">
        <StarRating rating={word.rating ?? null} onChange={(r) => onRate(word.id, r)} />
      </div>

      {/* Expandable metadata */}
      {showMetadata && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-3 text-sm max-w-2xl mx-auto">
          {word.etymology && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 shrink-0">Etymology</span>
              <span className="text-gray-300 text-right">{word.etymology}</span>
            </div>
          )}
          {word.pos && (
            <div className="flex justify-between">
              <span className="text-gray-500">Part of Speech</span>
              <span className="text-gray-300">
                {word.pos}
                {word.article ? ` \u00b7 ${word.article}` : ''}
              </span>
            </div>
          )}
          {word.metadata?.creative_direction && (
            <div className="flex justify-between">
              <span className="text-gray-500">Creative Direction</span>
              <span className="text-teal-400 capitalize">
                {word.metadata.creative_direction}
              </span>
            </div>
          )}
          {word.metadata?.art_style && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 shrink-0">Art Style</span>
              <span className="text-gray-300 text-right truncate max-w-[280px]" title={word.metadata.art_style}>
                {word.metadata.art_style}
              </span>
            </div>
          )}
          {word.metadata?.music_caption && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 shrink-0">Music</span>
              <span className="text-gray-300 text-right">
                {word.metadata.music_caption.split(',')[0]}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
