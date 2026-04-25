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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
