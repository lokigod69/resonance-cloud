import { Link } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'

// StreamCatchMarker — today's catch against the daily goal, near the horizon
// on the left (the mirror of `+N further out`). A goal, never a gate: past it
// the line turns gold and says so, and the stream keeps flowing. Links to the
// stream deck once one exists.

export default function StreamCatchMarker({
  kept,
  goal,
  deckId,
}: {
  kept: number
  goal: number
  deckId: string | null
}) {
  const { t } = useTranslation()
  const goalMet = kept >= goal
  const label = goalMet
    ? t('home.stream.catchGoalMet', { kept })
    : t('home.stream.catch', { kept, goal })
  const className = `pointer-events-auto rounded px-2 py-1 font-display text-xs font-medium underline-offset-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
    goalMet ? 'text-[var(--accent-2)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
  }`
  const style = { textShadow: '0 2px 14px rgba(5,2,8,0.6)' }

  if (!deckId) {
    // Not yet a link (no stream deck exists) — the visible text is the whole
    // accessible name; no "open your deck" promise it cannot keep.
    return (
      <span className={className} style={style}>
        {label}
      </span>
    )
  }
  return (
    <Link
      to={`/deck/${deckId}`}
      className={`${className} hover:underline`}
      style={style}
      aria-label={t('home.stream.catchAria', { kept, goal })}
    >
      {label}
    </Link>
  )
}
