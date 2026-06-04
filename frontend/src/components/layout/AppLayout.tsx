import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'

export function AppLayout() {
  return (
    <div className="app-shell min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 px-6 pt-[var(--glassy-header-offset)] pb-[calc(1.5rem+var(--mobile-bottom-nav-space))]">
        <Outlet />
      </main>
    </div>
  )
}
