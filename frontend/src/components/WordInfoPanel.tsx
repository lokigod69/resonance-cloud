import { useState } from 'react'
import { Info } from 'lucide-react'
import StarRating from '@/components/ui/StarRating'
import { resolveCardLearningMetadata, type WordLike } from '@/lib/wordDisplayMetadata'
import { useTranslation } from '@/hooks/useTranslation'

/** Truncate art style at first ' — ' or ',' for clean row display */
function formatArtStyle(value: string): string {
  const dashIdx = value.indexOf(' — ');
  const commaIdx = value.indexOf(',');
  const cutPoints = [dashIdx, commaIdx].filter(i => i > 0);
  const cutIdx = cutPoints.length ? Math.min(...cutPoints) : -1;
  return cutIdx > 0 ? value.slice(0, cutIdx) : value;
}

interface WordInfoPanelProps {
  word: WordLike & {
    id: string
    word: string
    translation: string | null
    ipa?: string | null
    rating?: number | null
    word_slug?: string | null
  }
  onRate: (wordId: string, rating: number) => void
}

export default function WordInfoPanel({ word, onRate }: WordInfoPanelProps) {
  const { t } = useTranslation()
  const [showMetadata, setShowMetadata] = useState(false)
  const learning = resolveCardLearningMetadata(word)
  const ipa = typeof word.ipa === 'string' ? word.ipa.trim() : ''
  const displayedTranslation = word.translation || learning.translation
  const videoMeta = (word.metadata && typeof word.metadata === 'object' && !Array.isArray(word.metadata))
    ? (word.metadata as { creative_direction?: string; art_style?: string; music_caption?: string })
    : null

  const hasExpandable =
    !!learning.etymology
    || !!learning.partOfSpeech
    || !!learning.pronunciation
    || !!learning.usageExample
    || !!learning.collocations?.length
    || !!learning.usageNote
    || !!learning.commonMistake
    || !!learning.memoryCue
    || !!learning.footerTakeaway
    || !!learning.templateLabel
    || !!videoMeta?.creative_direction
    || !!videoMeta?.art_style
    || !!videoMeta?.music_caption

  return (
    <div className="text-center space-y-3 relative">
      {hasExpandable && (
        <button
          onClick={() => setShowMetadata(!showMetadata)}
          className="absolute top-0 right-0 w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          aria-label="Toggle word details"
        >
          <Info size={14} />
        </button>
      )}

      <h1 className="text-4xl font-bold long-copy">{word.word}</h1>
      {ipa && (
        <p className="text-sm text-muted-foreground/60 font-mono long-copy">
          /{ipa.replace(/^\/|\/$/g, '')}/
        </p>
      )}
      {displayedTranslation && (
        <p className="text-xl text-muted-foreground long-copy">{displayedTranslation}</p>
      )}
      {learning.mnemonic && !learning.isInfographic && (
        <p className="text-sm text-muted-foreground/70 max-w-2xl mx-auto italic long-copy">
          {learning.mnemonic}
        </p>
      )}

      <div className="flex justify-center">
        <StarRating rating={word.rating ?? null} onChange={(r) => onRate(word.id, r)} />
      </div>

      {showMetadata && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 text-sm max-w-2xl mx-auto text-left">
          {learning.usageExample && (
            <div className="space-y-1">
              <p className="text-gray-500">{t('deckview.example')}</p>
              {learning.usageExample.target && (
                <p className="text-gray-300 long-copy">{learning.usageExample.target}</p>
              )}
              {learning.usageExample.base && (
                <p className="text-gray-400 italic long-copy">{learning.usageExample.base}</p>
              )}
            </div>
          )}
          {learning.collocations?.length ? (
            <div className="space-y-1">
              <p className="text-gray-500">Collocations</p>
              <p className="text-gray-300 long-copy">{learning.collocations.join(', ')}</p>
            </div>
          ) : null}
          {learning.usageNote && (
            <div className="space-y-1">
              <p className="text-gray-500">Usage Note</p>
              <p className="text-gray-300 long-copy">{learning.usageNote}</p>
            </div>
          )}
          {learning.etymology && (
            <div className="space-y-1">
              <p className="text-gray-500">{t('deckview.etymology')}</p>
              <p className="text-gray-300 long-copy">{learning.etymology}</p>
            </div>
          )}
          {learning.commonMistake && (
            <div className="space-y-1">
              <p className="text-gray-500">Common Mistake</p>
              <p className="text-gray-300 long-copy">{learning.commonMistake}</p>
            </div>
          )}
          {learning.memoryCue && (
            <div className="space-y-1">
              <p className="text-gray-500">Memory Cue</p>
              <p className="text-gray-300 long-copy">{learning.memoryCue}</p>
            </div>
          )}
          {learning.footerTakeaway && (
            <div className="space-y-1">
              <p className="text-gray-500">Takeaway</p>
              <p className="text-gray-300 long-copy">{learning.footerTakeaway}</p>
            </div>
          )}
          {learning.partOfSpeech && (
            <div className="space-y-1">
              <p className="text-gray-500">{t('deckview.partOfSpeech')}</p>
              <p className="text-gray-300">
                {learning.partOfSpeech}
                {learning.article ? ` · ${learning.article}` : ''}
              </p>
            </div>
          )}
          {learning.pronunciation && (
            <div className="space-y-1">
              <p className="text-gray-500">Pronunciation</p>
              <p className="text-gray-300 long-copy">{learning.pronunciation}</p>
            </div>
          )}
          {learning.templateLabel && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 shrink-0">Template / Style</span>
              <span className="text-gray-300 text-right long-copy">{learning.templateLabel}</span>
            </div>
          )}
          {videoMeta?.creative_direction && (
            <div className="flex justify-between">
              <span className="text-gray-500">Creative Direction</span>
              <span className="text-teal-400 capitalize long-copy">
                {videoMeta.creative_direction}
              </span>
            </div>
          )}
          {videoMeta?.art_style && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 shrink-0">Art Style</span>
              <span className="text-gray-300 text-right max-w-[280px] long-copy" title={videoMeta.art_style}>
                {formatArtStyle(videoMeta.art_style)}
              </span>
            </div>
          )}
          {videoMeta?.music_caption && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 shrink-0">Music</span>
              <span className="text-gray-300 text-right long-copy">
                {videoMeta.music_caption.split(',')[0]}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
