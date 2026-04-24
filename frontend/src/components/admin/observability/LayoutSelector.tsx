import styles from './observability.module.css'

export type WordLayoutMode = 'A' | 'B' | 'C'

const OPTIONS: Array<{ value: WordLayoutMode; label: string }> = [
  { value: 'A', label: 'A · SCROLL' },
  { value: 'B', label: 'B · TABS' },
  { value: 'C', label: 'C · PANELS' },
]

export default function LayoutSelector({
  value,
  onChange,
}: {
  value: WordLayoutMode
  onChange: (value: WordLayoutMode) => void
}) {
  return (
    <div className={styles.layoutStrip} aria-label="Word observability layout">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${styles.layoutButton} ${value === option.value ? styles.layoutButtonActive : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
