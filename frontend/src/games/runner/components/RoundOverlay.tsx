import styles from '../styles.module.css'

type RoundOverlayProps = {
  label: string | null
}

export function RoundOverlay({ label }: RoundOverlayProps) {
  if (!label) return null

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2">
      <div className={`${styles.levelOverlay} whitespace-nowrap text-center font-[var(--runner-font-display)] text-5xl leading-none text-[#d0f0ff] [text-shadow:0_0_18px_rgba(168,216,234,0.78),0_0_38px_rgba(79,195,247,0.42)] sm:text-7xl`}>
        {label}
      </div>
    </div>
  )
}
