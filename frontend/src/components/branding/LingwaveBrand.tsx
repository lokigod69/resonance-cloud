// WebP at 3× the largest rendered size (mark ≤ 36 px, wordmark ≤ 36 px tall).
// The previous PNGs were 1403×883 / 1938×406 (865 KB together) and made up
// about half of every page's bytes (audit 2026-09-03 D-04 / H).
import lingwaveMark from '@/assets/branding/lingwave-mark.webp'
import lingwaveWordmark from '@/assets/branding/lingwave-wordmark.webp'
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
        width={407}
        height={256}
        decoding="async"
        className={cn('h-7 w-auto shrink-0 object-contain', markClassName)}
      />
      <img
        src={lingwaveWordmark}
        alt="Lingwave"
        width={764}
        height={160}
        decoding="async"
        className={cn('h-5 w-auto shrink-0 object-contain', wordmarkClassName)}
      />
    </span>
  )
}
