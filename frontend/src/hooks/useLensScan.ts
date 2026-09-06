import { useCallback, useEffect, useRef, useState } from 'react'
import { lensApiProvider } from '@/lib/lensApiProvider'
import type { LensScanProvider, LensScanRequest, LensScanResponse } from '@/lib/lensTypes'

export type LensScanStatus = 'idle' | 'loading' | 'success' | 'error'

function abortError(): DOMException {
  return new DOMException('Lens scan cancelled', 'AbortError')
}

export function useLensScan(provider: LensScanProvider = lensApiProvider) {
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const [status, setStatus] = useState<LensScanStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    if (mountedRef.current) setStatus('idle')
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
      abortRef.current = null
    }
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
        if (controller.signal.aborted || abortRef.current !== controller) throw abortError()
        abortRef.current = null
        if (mountedRef.current) setStatus('success')
        return result
      } catch (scanError) {
        const isCurrent = abortRef.current === controller
        const wasAborted = controller.signal.aborted
          || (scanError instanceof DOMException && scanError.name === 'AbortError')
        if (isCurrent) abortRef.current = null
        if (wasAborted) {
          if (isCurrent && mountedRef.current) setStatus('idle')
          throw scanError instanceof DOMException ? scanError : abortError()
        }
        // A superseded provider must never overwrite a newer scan's state.
        if (!isCurrent) throw abortError()
        const message = scanError instanceof Error ? scanError.message : 'Lens scan failed'
        if (mountedRef.current) {
          setError(message)
          setStatus('error')
        }
        throw scanError
      }
    },
    [provider],
  )

  return { scan, abort, status, error }
}
