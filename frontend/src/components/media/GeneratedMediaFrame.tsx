import type { ReactNode } from 'react'

type GeneratedMediaFrameVariant = 'detail' | 'modal' | 'deckPreview' | 'decorative' | 'tiny'

type GeneratedMediaFrameProps = {
  src?: string | null
  alt: string
  variant?: GeneratedMediaFrameVariant
  className?: string
  imageClassName?: string
  loading?: 'eager' | 'lazy'
  children?: ReactNode
}

const frameClasses: Record<GeneratedMediaFrameVariant, string> = {
  detail: 'aspect-video w-full rounded-xl',
  modal: 'aspect-video w-full rounded-xl',
  deckPreview: 'aspect-video w-full rounded-xl',
  decorative: 'aspect-video w-full rounded-xl',
  tiny: 'aspect-square h-10 w-10 rounded-lg',
}

function imageFitForVariant(variant: GeneratedMediaFrameVariant) {
  return variant === 'tiny' || variant === 'decorative' ? 'object-cover' : 'object-contain'
}

export default function GeneratedMediaFrame({
  src,
  alt,
  variant = 'detail',
  className = '',
  imageClassName = '',
  loading = 'lazy',
  children,
}: GeneratedMediaFrameProps) {
  const imageFit = imageFitForVariant(variant)

  return (
    <div className={`relative overflow-hidden bg-neutral-950/70 ${frameClasses[variant]} ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          draggable={false}
          loading={loading}
          decoding="async"
          onDragStart={(event) => event.preventDefault()}
          className={`absolute inset-0 h-full w-full select-none ${imageFit} ${imageClassName}`}
        />
      ) : (
        children
      )}
    </div>
  )
}
