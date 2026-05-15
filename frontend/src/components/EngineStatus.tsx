import { useEffect, useState } from 'react'
import { getEnginesHealth, type EngineHealth } from '../api'
import { RefreshCw } from 'lucide-react'

export function EngineStatus() {
  const [engines, setEngines] = useState<EngineHealth[]>([])
  const [checking, setChecking] = useState(false)

  const check = async () => {
    setChecking(true)
    try {
      const data = await getEnginesHealth()
      setEngines(data)
    } catch { /* noop: engines remain in last-known state on transient failure */ }
    setChecking(false)
  }

  useEffect(() => { check() }, [])

  return (
    <div className="flex items-center gap-3">
      {engines.map(e => (
        <div key={e.name} className="flex items-center gap-1.5 text-xs" title={`${e.name} — ${e.url}`}>
          <div
            className={`w-2 h-2 rounded-full ${e.reachable ? 'bg-[var(--success)]' : 'bg-[var(--error)]'}`}
            style={{ boxShadow: e.reachable ? '0 0 6px var(--success)' : 'none' }}
          />
          <span className="text-[var(--text-muted)] hidden xl:inline">{e.name.split(' ')[0]}</span>
        </div>
      ))}
      <button
        onClick={check}
        disabled={checking}
        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        title="Refresh engine status"
      >
        <RefreshCw size={12} className={checking ? 'animate-spin' : ''} />
      </button>
    </div>
  )
}
