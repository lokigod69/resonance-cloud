import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ScriptDefinition } from '@/lib/scriptlab/types'
import { ScriptAudioButton } from './ScriptAudioButton'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

type BuildModeProps = {
  script: ScriptDefinition
}

export function BuildMode({ script }: BuildModeProps) {
  const { t } = useTranslation()
  const composition = script.composition
  const initialIds = composition?.initialIds ?? []
  const medialIds = composition?.medialIds ?? []
  const finalIds = composition?.finalIds ?? []

  const symbolChar = useMemo(() => {
    const map = new Map(script.symbols.map((symbol) => [symbol.id, symbol.character]))
    return (id: string) => map.get(id) ?? id
  }, [script.symbols])

  const [initialId, setInitialId] = useState(initialIds[0] ?? '')
  const [medialId, setMedialId] = useState(medialIds[0] ?? '')
  const [finalId, setFinalId] = useState<string | null>(null)

  const composed = useMemo(() => {
    if (!composition || !initialId || !medialId) return null
    return composition.compose(initialId, medialId, finalId ?? undefined)
  }, [composition, initialId, medialId, finalId])

  if (!composition) return null

  return (
    <div className="space-y-6">
      <h2 className="sr-only">{t('scriptlab.build.title')}</h2>

      <div className="pg-glass flex flex-col items-center gap-4 rounded-3xl px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={composed ? composed.text : 'placeholder'}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col items-center"
          >
            <span
              className="font-display text-8xl leading-none text-[var(--text-primary)]"
              style={{ textShadow: composed ? '0 0 34px var(--accent-glow)' : 'none' }}
            >
              {composed ? composed.text : '—'}
            </span>
            {composed && (
              <span className="mt-2 text-lg text-[var(--text-muted)]">{composed.romanization}</span>
            )}
          </motion.div>
        </AnimatePresence>

        {composed && <ScriptAudioButton script={script} spec={composed.audio} size="lg" />}
      </div>

      <p className="text-center text-sm text-[var(--text-secondary)]">{t('scriptlab.build.hint')}</p>

      <div className="space-y-5">
        <PickerGroup label={t('scriptlab.build.initial')}>
          {initialIds.map((id) => (
            <Chip key={id} selected={initialId === id} onClick={() => setInitialId(id)}>
              <span className="font-display text-xl">{symbolChar(id)}</span>
            </Chip>
          ))}
        </PickerGroup>

        <PickerGroup label={t('scriptlab.build.vowel')}>
          {medialIds.map((id) => (
            <Chip key={id} selected={medialId === id} onClick={() => setMedialId(id)}>
              <span className="font-display text-xl">{symbolChar(id)}</span>
            </Chip>
          ))}
        </PickerGroup>

        {finalIds.length > 0 && (
          <PickerGroup label={t('scriptlab.build.final')}>
            <Chip selected={finalId === null} onClick={() => setFinalId(null)}>
              <span className="px-1 text-sm">{t('scriptlab.build.none')}</span>
            </Chip>
            {finalIds.map((id) => (
              <Chip key={id} selected={finalId === id} onClick={() => setFinalId(id)}>
                <span className="font-display text-xl">{symbolChar(id)}</span>
              </Chip>
            ))}
          </PickerGroup>
        )}
      </div>
    </div>
  )
}

function PickerGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex h-11 min-w-[2.75rem] items-center justify-center rounded-full border px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30',
        selected
          ? 'border-transparent bg-[var(--accent)] text-[var(--on-accent)]'
          : 'border-[var(--border-subtle)] bg-[var(--surface-glass)] text-[var(--text-primary)] hover:border-[var(--accent)]',
      )}
    >
      {children}
    </button>
  )
}
