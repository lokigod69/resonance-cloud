/* eslint-disable */
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import Today from '@/pages/Today'
import GuidedCheckpoint from '@/pages/GuidedCheckpoint'
import './harness.css'
import { FIXTURES } from './fixtures'
import { Ctx } from './utils'

const w = window as any
w.__fixtureList = FIXTURES.map(({ id, name, viewport, reduceMotion }) => ({ id, name, viewport, reduceMotion: Boolean(reduceMotion) }))
w.__pageErrors = []
window.addEventListener('error', (event) => w.__pageErrors.push(String(event.message ?? event)))
window.addEventListener('unhandledrejection', (event: any) => w.__pageErrors.push(`unhandledrejection: ${String(event?.reason?.stack ?? event?.reason)}`))

function LocationProbe() {
  const current = useLocation()
  w.__location = `${current.pathname}${current.search}`
  return null
}

async function main() {
  const id = new URLSearchParams(location.search).get('f')
  if (!id) { w.__listReady = true; return }
  const fixture = FIXTURES.find((entry) => entry.id === id)
  if (!fixture) { w.__done = true; w.__verdict = { id, status: 'fail', checks: [] }; return }

  localStorage.clear()
  sessionStorage.clear()
  Object.assign(w, { __scenario: fixture.scenario, __shotRequest: null, __keyRequest: null, __analytics: [], __keptPhrases: [], __keptPhraseRows: new Map() })
  for (const [key, value] of Object.entries(fixture.localStorageSeed ?? {})) localStorage.setItem(key, value)
  HTMLMediaElement.prototype.play = async () => undefined

  createRoot(document.getElementById('root')!).render(
    <div className="theme-cosmos min-h-dvh">
      <MemoryRouter initialEntries={[fixture.scenario.route]}>
        <LocationProbe />
        <Routes>
          <Route path="/today" element={<Today />} />
          <Route path="/today/checkpoint" element={<GuidedCheckpoint />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </div>,
  )

  const ctx = new Ctx()
  let error = ''
  try { await fixture.run(ctx) } catch (caught: any) { error = String(caught?.stack ?? caught); ctx.check('fixture run completed', false, error) }
  ctx.check('no uncaught page errors', w.__pageErrors.length === 0, w.__pageErrors.join(' | '))
  w.__verdict = { id, name: fixture.name, status: ctx.passed ? 'pass' : 'fail', checks: ctx.checks, notes: ctx.notes, error, pageErrors: w.__pageErrors }
  document.getElementById('verdict')!.textContent = JSON.stringify(w.__verdict)
  w.__done = true
}

void main()
