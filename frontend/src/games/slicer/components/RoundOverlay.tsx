import styles from '../styles.module.css'

type RoundOverlayProps = {
  label: string | null
}

export function RoundOverlay({ label }: RoundOverlayProps) {
  if (!label) return null

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2">
      <div className={`${styles.roundOverlay} whitespace-nowrap text-center font-serif text-4xl leading-none text-[#ffd700] [text-shadow:0_0_18px_rgba(255,215,0,0.78),0_0_38px_rgba(255,107,53,0.42)] sm:text-6xl`}>
        {label}
      </div>
    </div>
  )
}
