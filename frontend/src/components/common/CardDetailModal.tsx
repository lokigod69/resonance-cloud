import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from '@/hooks/useTranslation'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

export type CardDetailField = {
  key: string
  label: string
  value: string | string[]
  tone?: 'plain' | 'muted' | 'chip'
}

export type CardDetailModel = {
  title: string
  subtitle?: string
  ipa?: string
  posChip?: { label: string; tone?: string }
  image?: { src: string; alt: string; fallbackEmoji?: string; aspect?: '16:9' | '4:5' }
  primaryText?: string
  highlightText?: string
  exampleBlock?: { target: string; base?: string }
  sections: CardDetailField[]
  chipsBelowTitle?: string[]
}

type CardDetailModalProps = {
  model: CardDetailModel | null
  onClose: () => void
}

function getFocusable(container: HTMLElement | null): HTMLElement[] {
  if (!container) return []
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('aria-hidden'))
}

function ModalImage({
  image,
  title,
  noImageLabel,
}: {
  image: NonNullable<CardDetailModel['image']>
  title: string
  noImageLabel: string
}) {
  const [failed, setFailed] = useState(false)
  const aspectRatio = image.aspect === '4:5' ? '4 / 5' : '16 / 9'
  const imageShellStyle = {
    aspectRatio,
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-1)',
  }

  if (failed) {
    return (
      <div
        className="mb-4 grid w-full place-items-center rounded-lg p-4 text-center"
        style={{ ...imageShellStyle, color: 'var(--text-muted)' }}
      >
        <div className="space-y-2">
          {image.fallbackEmoji && (
            <div aria-hidden="true" style={{ color: 'var(--text-primary)', fontSize: '2.5rem', lineHeight: 1 }}>
              {image.fallbackEmoji}
            </div>
          )}
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs">{noImageLabel}</p>
        </div>
      </div>
    )
  }

  return (
    <img
      src={image.src}
      alt={image.alt}
      loading="lazy"
      className="mb-4 block w-full rounded-lg object-cover"
      style={imageShellStyle}
      onError={() => setFailed(true)}
    />
  )
}

function FieldValue({ field }: { field: CardDetailField }) {
  if (Array.isArray(field.value)) {
    if (field.tone === 'chip') {
      return (
        <div className="flex flex-wrap gap-1.5">
          {field.value.map((item) => (
            <span
              key={item}
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{
                background: 'var(--accent-soft)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              {item}
            </span>
          ))}
        </div>
      )
    }
    return <p className="text-sm leading-relaxed">{field.value.join(', ')}</p>
  }

  return (
    <p
      className="text-sm leading-relaxed"
      style={{ color: field.tone === 'muted' ? 'var(--text-secondary)' : 'var(--text-primary)' }}
    >
      {field.value}
    </p>
  )
}

export default function CardDetailModal({ model, onClose }: CardDetailModalProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const isOpen = Boolean(model)

  useBodyScrollLock(isOpen)

  useEffect(() => {
    if (!model) return
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    window.setTimeout(() => closeButtonRef.current?.focus(), 0)

    return () => {
      previousFocusRef.current?.focus()
    }
  }, [model])

  useEffect(() => {
    if (!model) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = getFocusable(dialogRef.current)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [model, onClose])

  return (
    <AnimatePresence>
      {model && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          style={{
            background: 'color-mix(in srgb, var(--app-bg) 76%, transparent)',
            backdropFilter: 'blur(24px) saturate(0.9)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="card-detail-title"
            data-body-scroll-lock-scrollable="true"
            className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-t-2xl p-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] outline-none sm:max-h-[88vh] sm:rounded-2xl sm:p-7"
            style={{
              background: 'var(--surface-glass-strong)',
              border: '1px solid var(--border-strong)',
              boxShadow: 'var(--shadow-elevated)',
              color: 'var(--text-primary)',
              backdropFilter: 'blur(28px) saturate(1.1)',
            }}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="card-detail-close-row mb-4 flex justify-end">
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="card-detail-close-button flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-glass)] text-[var(--text-secondary)] transition-[background,border-color,box-shadow,color] hover:cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)] hover:shadow-[0_0_20px_var(--accent-glow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                aria-label={t('categories.modal.close')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {model.image && <ModalImage image={model.image} title={model.title} noImageLabel={t('categories.modal.noImage')} />}

            <div className="space-y-4">
              <header className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="card-detail-title" className="m-0 text-2xl font-semibold tracking-tight sm:text-3xl">
                    {model.title}
                  </h2>
                  {model.posChip && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                      style={{
                        background: 'var(--accent-soft)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {model.posChip.label}
                    </span>
                  )}
                </div>
                {model.ipa && (
                  <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                    /{model.ipa.replace(/^\/|\/$/g, '')}/
                  </p>
                )}
                {model.primaryText && (
                  <p className="text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {model.primaryText}
                  </p>
                )}
                {model.subtitle && (
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {model.subtitle}
                  </p>
                )}
                {model.chipsBelowTitle?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {model.chipsBelowTitle.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: 'var(--surface-glass)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                ) : null}
              </header>

              {model.highlightText && (
                <section className="space-y-1">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                    {t('categories.modal.mnemonic')}
                  </h3>
                  <div
                    className="rounded-lg p-3 text-sm leading-relaxed"
                    style={{
                      background: 'var(--accent-soft)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {model.highlightText}
                  </div>
                </section>
              )}

              {model.exampleBlock && (
                <section className="space-y-1">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                    {t('categories.modal.example')}
                  </h3>
                  <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    "{model.exampleBlock.target}"
                  </p>
                  {model.exampleBlock.base && (
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {model.exampleBlock.base}
                    </p>
                  )}
                </section>
              )}

              {model.sections.map((field) => (
                <section key={field.key} className="space-y-1">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                    {field.label}
                  </h3>
                  <FieldValue field={field} />
                </section>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
