import { useTranslation } from '@/hooks/useTranslation'
import type { SessionStats } from '../engine/types'
import styles from '../styles.module.css'

type SurfSessionCompleteProps = {
  stats: SessionStats
  onPlayAgain: () => void
  onExit: () => void
}

export function SurfSessionComplete({ stats, onPlayAgain, onExit }: SurfSessionCompleteProps) {
  const { t } = useTranslation()
  const accuracy = stats.wavesPlayed === 0 ? 0 : Math.round((stats.correct / stats.wavesPlayed) * 100)

  return (
    <section className={styles.completeCard} aria-live="polite">
      <p className={styles.completeKicker}>{t('surf.complete.title')}</p>
      <h1>{t('surf.complete.points', { score: stats.score })}</h1>
      <dl className={styles.completeStats}>
        <div><dt>{t('surf.complete.correct')}</dt><dd>{stats.correct}</dd></div>
        <div><dt>{t('surf.complete.wrong')}</dt><dd>{stats.wrong}</dd></div>
        <div><dt>{t('surf.complete.bestCombo')}</dt><dd>{stats.bestCombo}</dd></div>
        <div><dt>{t('surf.complete.accuracy')}</dt><dd>{accuracy}%</dd></div>
      </dl>
      <div className={styles.actions}>
        <button type="button" onClick={onPlayAgain}>{t('surf.complete.playAgain')}</button>
        <button type="button" className={styles.secondaryButton} onClick={onExit}>{t('surf.complete.exit')}</button>
      </div>
    </section>
  )
}
