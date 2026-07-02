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

// Public pages are lazy chunks; start fetching them now, in parallel with React
// and provider init, so a cold visit doesn't pay a serial entry → chunk hop.
const entryPath = window.location.pathname
if (entryPath === '/') {
  prefetchRouteImport(routeImports.landingPage)
}
if (entryPath === '/' || entryPath === '/login') {
  prefetchRouteImport(routeImports.login)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
