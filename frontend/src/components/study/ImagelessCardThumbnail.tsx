import { getCardFontClass, getCardFontStack } from '@/lib/typography/cardFonts'
import { cn } from '@/lib/utils'

interface ImagelessCardThumbnailProps {
  word: string
  translation: string
  ipa: string | null
  targetLanguage: string
  className?: string
}

export function ImagelessCardThumbnail({
  word,
  translation,
  targetLanguage,
  className,
}: ImagelessCardThumbnailProps) {
  const isPhrase = /\s/.test(word.trim())
  const cleanTranslation = translation.trim()

  return (
    <div className={cn('aspect-video relative bg-card', className)}>
      <div className="flex h-full w-full items-center justify-center bg-black px-4 py-4 text-center text-white">
        <div className="flex max-h-full w-full max-w-[92%] flex-col items-center justify-center gap-1.5">
          <h2
            className={cn(
              'w-full line-clamp-3 text-balance font-semibold leading-tight text-white',
              isPhrase ? 'text-[clamp(1rem,2.8vw,1.65rem)]' : 'text-[clamp(1.25rem,3.6vw,2.15rem)]',
              getCardFontClass(targetLanguage),
            )}
            style={{ fontFamily: getCardFontStack(targetLanguage) }}
          >
            {word}
          </h2>
          {cleanTranslation ? (
            <p className="w-full line-clamp-2 text-balance text-center leading-snug text-white/65 text-[clamp(0.78rem,2vw,1rem)]">
              {cleanTranslation}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default ImagelessCardThumbnail
