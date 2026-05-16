import { useState, useCallback, useRef } from 'react'
import { X } from 'lucide-react'
import { ToastContext, type ToastType } from './Toast'

interface ToastItem { id: number; message: string; type: ToastType }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId.current
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  const dismiss = (id: number) => setToasts(t => t.filter(x => x.id !== id))

  const colors: Record<ToastType, string> = {
    success: 'var(--success)',
    error: 'var(--error)',
    info: 'var(--info)',
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg-card)] border text-sm text-[var(--text-primary)] shadow-lg animate-[fadeIn_0.15s_ease-out]"
            style={{ borderColor: colors[t.type] }}
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors[t.type] }} />
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex-shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
