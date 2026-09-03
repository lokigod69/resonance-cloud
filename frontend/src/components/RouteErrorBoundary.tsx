import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { createT, type Locale } from '@/lib/translations'
import { reportClientError } from '@/lib/errorReporting'

// Reads the locale from <html lang> (kept in sync by DocumentLanguageSync) so
// the fallback works even when the error happened above the auth context.
function currentLocale(): Locale {
  const lang = typeof document !== 'undefined' ? document.documentElement.lang : 'en'
  return lang === 'de' || lang === 'fr' ? lang : 'en'
}

function RouteErrorFallback({ onRetry }: { onRetry: () => void }) {
  const t = createT(currentLocale())
  return (
    <div
      role="alert"
      className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t('errors.route.title')}</h1>
      <p className="max-w-md text-sm text-[var(--text-secondary)]">{t('errors.route.body')}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black"
          onClick={onRetry}
        >
          {t('errors.route.retry')}
        </button>
        <a
          className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-[var(--text-primary)]"
          href="/dashboard"
        >
          {t('errors.route.home')}
        </a>
      </div>
    </div>
  )
}

type Props = {
  children: ReactNode
  /** Changing this key (e.g. the pathname) clears a caught error. */
  resetKey: string
}

type State = { error: Error | null }

/**
 * Contains a render error to the routed page instead of blanking the whole app
 * (React unmounts the entire tree on an uncaught render error — audit F-01).
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError(error, info.componentStack)
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return <RouteErrorFallback onRetry={() => this.setState({ error: null })} />
    }
    return this.props.children
  }
}

/** Boundary keyed on the current pathname — wrap a layout's `<Outlet />` with it. */
export function OutletErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return <RouteErrorBoundary resetKey={pathname}>{children}</RouteErrorBoundary>
}
