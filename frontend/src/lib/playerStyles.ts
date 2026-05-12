export const PLAYER_ACTIVE_TOGGLE_CLASS =
  'text-[var(--media-player-accent,var(--accent))] bg-[var(--media-player-accent-soft,var(--accent-soft))]'

export const PLAYER_INACTIVE_TOGGLE_CLASS =
  'text-muted-foreground hover:text-foreground hover:bg-white/10'

export const PLAYER_FOCUS_RING_CLASS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--media-player-accent,var(--accent))]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export const PLAYER_ICON_BUTTON_CLASS =
  `flex items-center justify-center shrink-0 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${PLAYER_FOCUS_RING_CLASS}`

export const PLAYER_ROUNDED_ICON_BUTTON_CLASS =
  `rounded-full ${PLAYER_ICON_BUTTON_CLASS}`

export const PLAYER_SOFT_ICON_BUTTON_CLASS =
  `rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 ${PLAYER_ICON_BUTTON_CLASS}`

export const PLAYER_AUDIO_ROW_CLASS =
  'flex items-center gap-2'

export const PLAYER_SLIDER_CLASS =
  'volume-slider w-full cursor-pointer'

export const PLAYER_PROGRESS_TRACK_CLASS =
  'w-full rounded-full bg-[var(--border)]'

export const PLAYER_PROGRESS_FILL_CLASS =
  'h-full rounded-full bg-[var(--media-player-accent,var(--accent))]'

export const PLAYER_BAR_CLASS =
  'fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center gap-x-4 gap-y-0 border-t border-border bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] pt-3 shadow-[0_-12px_28px_rgba(0,0,0,0.22)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/90 sm:left-1/2 sm:right-auto sm:bottom-0 sm:w-[calc(100%-3rem)] sm:max-w-5xl sm:-translate-x-1/2 sm:flex-nowrap sm:gap-4 sm:rounded-lg sm:border sm:px-4 sm:py-3 sm:shadow-[0_18px_45px_rgba(0,0,0,0.3)]'
