import { useEffect } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import type { WaveSpec } from '../engine/types'
import styles from '../styles.module.css'

type SurfHudState = { score: number; combo: number; lives: number; level: number }
type Feedback = { correct: boolean; target: string; prompt: string } | null

type SurfHUDProps = {
  wave: WaveSpec | null
  hud: SurfHudState
  feedback: Feedback
  muted: boolean
  onFeedbackHidden: () => void
  onPause: () => void
  onToggleMuted: () => void
}

export function SurfHUD({ wave, hud, feedback, muted, onFeedbackHidden, onPause, onToggleMuted }: SurfHUDProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!feedback) return undefined
    const timeout = window.setTimeout(onFeedbackHidden, 1400)
    return () => window.clearTimeout(timeout)
  }, [feedback, onFeedbackHidden])

  return (
    <div className={styles.overlay}>
      <header className={styles.promptBar}>
        <span className={styles.promptLabel}>{t('surf.hud.find')}</span>
        <strong>{wave?.target.prompt ?? ''}</strong>
      </header>
      <div className={styles.hud}>
        <span>{t('surf.hud.score', { score: hud.score })}</span>
        <span aria-label={t('surf.hud.lives', { count: hud.lives })}>{'♥'.repeat(Math.max(0, hud.lives))}</span>
        <span>{t('surf.hud.combo', { combo: hud.combo })}</span>
        <span>{t('surf.hud.level', { level: hud.level + 1 })}</span>
      </div>
      <div className={styles.hudButtons}>
        <button type="button" onClick={onPause}>{t('surf.hud.pause')}</button>
        <button type="button" onClick={onToggleMuted}>{muted ? t('surf.hud.unmute') : t('surf.hud.mute')}</button>
      </div>
      {feedback && (
        <div className={`${styles.feedback} ${feedback.correct ? styles.feedbackCorrect : styles.feedbackWrong}`} aria-live="polite">
          {feedback.correct
            ? t('surf.feedback.correct', { term: feedback.target, prompt: feedback.prompt })
            : t('surf.feedback.wrong', { target: feedback.target, prompt: feedback.prompt })}
        </div>
      )}
    </div>
  )
}
