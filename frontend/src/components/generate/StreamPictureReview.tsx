import { ArrowLeft, Crown, Sparkles } from 'lucide-react'
import CardImageStyleStep from './steps/CardImageStyleStep'
import { canSubmitStreamPicture } from './streamPictureFlow'
import { useTranslation } from '@/hooks/useTranslation'
import type { ProductLane, StandardCardImageStyle } from './useWizardState'

type StreamPictureReviewProps = {
  word: string
  gloss: string | null
  languageLabel: string
  languageCode: string
  glossLanguageCode: string | null
  deckName: string
  productLane: Extract<ProductLane, 'card_standard' | 'card_premium'>
  cardImageStyle: StandardCardImageStyle | null
  creditCost: number
  credits: number | undefined
  submitting: boolean
  error: string | null
  onDeckNameChange: (value: string) => void
  onStyleChange: (value: StandardCardImageStyle) => void
  onUseStandard: () => void
  onUsePremium: () => void
  onCustomizePremium: () => void
  onGenerate: () => void
  onBack: () => void
}

export default function StreamPictureReview({
  word,
  gloss,
  languageLabel,
  languageCode,
  glossLanguageCode,
  deckName,
  productLane,
  cardImageStyle,
  creditCost,
  credits,
  submitting,
  error,
  onDeckNameChange,
  onStyleChange,
  onUseStandard,
  onUsePremium,
  onCustomizePremium,
  onGenerate,
  onBack,
}: StreamPictureReviewProps) {
  const { t, tp } = useTranslation()
  const isPremium = productLane === 'card_premium'
  const canGenerate = canSubmitStreamPicture(credits, creditCost, submitting)

  return (
    <div data-stream-picture-review className="mx-auto flex w-full max-w-xl flex-col items-center px-2 py-3 text-center sm:px-4 sm:py-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex min-h-11 self-start items-center gap-2 rounded-full px-3 py-2 text-sm text-[var(--go-text-secondary)] transition-colors hover:bg-[var(--surface-glass)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('generate.streamPicture.back')}
      </button>

      <p className="mb-1 font-display text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        {t('generate.streamPicture.eyebrow')}
      </p>
      <h2 className="long-copy max-w-full break-words font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl" lang={languageCode} dir="auto">
        {word}
      </h2>
      {gloss ? <p className="long-copy mt-1 max-w-full break-words text-base text-[var(--go-text-secondary)]" lang={glossLanguageCode ?? undefined} dir="auto">{gloss}</p> : null}
      <p className="mt-1 text-sm text-[var(--text-muted)]">{languageLabel}</p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-glass)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)]">
          {t(isPremium ? 'generate.productLane.premium.label' : 'generate.productLane.standard.label')}
        </span>
        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-glass)] px-3 py-1.5 text-sm text-[var(--accent-2)]">
          {tp('generateGo.creditCount', creditCost)}
        </span>
      </div>

      <div className="mt-4 w-full max-w-sm">
        <p className="mb-2 text-sm text-[var(--go-text-secondary)]">
          {typeof credits === 'number'
            ? t('generate.streamPicture.balance', { credits })
            : t('generate.couldNotVerifyCredits')}
        </p>
        {typeof credits === 'number' && credits < creditCost ? (
          <p className="mb-3 text-sm text-[var(--destructive)]">
            {t('generateGo.notEnoughCreditsDetail', { need: creditCost, have: credits })}
          </p>
        ) : null}
        <button
          data-stream-picture-generate
          type="button"
          disabled={!canGenerate}
          onClick={onGenerate}
          className="lw-swell-cta inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 font-display text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          {submitting ? t('generateGo.synthesizing') : t('generate.primaryGenerate')}
        </button>
        {error ? <p role="alert" className="mt-3 text-sm text-[var(--destructive)]">{error}</p> : null}
      </div>

      <p className="mt-3 max-w-full truncate text-sm text-[var(--text-muted)]">
        {t('generate.streamPicture.deckName')} · <span className="font-semibold text-[var(--text-secondary)]">{deckName}</span>
      </p>

      <details className="mt-3 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-glass)] px-4 py-3 text-left">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--text-secondary)]">
          {t('generate.streamPicture.styleOptions')}
        </summary>
        <div className="space-y-4 pt-4">
          <label className="block w-full">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {t('generate.streamPicture.renameDeck')}
            </span>
            <input
              type="text"
              value={deckName}
              onChange={(event) => onDeckNameChange(event.target.value)}
              maxLength={50}
              className="theme-input block w-full rounded-lg p-3 text-center font-semibold outline-none transition-colors focus:border-[var(--go-accent)]"
            />
          </label>

          {isPremium ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onCustomizePremium}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-2)]/40 bg-[var(--accent-2)]/10 px-4 py-2 text-sm font-semibold text-[var(--accent-2)] transition-colors hover:bg-[var(--accent-2)]/15"
              >
                <Crown className="h-4 w-4" aria-hidden="true" />
                {t('generate.streamPicture.customizePremium')}
              </button>
              <button type="button" onClick={onUseStandard} className="px-3 py-2 text-sm text-[var(--text-muted)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline">
                {t('generate.streamPicture.useStandard')}
              </button>
            </div>
          ) : (
            <>
              <CardImageStyleStep skin="glassy" value={cardImageStyle} onChange={onStyleChange} />
              <button
                type="button"
                onClick={onUsePremium}
                className="mx-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[var(--accent-2)] transition-colors hover:bg-[var(--accent-2)]/10"
              >
                <Crown className="h-4 w-4" aria-hidden="true" />
                {t('generate.streamPicture.usePremium')}
              </button>
            </>
          )}
        </div>
      </details>
    </div>
  )
}
