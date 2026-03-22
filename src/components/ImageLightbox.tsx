import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  alt?: string
  onClose: () => void
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 cursor-pointer"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 cursor-pointer"
        onClick={onClose}
      >
        <X size={24} />
      </button>
      <img
        src={src}
        alt={alt || ''}
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}
