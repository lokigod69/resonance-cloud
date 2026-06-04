import lingwaveMark from '@/assets/branding/lingwave-mark.svg'
import { cn } from '@/lib/utils'

type LingwaveBrandProps = {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
}

export function LingwaveBrand({ className, markClassName, wordmarkClassName }: LingwaveBrandProps) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <img
        src={lingwaveMark}
        alt=""
        aria-hidden="true"
        className={cn('h-7 w-7 shrink-0 object-contain', markClassName)}
      />
      <span className={cn('lingwave-wordmark whitespace-nowrap font-display font-semibold', wordmarkClassName)}>
        Lingwave
      </span>
    </span>
  )
}
