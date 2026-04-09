import { useMemo, useState } from 'react'
import { Play } from 'lucide-react'
import type { LibraryWord } from './WordDetailModal'

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
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {(['all', 'words', 'phrases'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 min-h-[36px] text-xs rounded-full border transition-colors capitalize ${
                filter === f
                  ? 'bg-white/15 border-white/30 text-white'
                  : 'border-white/10 text-white/55 hover:text-white/80 hover:border-white/20'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {([
            ['recent', 'Recent'],
            ['az', 'A–Z'],
            ['za', 'Z–A'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setSort(value)}
              className={`px-3 py-2 min-h-[36px] text-xs rounded-full border transition-colors ${
                sort === value
                  ? 'bg-white/15 border-white/30 text-white'
                  : 'border-white/10 text-white/55 hover:text-white/80 hover:border-white/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="text-center py-12 text-white/50 text-sm">
          {emptyMessage ?? 'No words to show.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {visible.map((word) => (
            <button
              key={word.id}
              onClick={() => onWordClick(word)}
              className="relative text-left p-3 min-h-[64px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 transition-all group overflow-hidden"
            >
              {word.video_url && (
                <span
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/40 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity"
                  aria-label="Has video"
                >
                  <Play size={10} className="text-white translate-x-[1px]" />
                </span>
              )}
              <div className="text-sm font-medium text-white break-words pr-6 leading-tight">
                {word.article ? `${word.article} ` : ''}
                {word.word}
              </div>
              {word.translation && (
                <div className="text-xs text-white/55 truncate mt-1">{word.translation}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
