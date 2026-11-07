import type { ComponentProps, ReactNode } from 'react'
import FirstLightTopRow from '@/components/home/FirstLightTopRow'
import { WAVE_HORIZON_FRACTION } from '@/lib/waveField'

export function HomeSky({ children, ...topRow }: ComponentProps<typeof FirstLightTopRow> & { children: ReactNode }) {
  return (
    <div
      className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-stretch gap-3 pt-[calc(var(--app-safe-top)+0.5rem)] md:pt-2 [@media(max-height:720px)]:gap-2"
      style={{ minHeight: `calc(${WAVE_HORIZON_FRACTION * 100}dvh - var(--glassy-content-top-offset, 0px))` }}
    >
      <FirstLightTopRow {...topRow} />
      {children}
    </div>
  )
}
