/* eslint-disable */
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Speak from '@/pages/Speak'
import Lens from '@/pages/Lens'
import PolishGlassLayout from '@/components/layout/PolishGlassLayout'
import './harness.css'
import { FIXTURES } from './fixtures'
import { Ctx } from './utils'

const w = window as any
w.__fixtureList = FIXTURES.map(({ id, name, viewport, reduceMotion }) => ({ id, name, viewport, reduceMotion: Boolean(reduceMotion) }))
w.__pageErrors = []
window.addEventListener('error', (event) => w.__pageErrors.push(String(event.message ?? event)))
window.addEventListener('unhandledrejection', (event: any) => w.__pageErrors.push(`unhandledrejection: ${String(event?.reason?.stack ?? event?.reason)}`))

function installBrowserFakes() {
  w.__cameraStreams = []
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => {
    const stream = new MediaStream()
    w.__cameraStreams.push(stream)
    return stream
  } } })
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 1280 })
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 720 })
  HTMLMediaElement.prototype.play = async () => undefined
  HTMLCanvasElement.prototype.getContext = (() => ({ drawImage() {} })) as any
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
  if (!('speechSynthesis' in globalThis)) Object.defineProperty(globalThis, 'speechSynthesis', { value: { getVoices: () => [], cancel() {} } })
}

async function main() {
  const id = new URLSearchParams(location.search).get('f')
  if (!id) { w.__listReady = true; return }
  const fixture = FIXTURES.find((entry) => entry.id === id)
  if (!fixture) { w.__done = true; w.__verdict = { id, status: 'fail', checks: [] }; return }
  localStorage.clear()
  sessionStorage.clear()
  Object.assign(w, {
    __scenario: fixture.scenario,
    __shotRequest: null,
    __keyRequest: null,
    __replayCalls: 0,
    __lensHintRequests: [],
    __lensHintResponses: [],
    __lensSaveCalls: [],
  })
  for (const [key, value] of Object.entries(fixture.localStorageSeed ?? {})) localStorage.setItem(key, value)
  installBrowserFakes()
  const reactRoot = createRoot(document.getElementById('root')!)
  w.__unmountApp = () => reactRoot.unmount()
  reactRoot.render(
    <div className="theme-cosmos min-h-dvh">
      <MemoryRouter initialEntries={[fixture.scenario.kind === 'speak' ? '/speak' : '/lens']}>
        <Routes>
          <Route element={<PolishGlassLayout />}>
            <Route path="/speak" element={<Speak />} />
          </Route>
          <Route path="/lens" element={<Lens />} />
          <Route path="/dashboard" element={<div className="p-8">Dashboard</div>} />
          <Route path="/plans" element={<div>Plans</div>} />
          <Route path="/deck/:id" element={<div>Deck</div>} />
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
