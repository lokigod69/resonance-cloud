import { useCallback, useRef, useState } from 'react'
import { lensApiProvider } from '@/lib/lensApiProvider'
import type { LensScanProvider, LensScanRequest, LensScanResponse } from '@/lib/lensTypes'

export type LensScanStatus = 'idle' | 'loading' | 'success' | 'error'

export function useLensScan(provider: LensScanProvider = lensApiProvider) {
  const abortRef = useRef<AbortController | null>(null)
  const [status, setStatus] = useState<LensScanStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus('idle')
  }, [])

  const scan = useCallback(
    async (request: LensScanRequest): Promise<LensScanResponse> => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setStatus('loading')
      setError(null)

      try {
        const result = await provider.scan(request, { signal: controller.signal })
        if (abortRef.current === controller) abortRef.current = null
        setStatus('success')
        return result
      } catch (scanError) {
        if (abortRef.current === controller) abortRef.current = null
        if (scanError instanceof DOMException && scanError.name === 'AbortError') {
          setStatus('idle')
          throw scanError
        }
        const message = scanError instanceof Error ? scanError.message : 'Lens scan failed'
        setError(message)
        setStatus('error')
        throw scanError
      }
    },
    [provider],
  )

  return { scan, abort, status, error }
}
