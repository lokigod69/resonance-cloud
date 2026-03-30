import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number | null
  onChange?: (rating: number) => void
  size?: number
  readOnly?: boolean
}

export default function StarRating({ rating, onChange, size = 20, readOnly = false }: StarRatingProps) {
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        readOnly ? (
          <Star
            key={star}
            size={size}
            className={
              star <= (rating || 0)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-600'
            }
          />
        ) : (
          <button
            key={star}
            onClick={(e) => {
              e.stopPropagation()
              onChange?.(star)
            }}
            className="cursor-pointer hover:scale-110 transition-transform"
          >
            <Star
              size={size}
              className={
                star <= (rating || 0)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-600 hover:text-yellow-400/50'
              }
            />
          </button>
        )
      ))}
    </div>
  )
}
