/* eslint-disable */
// First Light fixture harness — page side.
//
// One fixture per document load (?f=<id>): the scenario is installed on
// window.__scenario BEFORE the first render, FirstLightHome mounts inside a
// MemoryRouter with the real hooks, and the fixture's scripted run drives the
// DOM and records checks. The node runner reads window.__fixtureList,
// window.__shotRequest, window.__done and window.__verdict over CDP.

import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import FirstLightHome from '@/components/home/FirstLightHome'
import GenerateGO from '@/pages/GenerateGO'
import PolishGlassLayout from '@/components/layout/PolishGlassLayout'
import { record } from './stubs/scenario'
import './harness.css'
import { FIXTURES } from './fixtures'
import { Ctx } from './utils'

const w = window as any

w.__fixtureList = FIXTURES.map((fixture) => ({
  id: fixture.id,
  name: fixture.name,
  viewport: fixture.viewport,
  reduceMotion: Boolean(fixture.reduceMotion),
  notRun: fixture.notRun ?? null,
}))

w.__pageErrors = []
window.addEventListener('error', (event) => {
  w.__pageErrors.push(String(event.message ?? event))
})
window.addEventListener('unhandledrejection', (event: any) => {
  w.__pageErrors.push(`unhandledrejection: ${String(event?.reason?.stack ?? event?.reason)}`)
})

function LocationProbe() {
  const location = useLocation()
  w.__location = `${location.pathname}${location.search}`
  return null
}

function Harness({ fixture }: { fixture: (typeof FIXTURES)[number] }) {
  const [language, setLanguage] = useState(fixture.language)
  useEffect(() => {
    w.__setLanguage = setLanguage
    w.__mounted = true
  }, [])

  return (
    <div className="theme-cosmos dashboard-cosmic px-4 md:px-6">
      <FirstLightHome
        userId="u1"
        activeLanguage={language}
        availableLanguages={['German', 'Polish', 'Korean']}
        onSelectLanguage={setLanguage}
        onAddLanguage={() => {}}
        deckHref="/deck/d1"
      />
    </div>
  )
}

async function main() {
  const params = new URLSearchParams(location.search)
  const id = params.get('f')
  if (!id) {
    document.title = 'first-light-fixtures: listing'
    w.__listReady = true
    return
  }

  const fixture = FIXTURES.find((entry) => entry.id === id)
  if (!fixture) {
    w.__verdict = { id, status: 'fail', error: `unknown fixture id ${id}`, checks: [], notes: [] }
    w.__done = true
    return
  }

  document.title = `first-light: ${fixture.id}`
  w.__scenario = fixture.scenario
  w.__inserts = []
  w.__calls = []
  // Native simulator runs keep WebKit's actual env(safe-area-inset-*) values.
  if (!params.has('native')) {
    document.documentElement.style.setProperty('--app-safe-top', `${fixture.safeArea?.top ?? 0}px`)
    document.documentElement.style.setProperty('--app-safe-bottom', `${fixture.safeArea?.bottom ?? 0}px`)
  }
  if (fixture.shell) {
    document.documentElement.className = 'theme-rainy-day skin-glassy dark'
    document.getElementById('app-topnav-right-slot')?.remove()
  }
  if (fixture.scenario.offlineGeneration) {
    // Exercise the real hooks and payloads, while preventing any service or
    // paid provider from receiving these fixture requests.
    window.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.origin)
      if (url.pathname === '/api/entitlements') {
        return Response.json({ plan: 'free', is_admin: false })
      }
      if (url.pathname === '/api/translate-and-ipa') {
        const payload = JSON.parse(String(init?.body ?? '{}'))
        record('api:translate-and-ipa', payload)
        await new Promise((resolve) => setTimeout(resolve, 900))
        if (fixture.scenario.translationFailsOnce && w.__calls.filter((call: any) => call.kind === 'api:translate-and-ipa').length === 1) {
          return Response.json({ error: 'Translation service unavailable' }, { status: 503 })
        }
        return Response.json({ items: payload.items.map((item: any) => ({ ...item, translation: `${item.word} meaning`, ipa: '/test/' })) })
      }
      throw new Error(`Unexpected fixture fetch: ${url.pathname}`)
    }
  }
  try {
    localStorage.clear()
    // useTodayMission caches the day's mission per tab — a previous fixture's
    // lesson must not leak into this one.
    sessionStorage.clear()
  } catch {}
  for (const [key, value] of Object.entries(fixture.localStorageSeed ?? {})) {
    localStorage.setItem(key, value)
  }

  createRoot(document.getElementById('root')!).render(
    <MemoryRouter initialEntries={[fixture.route ?? '/dashboard']}>
      <LocationProbe />
      <Routes>
        {fixture.shell ? <Route element={<PolishGlassLayout />}>
          <Route path="/dashboard" element={<Harness fixture={fixture} />} />
          <Route path="/generate" element={<GenerateGO />} />
          <Route path="/deck/:id" element={<div>Generated deck</div>} />
        </Route> : <>
        <Route path="/dashboard" element={<Harness fixture={fixture} />} />
        <Route path="/generate" element={<div className="theme-cosmos"><GenerateGO /></div>} />
        <Route path="/deck/:id" element={<div>Generated deck</div>} />
        </>}
      </Routes>
    </MemoryRouter>,
  )

  // Let the native simulator interact with real WKWebView focus and keyboard
  // behavior, without a scripted click racing the operator.
  if (params.has('manual')) return

  const ctx = new Ctx()
  let error = ''
  try {
    await fixture.run(ctx)
  } catch (caught: any) {
    error = String(caught?.stack ?? caught)
    ctx.check('fixture run completed', false, error)
  }

  ctx.check('no uncaught page errors', w.__pageErrors.length === 0, w.__pageErrors.join(' | '))

  const verdict = {
    id: fixture.id,
    name: fixture.name,
    status: ctx.passed ? 'pass' : 'fail',
    checks: ctx.checks,
    notes: ctx.notes,
    error,
    inserts: w.__inserts,
    pageErrors: w.__pageErrors,
  }
  w.__verdict = verdict
  document.getElementById('verdict')!.textContent = JSON.stringify(verdict)
  document.title = `first-light: ${fixture.id} ${verdict.status.toUpperCase()}`
  w.__done = true
}

void main()
