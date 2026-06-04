import lingwaveMark from '@/assets/branding/lingwave-mark.png'
import lingwaveWordmark from '@/assets/branding/lingwave-wordmark.png'
import { cn } from '@/lib/utils'

type LingwaveBrandProps = {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
}

export function LingwaveBrand({ className, markClassName, wordmarkClassName }: LingwaveBrandProps) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2.5', className)}>
      <img
        src={lingwaveMark}
        alt=""
        aria-hidden="true"
        className={cn('h-7 w-auto shrink-0 object-contain', markClassName)}
      />
      <img
        src={lingwaveWordmark}
        alt="Lingwave"
        className={cn('h-5 w-auto shrink-0 object-contain', wordmarkClassName)}
      />
    </span>
  )
}
