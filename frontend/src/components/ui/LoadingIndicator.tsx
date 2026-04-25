import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { GenerationWheelLoader } from './GenerationWheelLoader'

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
      <GenerationWheelLoader size={72} className="gap-0" />
      <span className="text-sm text-muted-foreground">
        {text}
        {'.'.repeat(dotCount)}
      </span>
    </div>
  )
}
