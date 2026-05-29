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
  ipa,
  revealed,
  targetLanguage = '',
  className,
}: ImagelessCardProps) {
  const cleanIpa = ipa?.trim()
  const isPhrase = /\s/.test(word.trim())

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

        {cleanIpa && (
          <p className="w-full text-balance text-[clamp(0.9rem,2.1vw,1.25rem)] leading-snug text-white/78">
            {cleanIpa}
          </p>
        )}

        <div className="min-h-[clamp(1.25rem,3vw,1.75rem)]">
          {revealed && translation.trim() && (
            <p className="w-full text-balance text-[clamp(1rem,2.6vw,1.6rem)] leading-snug text-white/70">
              {translation}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImagelessCard
