import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Volume2 } from 'lucide-react'
import type { ScriptAudioSpec, ScriptDefinition } from '@/lib/scriptlab/types'
import { resolveScriptAudio } from '@/lib/scriptlab/audio'
import { playPronunciation } from '@/hooks/usePronunciation'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

type ScriptAudioButtonProps = {
  script: Pick<ScriptDefinition, 'id' | 'speechLang'>
  spec: ScriptAudioSpec
  size?: 'sm' | 'lg'
  className?: string
}

const SIZE_CLASS = { sm: 'h-11 w-11', lg: 'h-14 w-14' } as const
const ICON_SIZE = { sm: 18, lg: 24 } as const

export function ScriptAudioButton({ script, spec, size = 'sm', className }: ScriptAudioButtonProps) {
  const { t } = useTranslation()
  const [playing, setPlaying] = useState(false)
  const resetRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (resetRef.current !== null) window.clearTimeout(resetRef.current)
    },
    [],
  )

  const handlePlay = useCallback(() => {
    setPlaying(true)
    if (resetRef.current !== null) window.clearTimeout(resetRef.current)
    resetRef.current = window.setTimeout(() => setPlaying(false), 280)
    void playPronunciation(resolveScriptAudio(script, spec))
  }, [script, spec])

  return (
    <motion.button
      type="button"
      onClick={handlePlay}
      whileTap={{ scale: 0.9 }}
      animate={playing ? { scale: [1, 1.09, 1] } : { scale: 1 }}
      transition={{ duration: 0.28 }}
      aria-label={t('scriptlab.play')}
      className={cn(
        'inline-flex flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--on-accent)] shadow-[0_6px_18px_var(--accent-glow)] transition-shadow hover:shadow-[0_10px_26px_var(--accent-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30',
        SIZE_CLASS[size],
        className,
      )}
    >
      <Volume2 size={ICON_SIZE[size]} strokeWidth={2.25} aria-hidden="true" />
    </motion.button>
  )
}
