import { cn } from '@/lib/utils'
import { getCardFontClass, getCardFontStack } from '@/lib/typography/cardFonts'

export interface ImagelessCardProps {
  word: string
  translation: string
  ipa: string | null
  revealed: boolean
  targetLanguage?: string
  className?: string
}

export function ImagelessCard({
  word,
  translation,
  revealed,
  targetLanguage = '',
  className,
}: ImagelessCardProps) {
  const isPhrase = /\s/.test(word.trim())
  const cleanTranslation = translation.trim()

  return (
    <div
      className={cn(
        'aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black',
        'flex items-center justify-center px-5 py-6 text-center text-white shadow-[0_18px_55px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      <div className="flex max-h-full w-full max-w-[88%] flex-col items-center justify-center gap-3">
        <h2
          className={cn(
            'w-full text-balance font-semibold leading-tight tracking-normal text-white',
            isPhrase
              ? 'text-[clamp(1.3rem,4.4vw,3.25rem)]'
              : 'text-[clamp(1.65rem,5.6vw,4.5rem)]',
            getCardFontClass(targetLanguage),
          )}
          style={{ fontFamily: getCardFontStack(targetLanguage) }}
        >
          {word}
        </h2>
        {revealed && cleanTranslation ? (
          <p className="w-full text-balance text-center leading-snug text-white/70 text-[clamp(1rem,2.6vw,1.9rem)]">
            {cleanTranslation}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default ImagelessCard
