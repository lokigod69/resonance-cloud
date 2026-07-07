import { motion } from 'framer-motion'
import { Check, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSkin } from '@/contexts/SkinContext'
import { useTranslation } from '@/hooks/useTranslation'

interface SessionCompleteProps {
  reviewed: number
  sessionStats: { remembered: number; reviewLater: number }
  onRestart: () => void
  onBack: () => void
  backLabel: string
}

// The one completion screen for every study mode — replaces the near-identical block
// that used to live in Study / StudyPG / StudyImage / StudyImagePG / StudyFlashcard /
// StudyAudio, where stat-color drift kept reappearing. Chrome branches on skin
// (classic Button + green/orange, glassy pg-tokens + font-display); the copy and stats
// are identical across modes. Callers pass the back-CTA label they already use.
export function SessionComplete({ reviewed, sessionStats, onRestart, onBack, backLabel }: SessionCompleteProps) {
  const { skin } = useSkin()
  const { t, tp } = useTranslation()
  const glassy = skin === 'glassy'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className={
          glassy
            ? 'w-20 h-20 rounded-full bg-[var(--pg-accent-green)]/20 border border-[var(--pg-accent-green)]/40 flex items-center justify-center'
            : 'w-20 h-20 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center'
        }
      >
        <Check className={glassy ? 'h-10 w-10 text-[var(--pg-accent-green)]' : 'h-10 w-10 text-green-400'} />
      </motion.div>
      <div>
        <h2 className={glassy ? 'text-2xl font-bold font-display mb-2' : 'text-2xl font-bold mb-2'}>
          {t('study.sessionComplete')}
        </h2>
        <p className={glassy ? 'text-[var(--pg-text-dim)]' : 'text-muted-foreground'}>
          {tp('study.wordsReviewed', reviewed)}
        </p>
        {glassy ? (
          <p className="text-sm mt-1" style={{ color: 'var(--pg-text-dim)' }}>
            <span style={{ color: 'var(--pg-accent-green)' }}>{t('study.remembered', { count: sessionStats.remembered })}</span>
            {sessionStats.reviewLater > 0 && (
              <span className="ml-2" style={{ color: 'var(--pg-accent-gold)' }}>{t('study.needReview', { count: sessionStats.reviewLater })}</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">
            <span className="text-green-400">{t('study.remembered', { count: sessionStats.remembered })}</span>
            {sessionStats.reviewLater > 0 && (
              <span className="text-orange-400 ml-2">{t('study.needReview', { count: sessionStats.reviewLater })}</span>
            )}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        {glassy ? (
          <>
            <button
              onClick={onRestart}
              className="px-6 py-3 rounded-xl bg-[var(--pg-accent-teal)]/20 border border-[var(--pg-accent-teal)]/50 text-[var(--pg-accent-teal)] font-display font-semibold hover:bg-[var(--pg-accent-teal)]/30 transition-all"
            >
              <RotateCcw className="h-4 w-4 inline mr-2" />
              {t('study.startAgain')}
            </button>
            <button
              onClick={onBack}
              className="px-6 py-3 rounded-xl border border-border text-[var(--pg-text-dim)] font-display font-medium hover:bg-accent transition-all"
            >
              {backLabel}
            </button>
          </>
        ) : (
          <>
            <Button onClick={onRestart}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('study.startAgain')}
            </Button>
            <Button variant="outline" onClick={onBack}>
              {backLabel}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
