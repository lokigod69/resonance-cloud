import { useMemo, useState } from 'react'
import type { LibraryWord } from './WordDetailModal'
import { getDisplayArticle } from './articleDisplay'
import { useTranslation } from '@/hooks/useTranslation'

type SortMode = 'recent' | 'az' | 'za'
type FilterMode = 'all' | 'words' | 'phrases'

interface WordLibraryProps {
  words: LibraryWord[]
  onWordClick: (word: LibraryWord) => void
  emptyMessage?: string
}

// TODO: whitespace detection doesn't work for CJK/Arabic — add is_phrase column later
function isPhrase(word: LibraryWord): boolean {
  return word.word.trim().includes(' ')
}

export default function WordLibrary({ words, onWordClick, emptyMessage }: WordLibraryProps) {
  const { t } = useTranslation()
  const [sort, setSort] = useState<SortMode>('recent')
  const [filter, setFilter] = useState<FilterMode>('all')

  const visible = useMemo(() => {
    let result = words
    if (filter === 'words') result = result.filter((w) => !isPhrase(w))
    else if (filter === 'phrases') result = result.filter(isPhrase)

    if (sort === 'az') {
      result = [...result].sort((a, b) => a.word.localeCompare(b.word))
    } else if (sort === 'za') {
      result = [...result].sort((a, b) => b.word.localeCompare(a.word))
    } else {
      result = [...result].sort(
        (a, b) =>
          (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0)
      )
    }
    return result
  }, [words, sort, filter])

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex gap-1 overflow-x-auto scrollbar-none min-w-0">
          {([['all', t('wordLibrary.all')], ['words', t('wordLibrary.words')], ['phrases', t('wordLibrary.phrases')]] as const).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 min-h-[36px] shrink-0 text-xs rounded-full border transition-colors ${
                filter === f
                  ? 'theme-chip-active'
                  : 'theme-chip'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-none min-w-0 justify-end">
          {([
            ['recent', t('wordLibrary.recent')],
            ['az', t('wordLibrary.az')],
            ['za', t('wordLibrary.za')],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setSort(value)}
              className={`px-3 py-2 min-h-[36px] shrink-0 text-xs rounded-full border transition-colors ${
                sort === value
                  ? 'theme-chip-active'
                  : 'theme-chip'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="text-center py-12 text-foreground/50 text-sm">
          {emptyMessage ?? t('wordLibrary.noWords')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visible.map((word) => {
            const displayArticle = getDisplayArticle(word)
            return (
              <button
                key={word.id}
                onClick={() => onWordClick(word)}
                className="theme-card min-h-[64px] rounded-xl hover:bg-[var(--surface-glass-strong)] px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer text-left"
              >
                {word.thumbnail_url ? (
                  <img
                    src={word.thumbnail_url}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted/30 flex-shrink-0" />
                )}
                <span className="font-semibold text-base flex-1 min-w-0 break-words">
                  {displayArticle ? `${displayArticle} ` : ''}
                  {word.word}
                </span>
                {word.translation && (
                  <span className="text-sm text-muted-foreground flex-shrink-0 max-w-[45%] text-right break-words">
                    {word.translation}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
