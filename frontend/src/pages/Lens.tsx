import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, Check, ChevronDown, RotateCcw, Save, Volume2, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useLensScan } from '@/hooks/useLensScan'
import { useLensSave } from '@/hooks/useLensSave'
import { usePronunciation } from '@/hooks/usePronunciation'
import { useTranslation } from '@/hooks/useTranslation'
import { getLanguageCode } from '@/lib/languages'
import { isLensQuotaError } from '@/lib/lensApiProvider'
import { supabase } from '@/lib/supabase'
import type { LensScanItem, LensScanResponse } from '@/lib/lensTypes'

type LensViewState =
  | 'permission_pending'
  | 'permission_denied'
  | 'camera_ready'
  | 'frozen_analyzing'
  | 'result'
  | 'error'
  | 'offline'

type CapturedFrame = {
  previewUrl: string
  base64Jpeg: string
}

type RecapItem = LensScanItem & {
  id: string
  saved: boolean
  alreadyPresent?: boolean
}

type SaveNotice = {
  deckId: string
  kind: 'saved' | 'duplicate' | 'mixed'
  inserted: number
  skipped: number
}

type TorchMediaTrackCapabilities = MediaTrackCapabilities & {
  torch?: boolean
}

type TorchMediaTrackConstraintSet = MediaTrackConstraintSet & {
  torch?: boolean
}

type TorchMediaTrackConstraints = MediaTrackConstraints & {
  advanced?: TorchMediaTrackConstraintSet[]
}

const MAX_CAPTURE_EDGE = 1024
const JPEG_QUALITY = 0.8

function hasNonLatinText(value: string) {
  return Array.from(value).some((char) => (char.codePointAt(0) ?? 0) > 0x024f)
}

function frameToCanvas(video: HTMLVideoElement): CapturedFrame | null {
  const sourceWidth = video.videoWidth
  const sourceHeight = video.videoHeight
  if (!sourceWidth || !sourceHeight) return null

  const scale = Math.min(1, MAX_CAPTURE_EDGE / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null

  context.drawImage(video, 0, 0, width, height)
  const previewUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  return {
    previewUrl,
    base64Jpeg: previewUrl.split(',')[1] ?? previewUrl,
  }
}

function primaryItem(response: LensScanResponse | null, selectedIndex: number) {
  return response?.items[selectedIndex] ?? response?.items[0] ?? null
}

function normalizedWordKey(value: string) {
  return value.trim().toLocaleLowerCase()
}

export default function Lens() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const { activeLanguage } = useLanguage()
  const { scan, abort } = useLensScan()
  const { saveLensItems, status: saveStatus, error: saveError } = useLensSave()
  const { play } = usePronunciation()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const saveInFlightRef = useRef(false)
  const [viewState, setViewState] = useState<LensViewState>(
    typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'permission_pending',
  )
  const [capturedFrame, setCapturedFrame] = useState<CapturedFrame | null>(null)
  const [scanResult, setScanResult] = useState<LensScanResponse | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeItem, setActiveItem] = useState<LensScanItem | null>(null)
  const [exampleOpen, setExampleOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [recapItems, setRecapItems] = useState<RecapItem[]>([])
  const [showRecap, setShowRecap] = useState(false)
  const [existingWordHints, setExistingWordHints] = useState<Set<string>>(new Set())
  const [saveNotice, setSaveNotice] = useState<SaveNotice | null>(null)

  const targetLanguage = activeLanguage || 'German'
  const baseLanguage = profile?.base_language || 'English'
  const targetLangCode = getLanguageCode(targetLanguage) || undefined
  const selectedItem = useMemo(() => activeItem ?? primaryItem(scanResult, selectedIndex), [activeItem, scanResult, selectedIndex])
  const hasScans = recapItems.length > 0

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setTorchSupported(false)
    setTorchOn(false)
  }, [])

  const startCamera = useCallback(async () => {
    if (typeof navigator === 'undefined' || navigator.onLine === false) {
      setViewState('offline')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setViewState('permission_denied')
      return
    }

    setViewState('permission_pending')
    setErrorMessage(null)

    try {
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      const [track] = stream.getVideoTracks()
      const capabilities = track?.getCapabilities?.() as TorchMediaTrackCapabilities | undefined
      setTorchSupported(Boolean(capabilities?.torch))

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }

      setViewState('camera_ready')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : null)
      setViewState('permission_denied')
    }
  }, [stopCamera])

  useEffect(() => {
    const startupId = window.setTimeout(() => void startCamera(), 0)
    return () => {
      window.clearTimeout(startupId)
      abort()
      stopCamera()
    }
  }, [abort, startCamera, stopCamera])

  useEffect(() => {
    let cancelled = false
    if (!user || !targetLanguage) {
      setExistingWordHints(new Set())
      return
    }

    void (async () => {
      try {
        const { data } = await supabase.rpc('get_user_words_for_language', { p_target_language: targetLanguage })
        if (cancelled) return
        const words = Array.isArray(data) ? data : []
        setExistingWordHints(new Set(words.map((word) => normalizedWordKey(String(word)))))
      } catch {
        if (!cancelled) setExistingWordHints(new Set())
      }
    })()

    return () => {
      cancelled = true
    }
  }, [targetLanguage, user])

  useEffect(() => {
    if (existingWordHints.size === 0) return
    setRecapItems((items) => items.map((item) => (
      existingWordHints.has(normalizedWordKey(item.target_text))
        ? { ...item, alreadyPresent: true }
        : item
    )))
  }, [existingWordHints])

  useEffect(() => {
    const handleOffline = () => {
      abort()
      stopCamera()
      setViewState('offline')
    }
    const handleOnline = () => {
      void startCamera()
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [abort, startCamera, stopCamera])

  const resetForRescan = useCallback(() => {
    abort()
    setCapturedFrame(null)
    setScanResult(null)
    setSelectedIndex(0)
    setActiveItem(null)
    setExampleOpen(false)
    setErrorMessage(null)
    setSaveNotice(null)
    void startCamera()
  }, [abort, startCamera])

  const cancelScan = useCallback(() => {
    abort()
    setCapturedFrame(null)
    setScanResult(null)
    setSelectedIndex(0)
    setActiveItem(null)
    setExampleOpen(false)
    setErrorMessage(null)
    setViewState('camera_ready')
  }, [abort])

  const captureAndScan = useCallback(async () => {
    if (viewState !== 'camera_ready' || !videoRef.current) return
    if (navigator.onLine === false) {
      setViewState('offline')
      return
    }

    const frame = frameToCanvas(videoRef.current)
    if (!frame) {
      setErrorMessage(t('lens.error.captureFailed'))
      setViewState('error')
      return
    }

    setCapturedFrame(frame)
    setScanResult(null)
    setSelectedIndex(0)
    setActiveItem(null)
    setExampleOpen(false)
    setSaveNotice(null)
    setViewState('frozen_analyzing')

    try {
      const result = await scan({
        image: frame.base64Jpeg,
        targetLanguage,
        baseLanguage,
      })
      setScanResult(result)
      setViewState('result')
      if (result.items.length > 0) {
        setRecapItems((items) => [
          ...items,
          ...result.items.map((item, index) => ({
            ...item,
            id: `${Date.now()}-${index}`,
            saved: false,
            alreadyPresent: existingWordHints.has(normalizedWordKey(item.target_text)),
          })),
        ])
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setErrorMessage(isLensQuotaError(error) ? t('lens.error.quotaExceeded') : error instanceof Error ? error.message : t('lens.error.scanFailed'))
      setViewState('error')
    }
  }, [baseLanguage, existingWordHints, scan, t, targetLanguage, viewState])

  const toggleTorch = useCallback(async () => {
    const [track] = streamRef.current?.getVideoTracks() ?? []
    if (!track || !torchSupported) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] } as TorchMediaTrackConstraints)
      setTorchOn(next)
    } catch {
      setTorchSupported(false)
      setTorchOn(false)
    }
  }, [torchOn, torchSupported])

  const closeLens = useCallback(() => {
    if (hasScans) {
      setShowRecap(true)
      return
    }
    navigate('/dashboard')
  }, [hasScans, navigate])

  const markRecapItems = useCallback((itemsToMark: LensScanItem[], patch: Partial<Pick<RecapItem, 'saved' | 'alreadyPresent'>>) => {
    const keys = new Set(itemsToMark.map((item) => `${normalizedWordKey(item.target_text)}\u0000${normalizedWordKey(item.base_text)}`))
    setRecapItems((items) => items.map((item) => (
      keys.has(`${normalizedWordKey(item.target_text)}\u0000${normalizedWordKey(item.base_text)}`)
        ? { ...item, ...patch }
        : item
    )))
  }, [])

  const itemSavedInRecap = useCallback((item: LensScanItem) => recapItems.some((recapItem) => (
    recapItem.saved && recapItem.target_text === item.target_text && recapItem.base_text === item.base_text
  )), [recapItems])

  const itemAlreadyPresent = useCallback((item: LensScanItem) => (
    existingWordHints.has(normalizedWordKey(item.target_text))
    || recapItems.some((recapItem) => (
      recapItem.alreadyPresent && recapItem.target_text === item.target_text && recapItem.base_text === item.base_text
    ))
  ), [existingWordHints, recapItems])

  const markSkippedItemsAlreadyPresent = useCallback((itemsToMark: LensScanItem[]) => {
    markRecapItems(itemsToMark, { alreadyPresent: true })
    setExistingWordHints((words) => {
      const next = new Set(words)
      itemsToMark.forEach((item) => next.add(normalizedWordKey(item.target_text)))
      return next
    })
  }, [markRecapItems])

  const saveLensItemsAccurately = useCallback(async (itemsToSave: LensScanItem[]) => {
    const unsaved = itemsToSave.filter((item) => !itemSavedInRecap(item) && !itemAlreadyPresent(item))
    if (unsaved.length === 0) return
    if (saveInFlightRef.current) return

    saveInFlightRef.current = true
    setSaveNotice(null)
    try {
      const result = await saveLensItems({
        targetLanguage,
        baseLanguage,
        items: unsaved,
      })
      const allInserted = result.inserted === unsaved.length && result.skipped === 0
      const allSkipped = result.inserted === 0 && result.skipped > 0
      const mixed = result.inserted > 0 && result.skipped > 0

      if (allInserted) {
        markRecapItems(unsaved, { saved: true })
      } else if (allSkipped) {
        markSkippedItemsAlreadyPresent(unsaved)
      }

      setSaveNotice({
        deckId: result.deckId,
        kind: mixed ? 'mixed' : allSkipped ? 'duplicate' : 'saved',
        inserted: result.inserted,
        skipped: result.skipped,
      })
    } catch {
      // useLensSave exposes the user-facing error state.
    } finally {
      saveInFlightRef.current = false
    }
  }, [baseLanguage, itemAlreadyPresent, itemSavedInRecap, markRecapItems, markSkippedItemsAlreadyPresent, saveLensItems, targetLanguage])

  const saveSelectedToRecap = useCallback(async () => {
    if (!selectedItem) return
    await saveLensItemsAccurately([selectedItem])
  }, [saveLensItemsAccurately, selectedItem])

  const bulkSaveUnsaved = useCallback(async () => {
    await saveLensItemsAccurately(recapItems)
  }, [recapItems, saveLensItemsAccurately])

  const bulkSaveCurrentItems = useCallback(async () => {
    if (!scanResult) return
    await saveLensItemsAccurately(scanResult.items)
  }, [saveLensItemsAccurately, scanResult])

  const selectedSaved = Boolean(selectedItem && itemSavedInRecap(selectedItem))
  const selectedAlreadyPresent = Boolean(selectedItem && itemAlreadyPresent(selectedItem))
  const currentUnsavedCount = scanResult?.items.filter((item) => !itemSavedInRecap(item) && !itemAlreadyPresent(item)).length ?? 0
  const saveBusy = saveStatus === 'loading'
  const saveNoticeText = saveNotice
    ? saveNotice.kind === 'duplicate'
      ? t('lens.save.alreadyInVocabulary')
      : saveNotice.kind === 'mixed'
        ? t('lens.save.bulkMixed', { saved: saveNotice.inserted, known: saveNotice.skipped })
        : t('lens.save.confirmed')
    : null
  const recapSaveNoticeText = saveNotice
    ? saveNotice.kind === 'duplicate'
      ? t('lens.save.alreadyInVocabulary')
      : saveNotice.kind === 'mixed'
        ? t('lens.save.bulkMixed', { saved: saveNotice.inserted, known: saveNotice.skipped })
        : t('lens.save.bulkConfirmed', { count: saveNotice.inserted })
    : null

  return (
    <TooltipProvider>
      <div className="lens-shell">
        <div className="lens-camera-stage">
          {capturedFrame ? (
            <img className="lens-preview-media" src={capturedFrame.previewUrl} alt={t('lens.preview.frozenAlt')} />
          ) : (
            <video
              ref={videoRef}
              className="lens-preview-media"
              playsInline
              muted
              autoPlay
              onClick={captureAndScan}
              aria-label={t('lens.preview.label')}
            />
          )}
          <div className="lens-vignette" aria-hidden="true" />
          <div className="lens-reticle" aria-hidden="true" />

          <header className="lens-topbar">
            <button type="button" className="lens-icon-button" onClick={closeLens} aria-label={t('lens.action.close')}>
              <X aria-hidden="true" />
            </button>
            <div className="lens-title-block">
              <span className="lens-kicker">{t('lens.title')}</span>
              <span>{t('lens.subtitle', { language: targetLanguage })}</span>
            </div>
            <button
              type="button"
              className="lens-icon-button"
              onClick={toggleTorch}
              disabled={!torchSupported || viewState !== 'camera_ready'}
              aria-label={torchOn ? t('lens.action.torchOff') : t('lens.action.torchOn')}
              title={!torchSupported ? t('lens.torch.unsupported') : undefined}
            >
              <Zap aria-hidden="true" />
            </button>
          </header>

          {viewState === 'camera_ready' ? (
            <div className="lens-instruction">{t('lens.instruction')}</div>
          ) : null}

          <div className="lens-bottom-controls">
            {viewState === 'camera_ready' ? (
              <button type="button" className="lens-shutter" onClick={captureAndScan} aria-label={t('lens.action.capture')}>
                <Camera aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        {viewState === 'permission_pending' ? (
          <StatusSheet title={t('lens.permission.pendingTitle')} body={t('lens.permission.pendingBody')} />
        ) : null}

        {viewState === 'permission_denied' ? (
          <StatusSheet
            title={t('lens.permission.deniedTitle')}
            body={t('lens.permission.deniedBody')}
            action={<Button onClick={startCamera}>{t('common.retry')}</Button>}
          />
        ) : null}

        {viewState === 'offline' ? (
          <StatusSheet
            title={t('lens.offline.title')}
            body={t('lens.offline.body')}
            action={<Button onClick={startCamera}>{t('common.retry')}</Button>}
          />
        ) : null}

        {viewState === 'frozen_analyzing' ? (
          <StatusSheet
            title={t('lens.analyzing.title')}
            body={t('lens.analyzing.body')}
            loading
            action={<Button onClick={cancelScan} variant="secondary">{t('common.cancel')}</Button>}
          />
        ) : null}

        {viewState === 'error' ? (
          <StatusSheet
            title={t('lens.error.title')}
            body={errorMessage || t('lens.error.scanFailed')}
            action={<Button onClick={resetForRescan}>{t('lens.action.rescan')}</Button>}
          />
        ) : null}

        {viewState === 'result' && scanResult?.safety ? (
          <StatusSheet
            title={t('lens.safety.title')}
            body={t('lens.safety.person')}
            action={<Button onClick={resetForRescan}>{t('lens.action.rescan')}</Button>}
          />
        ) : null}

        {viewState === 'result' && !scanResult?.safety && !selectedItem ? (
          <StatusSheet
            title={t('lens.empty.title')}
            body={scanResult?.kind === 'unsupported' ? t('lens.empty.unsupportedBody') : t('lens.empty.body')}
            action={<Button onClick={resetForRescan}>{t('lens.action.rescan')}</Button>}
          />
        ) : null}

        {viewState === 'result' && !scanResult?.safety && selectedItem ? (
          <section className="lens-result-sheet" aria-live="polite">
            {scanResult && scanResult.items.length > 1 ? (
              <div className="lens-item-list" aria-label={t('lens.result.itemsLabel')}>
                {scanResult.items.map((item, index) => (
                  <div
                    key={`${item.target_text}-${index}`}
                    className={`lens-item-row${index === selectedIndex && !activeItem ? ' lens-item-row--active' : ''}`}
                  >
                    <button
                      type="button"
                      className="lens-item-select"
                      onClick={() => {
                        setSelectedIndex(index)
                        setActiveItem(null)
                        setExampleOpen(false)
                      }}
                    >
                      <span>{item.target_text}</span>
                      <span>{itemSavedInRecap(item) ? t('lens.action.saved') : itemAlreadyPresent(item) ? t('lens.action.alreadySaved') : item.base_text}</span>
                    </button>
                    <button
                      type="button"
                      className="lens-row-save-button"
                      onClick={() => void saveLensItemsAccurately([item])}
                      disabled={saveBusy || itemSavedInRecap(item) || itemAlreadyPresent(item)}
                      aria-label={itemSavedInRecap(item) || itemAlreadyPresent(item) ? t('lens.action.alreadySaved') : t('lens.action.save')}
                    >
                      {itemSavedInRecap(item) || itemAlreadyPresent(item) ? <Check aria-hidden="true" /> : <Save aria-hidden="true" />}
                    </button>
                  </div>
                ))}
                <Button type="button" size="sm" variant="secondary" onClick={bulkSaveCurrentItems} disabled={saveBusy || currentUnsavedCount === 0}>
                  {saveBusy ? t('common.loading') : t('lens.action.saveAll', { count: currentUnsavedCount })}
                </Button>
              </div>
            ) : null}

            {selectedItem.confidence === 'low' ? (
              <div className="lens-confidence">{t('lens.result.lowConfidence')}</div>
            ) : null}

            <div className="lens-word-row">
              <div>
                <h1>{selectedItem.target_text}</h1>
                {selectedItem.transliteration && hasNonLatinText(selectedItem.target_text) ? (
                  <p className="lens-transliteration">{selectedItem.transliteration}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="lens-speak-button"
                onClick={() => void play({ text: selectedItem.target_text, lang: targetLangCode })}
                aria-label={t('lens.action.speak')}
              >
                <Volume2 aria-hidden="true" />
              </button>
            </div>

            <p className="lens-base-text">{selectedItem.base_text}</p>

            <div className="lens-chip-row">
              {selectedItem.article ? <span className="lens-chip">{selectedItem.article}</span> : null}
              {selectedItem.pos ? <span className="lens-chip">{selectedItem.pos}</span> : null}
              <span className="lens-chip">{t(`lens.confidence.${selectedItem.confidence}`)}</span>
            </div>

            {selectedItem.example ? (
              <button type="button" className="lens-example-toggle" onClick={() => setExampleOpen((open) => !open)}>
                <span>{t('lens.result.example')}</span>
                <ChevronDown className={exampleOpen ? 'lens-chevron lens-chevron--open' : 'lens-chevron'} aria-hidden="true" />
              </button>
            ) : null}

            {exampleOpen && selectedItem.example ? (
              <div className="lens-example">
                <p>{selectedItem.example}</p>
                {selectedItem.example_gloss ? <span>{selectedItem.example_gloss}</span> : null}
              </div>
            ) : null}

            {selectedItem.alternates?.length ? (
              <div className="lens-alternates" aria-label={t('lens.result.alternates')}>
                {selectedItem.alternates.slice(0, 2).map((alternate) => (
                  <button
                    key={`${alternate.target_text}-${alternate.base_text}`}
                    type="button"
                    className="lens-alternate-chip"
                    onClick={() => {
                      setActiveItem({
                        ...selectedItem,
                        target_text: alternate.target_text,
                        base_text: alternate.base_text,
                        confidence: 'medium',
                        alternates: undefined,
                      })
                      setExampleOpen(false)
                    }}
                  >
                    {alternate.target_text}
                  </button>
                ))}
              </div>
            ) : null}

            {selectedAlreadyPresent && !saveNotice ? (
              <p className="lens-save-note">{t('lens.save.alreadyHint')}</p>
            ) : null}

            {saveNotice ? (
              <div className="lens-save-confirmation">
                <span>{saveNoticeText}</span>
                <Link to={`/deck/${saveNotice.deckId}`}>{t('lens.save.openDeck')}</Link>
              </div>
            ) : null}

            {saveError ? <p className="lens-save-error">{saveError}</p> : null}

            <div className="lens-actions">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" onClick={saveSelectedToRecap} variant="secondary" disabled={saveBusy || selectedSaved || selectedAlreadyPresent}>
                    {selectedSaved || selectedAlreadyPresent ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                    {saveBusy
                      ? t('common.loading')
                      : selectedSaved
                        ? t('lens.action.saved')
                        : selectedAlreadyPresent
                          ? t('lens.action.alreadySaved')
                          : t('lens.action.save')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('lens.action.saveTooltip')}</TooltipContent>
              </Tooltip>
              <Button type="button" onClick={resetForRescan}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('lens.action.rescan')}
              </Button>
            </div>
          </section>
        ) : null}

        {showRecap ? (
          <div className="lens-recap-backdrop" role="dialog" aria-modal="true" aria-labelledby="lens-recap-title">
            <section className="lens-recap">
              <h2 id="lens-recap-title">{t('lens.recap.title')}</h2>
              <p>{t('lens.recap.body', { count: recapItems.length })}</p>
              <div className="lens-recap-list">
                {recapItems.map((item) => (
                  <div key={item.id} className="lens-recap-row">
                    <span>{item.target_text}</span>
                    <span>{item.saved ? t('lens.recap.saved') : item.alreadyPresent ? t('lens.recap.alreadyPresent') : item.base_text}</span>
                  </div>
                ))}
              </div>
              {saveNotice ? (
                <div className="lens-save-confirmation">
                  <span>{recapSaveNoticeText}</span>
                  <Link to={`/deck/${saveNotice.deckId}`}>{t('lens.save.openDeck')}</Link>
                </div>
              ) : null}
              {saveError ? <p className="lens-save-error">{saveError}</p> : null}
              <div className="lens-actions">
                <Button type="button" variant="secondary" onClick={() => setShowRecap(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="button" onClick={bulkSaveUnsaved} disabled={saveBusy || recapItems.every((item) => item.saved || item.alreadyPresent)}>
                  {saveBusy ? t('common.loading') : t('lens.recap.saveUnsaved')}
                </Button>
                <Button asChild>
                  <Link to="/dashboard">{t('lens.recap.exit')}</Link>
                </Button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  )
}

function StatusSheet({
  title,
  body,
  action,
  loading = false,
}: {
  title: string
  body: string
  action?: React.ReactNode
  loading?: boolean
}) {
  return (
    <section className="lens-status-sheet" aria-live="polite">
      {loading ? <div className="lens-loading-bar" aria-hidden="true" /> : null}
      <h1>{title}</h1>
      <p>{body}</p>
      {action ? <div className="lens-status-action">{action}</div> : null}
    </section>
  )
}
