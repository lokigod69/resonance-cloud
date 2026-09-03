import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './themes/theme-contract.css'
import './themes/midnight.css'
import './themes/rainy-day.css'
import './themes/red-wine.css'
import './themes/slate.css'
import './themes/warm-linen.css'
import App from './App.tsx'
import { routeImports, prefetchRouteImport } from './routes/routeImports'
import { reportClientError } from './lib/errorReporting'

// Public pages are lazy chunks; start fetching them now, in parallel with React
// and provider init, so a cold visit doesn't pay a serial entry → chunk hop.
const entryPath = window.location.pathname
if (entryPath === '/') {
  prefetchRouteImport(routeImports.landingPage)
}
if (entryPath === '/' || entryPath === '/login') {
  prefetchRouteImport(routeImports.login)
}

// A deploy replaces every hashed chunk. A tab loaded before the deploy that
// then lazy-loads a route whose CSS is gone gets Vite's `vite:preloadError`;
// reload once (session-guarded) instead of leaving a blank page (audit F-03).
window.addEventListener('vite:preloadError', (event) => {
  const flag = 'lazyWithRetry:reloaded:vite-preload'
  let alreadyReloaded = false
  try {
    alreadyReloaded = window.sessionStorage.getItem(flag) === '1'
    if (!alreadyReloaded) window.sessionStorage.setItem(flag, '1')
  } catch {
    // storage unavailable — fall through to the default rejection
  }
  if (alreadyReloaded) return
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!, {
  onUncaughtError: (error, info) => reportClientError(error, info.componentStack),
  onCaughtError: (error, info) => reportClientError(error, info.componentStack),
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
