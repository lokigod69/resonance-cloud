import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function LoadingIndicator({
  text = 'Loading',
  className,
}: {
  text?: string
  className?: string
}) {
  const [dotCount, setDotCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setDotCount((c) => (c + 1) % 4), 400)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className="animate-spin rounded-full opacity-60"
        style={{
          width: 28,
          height: 28,
          border: '2.5px solid currentColor',
          borderTopColor: 'transparent',
        }}
      />
      <span className="text-sm text-muted-foreground">
        {text}
        {'.'.repeat(dotCount)}
      </span>
    </div>
  )
}
