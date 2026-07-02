import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'

// Stable public URL (not a hashed Vite asset) so index.html can preload it —
// the mark must already be cached by the time any loading state appears.
const LOADER_MARK_URL = '/branding/lingwave-loader.png'
// Intrinsic asset is 203x128 (2x for retina at ~100px display width).
const MARK_ASPECT = 203 / 128

type LingwaveLoaderProps = {
  /** Display width of the mark in px */
  size?: number
  /** Fill the viewport (route-level fallback) instead of the parent container */
  fullScreen?: boolean
  className?: string
}

/**
 * The single app-wide loading indicator: the Lingwave mark.
 * The whole element stays invisible for the first 300ms (see .lw-loader in
 * index.css), so fast loads and route transitions never flash a spinner —
 * it only appears when something is genuinely slow.
 */
export function LingwaveLoader({ size = 100, fullScreen = false, className }: LingwaveLoaderProps) {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      aria-label={t('common.loading')}
      className={cn(
        'lw-loader flex items-center justify-center',
        fullScreen ? 'min-h-dvh w-full' : 'w-full py-16',
        className,
      )}
    >
      <img
        src={LOADER_MARK_URL}
        alt=""
        width={size}
        height={Math.round(size / MARK_ASPECT)}
        className="lw-loader-mark"
        draggable={false}
      />
    </div>
  )
}
