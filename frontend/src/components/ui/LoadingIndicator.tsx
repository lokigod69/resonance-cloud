import { cn } from '@/lib/utils'
import { LingwaveLoader } from './LingwaveLoader'

export function LoadingIndicator({
  text = 'Loading',
  className,
}: {
  text?: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <LingwaveLoader size={72} className="py-0" />
      <span className="text-sm text-muted-foreground">
        {text}
      </span>
    </div>
  )
}
