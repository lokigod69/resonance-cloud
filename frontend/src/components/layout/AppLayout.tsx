import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'

export function AppLayout() {
  return (
    <div className="app-shell min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 p-6 pt-[var(--glassy-header-offset)]">
        <Outlet />
      </main>
    </div>
  )
}
