import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, Check, ChevronDown, RotateCcw, Save, Volume2, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useSpeakModalFocus } from '@/components/speak/useSpeakModalFocus'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useLensScan } from '@/hooks/useLensScan'
import { useLensSave } from '@/hooks/useLensSave'
import { usePronunciation } from '@/hooks/usePronunciation'
import { useTranslation } from '@/hooks/useTranslation'
import { canonicalizeLanguageValue, getLanguageCode } from '@/lib/languages'
import { lensErrorTranslationKey } from '@/lib/lensApiProvider'
import { classifyLensCameraFailure, lensCameraErrorTranslationKey } from '@/lib/lensCamera'
import { lensItemFromAlternate } from '@/lib/lensSelection'
import {
  combineLensSaveReceipts,
  reconcileLensSaveResult,
  type LensSaveReceipt,
  type LensSaveResult,
} from '@/lib/lensSaveMapping'
import { supabase } from '@/lib/supabase'
import type { LensAlternate, LensScanItem, LensScanResponse } from '@/lib/lensTypes'

type LensViewState =
  | 'permission_pending'
  | 'permission_denied'
  | 'camera_unavailable'
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
  language: string
  baseLanguage: string
  saved: boolean
  alreadyPresent?: boolean
  wordId?: string
}

type ExistingWordHints = {
  userId: string
  language: string
  words: Set<string>
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
// The scan crop covers the reticle circle plus surrounding context, so the
// model sees the aimed-at subject with its edges intact — not the whole room.
const RETICLE_CROP_CONTEXT = 1.35

type VideoRegion = { sx: number; sy: number; sw: number; sh: number }

function hasNonLatinText(value: string) {
  return Array.from(value).some((char) => (char.codePointAt(0) ?? 0) > 0x024f)
}

function drawVideoRegion(video: HTMLVideoElement, region: VideoRegion): string | null {
  const scale = Math.min(1, MAX_CAPTURE_EDGE / Math.max(region.sw, region.sh))
  const width = Math.max(1, Math.round(region.sw * scale))
  const height = Math.max(1, Math.round(region.sh * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null

  context.drawImage(video, region.sx, region.sy, region.sw, region.sh, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

// Maps the on-screen reticle circle back to intrinsic video pixels. The
// preview uses object-fit: cover — the source is scaled to fill the stage and
// center-cropped — so the mapping undoes that scale and offset.
function reticleRegion(video: HTMLVideoElement, reticle: HTMLElement | null): VideoRegion | null {
  if (!reticle) return null
  const sourceWidth = video.videoWidth
  const sourceHeight = video.videoHeight
  const stage = video.getBoundingClientRect()
  const ring = reticle.getBoundingClientRect()
  if (!stage.width || !stage.height || !ring.width) return null

  const scale = Math.max(stage.width / sourceWidth, stage.height / sourceHeight)
  const offsetX = (sourceWidth * scale - stage.width) / 2
  const offsetY = (sourceHeight * scale - stage.height) / 2
  const centerX = (ring.left - stage.left + ring.width / 2 + offsetX) / scale
  const centerY = (ring.top - stage.top + ring.height / 2 + offsetY) / scale
  const size = Math.min((ring.width * RETICLE_CROP_CONTEXT) / scale, sourceWidth, sourceHeight)
  const sx = Math.min(Math.max(centerX - size / 2, 0), sourceWidth - size)
  const sy = Math.min(Math.max(centerY - size / 2, 0), sourceHeight - size)
  return { sx, sy, sw: size, sh: size }
}

function frameToCanvas(video: HTMLVideoElement, reticle: HTMLElement | null): CapturedFrame | null {
  const sourceWidth = video.videoWidth
  const sourceHeight = video.videoHeight
  if (!sourceWidth || !sourceHeight) return null

  const fullFrame = drawVideoRegion(video, { sx: 0, sy: 0, sw: sourceWidth, sh: sourceHeight })
  if (!fullFrame) return null

  // The frozen preview keeps the full frame (no zoom jump for the user); the
  // scan payload is the reticle crop so the model reads the learner's intent.
  const region = reticleRegion(video, reticle)
  const scanFrame = (region ? drawVideoRegion(video, region) : null) ?? fullFrame
  return {
    previewUrl: fullFrame,
    base64Jpeg: scanFrame.split(',')[1] ?? scanFrame,
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
  const { activeLanguage, setActiveLanguage, languageReady } = useLanguage()
  const { scan, abort } = useLensScan()
  const { saveLensItems, status: saveStatus, error: saveError } = useLensSave()
  const { play } = usePronunciation()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const reticleRef = useRef<HTMLDivElement | null>(null)
  const recapDialogRef = useRef<HTMLElement | null>(null)
  const languageTriggerRef = useRef<HTMLButtonElement | null>(null)
  const languageOptionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const streamRef = useRef<MediaStream | null>(null)
  const mountedRef = useRef(true)
  const cameraRequestRef = useRef(0)
  const scanRequestRef = useRef(0)
  const wordHintsRequestRef = useRef(0)
  const targetLanguageRef = useRef('')
  const userIdRef = useRef('')
  const currentRecapIdsRef = useRef<string[]>([])
  const recapSequenceRef = useRef(0)
  const resumeCameraAfterRecapRef = useRef(false)
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
  const existingWordHintsRef = useRef<ExistingWordHints>({ userId: '', language: '', words: new Set() })
  const [existingWordHints, setExistingWordHints] = useState<ExistingWordHints>(existingWordHintsRef.current)
  const [saveNotice, setSaveNotice] = useState<LensSaveReceipt | null>(null)
  const [lensLanguages, setLensLanguages] = useState<string[]>([])
  const [langMenuOpen, setLangMenuOpen] = useState(false)

  const targetLanguage = activeLanguage?.trim() ?? ''
  const baseLanguage = profile?.base_language?.trim() ?? ''
  const scanLanguagesReady = languageReady && targetLanguage.length > 0 && baseLanguage.length > 0
  const targetLangCode = getLanguageCode(targetLanguage) || undefined
  const baseLangCode = getLanguageCode(baseLanguage) || undefined
  const lensSubtitle = scanLanguagesReady
    ? t('lens.subtitle', { language: t(`langName.${targetLanguage}`) })
    : t('common.loading')
  const selectedItem = useMemo(() => activeItem ?? primaryItem(scanResult, selectedIndex), [activeItem, scanResult, selectedIndex])
  const hasScans = recapItems.length > 0
  targetLanguageRef.current = targetLanguage
  userIdRef.current = user?.id ?? ''

  const commitExistingWordHints = useCallback((next: ExistingWordHints) => {
    existingWordHintsRef.current = next
    setExistingWordHints(next)
  }, [])

  const hasExistingWordHint = useCallback((language: string, word: string) => {
    const hints = existingWordHintsRef.current
    return hints.userId === userIdRef.current
      && hints.language === language
      && hints.words.has(normalizedWordKey(word))
  }, [])

  const stopCamera = useCallback((updateUi = true) => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (updateUi && mountedRef.current) {
      setTorchSupported(false)
      setTorchOn(false)
    }
  }, [])

  // A frozen capture temporarily unmounts the <video>. When it mounts again,
  // attach whichever stream won the camera request race, including an
  // immediately resolved getUserMedia promise.
  const attachVideo = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node
    const stream = streamRef.current
    if (!node || !stream) return
    node.srcObject = stream
    void node.play().catch((error) => {
      if (!mountedRef.current || streamRef.current !== stream) return
      stopCamera()
      setErrorMessage(t(lensCameraErrorTranslationKey(classifyLensCameraFailure(error))))
      setViewState('camera_unavailable')
    })
  }, [stopCamera, t])

  const startCamera = useCallback(async () => {
    if (!scanLanguagesReady) {
      cameraRequestRef.current += 1
      stopCamera()
      setErrorMessage(null)
      setViewState('permission_pending')
      return
    }

    if (typeof navigator === 'undefined' || navigator.onLine === false) {
      setViewState('offline')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(t(lensCameraErrorTranslationKey('unsupported')))
      setViewState('camera_unavailable')
      return
    }

    const requestId = ++cameraRequestRef.current
    setViewState('permission_pending')
    setErrorMessage(null)

    let stream: MediaStream | null = null
    try {
      stopCamera()
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      })
      if (!mountedRef.current || requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      const [track] = stream.getVideoTracks()
      const capabilities = track?.getCapabilities?.() as TorchMediaTrackCapabilities | undefined
      setTorchSupported(Boolean(capabilities?.torch))

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      if (!mountedRef.current || requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        if (streamRef.current === stream) streamRef.current = null
        return
      }
      setViewState('camera_ready')
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop())
      if (!mountedRef.current || requestId !== cameraRequestRef.current) return
      const failure = classifyLensCameraFailure(error)
      if (failure === 'permission') {
        setErrorMessage(null)
        setViewState('permission_denied')
      } else {
        setErrorMessage(t(lensCameraErrorTranslationKey(failure)))
        setViewState('camera_unavailable')
      }
    }
  }, [scanLanguagesReady, stopCamera, t])

  useEffect(() => {
    mountedRef.current = true
    const startupId = window.setTimeout(() => void startCamera(), 0)
    return () => {
      mountedRef.current = false
      cameraRequestRef.current += 1
      scanRequestRef.current += 1
      window.clearTimeout(startupId)
      abort()
      stopCamera(false)
    }
  }, [abort, startCamera, stopCamera])

  // Prime the async speech-voice list early so tap-to-speak can pick a real
  // voice on first use (iOS Safari reports [] until warmed), and stop any
  // in-flight utterance when leaving Lens. Same pattern as Script Lab.
  useEffect(() => {
    if (!('speechSynthesis' in globalThis)) return
    globalThis.speechSynthesis.getVoices()
    return () => globalThis.speechSynthesis.cancel()
  }, [])

  // Languages the learner can switch to without leaving Lens: deck-derived
  // plus the picker-added ones — the same union the dashboard shows.
  useEffect(() => {
    if (!user) {
      setLensLanguages([])
      return
    }
    let cancelled = false
    void (async () => {
      let deckLanguages: string[] = []
      try {
        const { data } = await supabase.from('decks').select('target_language').eq('user_id', user.id)
        deckLanguages = (data ?? [])
          .map((row) => canonicalizeLanguageValue(row.target_language))
          .filter(Boolean)
      } catch {
        deckLanguages = []
      }
      let added: string[] = []
      try {
        const raw = localStorage.getItem(`lingwave_added_languages_${user.id}`)
        const parsed = raw ? (JSON.parse(raw) as unknown) : []
        added = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
      } catch {
        added = []
      }
      if (!cancelled) setLensLanguages(Array.from(new Set([...deckLanguages, ...added])))
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    const requestId = ++wordHintsRequestRef.current
    const requestUserId = user?.id ?? ''
    const requestLanguage = targetLanguage
    commitExistingWordHints({ userId: requestUserId, language: requestLanguage, words: new Set() })

    if (!requestUserId || !targetLanguage) {
      return
    }

    void (async () => {
      try {
        const { data } = await supabase.rpc('get_user_words_for_language', { p_target_language: requestLanguage })
        if (
          requestId !== wordHintsRequestRef.current
          || requestUserId !== userIdRef.current
          || requestLanguage !== targetLanguageRef.current
        ) return
        const words = Array.isArray(data) ? data : []
        const fetched = new Set(words.map((word) => normalizedWordKey(String(word))))
        const current = existingWordHintsRef.current
        if (current.userId === requestUserId && current.language === requestLanguage) {
          current.words.forEach((word) => fetched.add(word))
        }
        commitExistingWordHints({ userId: requestUserId, language: requestLanguage, words: fetched })
      } catch {
        // The scope was cleared before the request. Keep any same-scope words
        // learned from a successful save while this lookup was pending.
      }
    })()

    return () => {
      if (wordHintsRequestRef.current === requestId) wordHintsRequestRef.current += 1
    }
  }, [commitExistingWordHints, targetLanguage, user?.id])

  useEffect(() => {
    if (
      existingWordHints.userId !== (user?.id ?? '')
      || existingWordHints.language !== targetLanguage
    ) return
    setRecapItems((items) => items.map((item) => (
      item.language === targetLanguage && !item.saved
        ? { ...item, alreadyPresent: existingWordHints.words.has(normalizedWordKey(item.target_text)) }
        : item
    )))
  }, [existingWordHints, targetLanguage, user?.id])

  useEffect(() => {
    const handleOffline = () => {
      cameraRequestRef.current += 1
      scanRequestRef.current += 1
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

  useEffect(() => {
    const suspendCamera = () => {
      cameraRequestRef.current += 1
      stopCamera()
    }
    const resumeCamera = () => {
      if ((viewState === 'camera_ready' || viewState === 'permission_pending') && !streamRef.current) {
        void startCamera()
      }
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') suspendCamera()
      else resumeCamera()
    }
    window.addEventListener('pagehide', suspendCamera)
    window.addEventListener('pageshow', resumeCamera)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('pagehide', suspendCamera)
      window.removeEventListener('pageshow', resumeCamera)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [startCamera, stopCamera, viewState])

  const resetForRescan = useCallback(() => {
    scanRequestRef.current += 1
    abort()
    setCapturedFrame(null)
    setScanResult(null)
    setSelectedIndex(0)
    setActiveItem(null)
    currentRecapIdsRef.current = []
    setExampleOpen(false)
    setErrorMessage(null)
    setSaveNotice(null)
    void startCamera()
  }, [abort, startCamera])

  const cancelScan = useCallback(() => {
    scanRequestRef.current += 1
    abort()
    setCapturedFrame(null)
    setScanResult(null)
    setSelectedIndex(0)
    setActiveItem(null)
    currentRecapIdsRef.current = []
    setExampleOpen(false)
    setErrorMessage(null)
    void startCamera()
  }, [abort, startCamera])

  const captureAndScan = useCallback(async () => {
    if (!scanLanguagesReady || viewState !== 'camera_ready' || !videoRef.current) return
    if (navigator.onLine === false) {
      setViewState('offline')
      return
    }

    const frame = frameToCanvas(videoRef.current, reticleRef.current)
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
    stopCamera()
    const requestId = ++scanRequestRef.current
    const requestLanguage = targetLanguage

    try {
      const result = await scan({
        image: frame.base64Jpeg,
        targetLanguage,
        baseLanguage,
      })
      if (requestId !== scanRequestRef.current || requestLanguage !== targetLanguageRef.current) return
      setScanResult(result)
      setViewState('result')
      if (result.items.length > 0) {
        const recapEntries = result.items.map((item) => ({
          ...item,
          id: `lens-${Date.now()}-${++recapSequenceRef.current}`,
          language: targetLanguage,
          baseLanguage,
          saved: false,
          alreadyPresent: hasExistingWordHint(requestLanguage, item.target_text),
        }))
        currentRecapIdsRef.current = recapEntries.map((item) => item.id)
        setRecapItems((items) => [
          ...items,
          ...recapEntries,
        ])
      }
    } catch (error) {
      if (requestId !== scanRequestRef.current || requestLanguage !== targetLanguageRef.current) return
      if (error instanceof DOMException && error.name === 'AbortError') return
      setErrorMessage(t(lensErrorTranslationKey(error)))
      setViewState('error')
    }
  }, [baseLanguage, hasExistingWordHint, scan, scanLanguagesReady, stopCamera, t, targetLanguage, viewState])

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
      // A learner can open the recap after returning to the live preview. Do
      // not leave the camera or a pending permission request running behind
      // the inert dialog; resume only if they cancel back into Lens.
      resumeCameraAfterRecapRef.current = viewState === 'camera_ready' || viewState === 'permission_pending'
      cameraRequestRef.current += 1
      stopCamera()
      setLangMenuOpen(false)
      setShowRecap(true)
      return
    }
    navigate('/dashboard')
  }, [hasScans, navigate, stopCamera, viewState])

  const closeRecap = useCallback(() => {
    setShowRecap(false)
    if (!resumeCameraAfterRecapRef.current) return
    resumeCameraAfterRecapRef.current = false
    void startCamera()
  }, [startCamera])

  useSpeakModalFocus({
    open: showRecap,
    dialogRef: recapDialogRef,
    onClose: closeRecap,
    initialFocusSelector: '[data-lens-recap-initial-focus]',
  })

  const recapItemsById = useMemo(
    () => new Map(recapItems.map((item) => [item.id, item])),
    [recapItems],
  )

  const saveLensItemsAccurately = useCallback(async (itemsToSave: RecapItem[]): Promise<LensSaveResult | null> => {
    const unsaved = itemsToSave.filter((item) => !item.saved && !item.alreadyPresent)
    if (unsaved.length === 0 || saveInFlightRef.current) return null

    const saveLanguage = unsaved[0].language
    const saveBaseLanguage = unsaved[0].baseLanguage
    const saveUserId = userIdRef.current
    if (unsaved.some((item) => item.language !== saveLanguage || item.baseLanguage !== saveBaseLanguage)) {
      throw new Error('Lens save batch contains mixed language metadata')
    }

    saveInFlightRef.current = true
    try {
      const result = await saveLensItems({
        targetLanguage: saveLanguage,
        baseLanguage: saveBaseLanguage,
        items: unsaved.map((item) => ({ clientId: item.id, item })),
      })
      const allSkipped = result.inserted === 0 && result.skipped > 0

      // Count-only legacy RPCs are safe to reconcile only when every row had
      // the same result. The helper never infers row identities from mixed counts.
      setRecapItems((items) => reconcileLensSaveResult(items, unsaved.map((item) => item.id), result))

      const settledItems = result.outcomes || allSkipped || result.inserted === unsaved.length
        ? unsaved
        : []
      if (
        saveUserId === userIdRef.current
        && saveLanguage === targetLanguageRef.current
        && settledItems.length > 0
      ) {
        const current = existingWordHintsRef.current
        const next = current.userId === userIdRef.current && current.language === saveLanguage
          ? new Set(current.words)
          : new Set<string>()
        settledItems.forEach((item) => next.add(normalizedWordKey(item.target_text)))
        commitExistingWordHints({ userId: saveUserId, language: saveLanguage, words: next })
      }
      return result
    } catch {
      // useLensSave exposes the localized user-facing error state. Successful
      // earlier language groups remain marked, so retry sends only unresolved rows.
      return null
    } finally {
      saveInFlightRef.current = false
    }
  }, [commitExistingWordHints, saveLensItems])

  const publishSaveNotice = useCallback((language: string, result: LensSaveResult | null) => {
    setSaveNotice(result ? combineLensSaveReceipts([{ language, result }]) : null)
  }, [])

  const saveSelectedToRecap = useCallback(async () => {
    const selectedRecapId = currentRecapIdsRef.current[selectedIndex]
    const selectedRecapItem = selectedRecapId ? recapItemsById.get(selectedRecapId) : null
    if (!selectedRecapItem) return
    setSaveNotice(null)
    const result = await saveLensItemsAccurately([selectedRecapItem])
    publishSaveNotice(selectedRecapItem.language, result)
  }, [publishSaveNotice, recapItemsById, saveLensItemsAccurately, selectedIndex])

  const bulkSaveUnsaved = useCallback(async () => {
    // Recap rows retain both languages from scan time. Each RPC stays
    // single-language, while the visible receipt combines every successful group.
    const groups = new Map<string, RecapItem[]>()
    recapItems.filter((item) => !item.saved && !item.alreadyPresent).forEach((item) => {
      const key = `${item.language}\u0000${item.baseLanguage}`
      const group = groups.get(key)
      if (group) group.push(item)
      else groups.set(key, [item])
    })

    setSaveNotice(null)
    const receipts: Array<{ language: string; result: LensSaveResult }> = []
    for (const items of groups.values()) {
      const result = await saveLensItemsAccurately(items)
      if (!result) break
      receipts.push({ language: items[0].language, result })
    }
    setSaveNotice(combineLensSaveReceipts(receipts))
  }, [recapItems, saveLensItemsAccurately])

  const discardRecapItem = useCallback((id: string) => {
    setRecapItems((items) => items.filter((item) => item.id !== id))
  }, [])

  const focusLanguageOption = useCallback((position: 'active' | 'first' | 'last') => {
    window.requestAnimationFrame(() => {
      const options = languageOptionRefs.current.slice(0, lensLanguages.length)
      if (options.length === 0) return
      const activeIndex = Math.max(0, lensLanguages.indexOf(targetLanguage))
      const index = position === 'first'
        ? 0
        : position === 'last'
          ? options.length - 1
          : activeIndex
      options[index]?.focus({ preventScroll: true })
    })
  }, [lensLanguages, targetLanguage])

  const openLanguageMenu = useCallback((focusPosition: 'active' | 'first' | 'last' = 'active') => {
    setLangMenuOpen(true)
    focusLanguageOption(focusPosition)
  }, [focusLanguageOption])

  const closeLanguageMenu = useCallback((restoreFocus = false) => {
    setLangMenuOpen(false)
    if (restoreFocus) {
      window.setTimeout(() => languageTriggerRef.current?.focus({ preventScroll: true }), 0)
    }
  }, [])

  const handleLanguageTriggerKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      openLanguageMenu('first')
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      openLanguageMenu('last')
    } else if (event.key === 'Escape' && langMenuOpen) {
      event.preventDefault()
      closeLanguageMenu(true)
    }
  }, [closeLanguageMenu, langMenuOpen, openLanguageMenu])

  const handleLanguageMenuKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeLanguageMenu(true)
      return
    }
    if (event.key === 'Tab') {
      closeLanguageMenu()
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return

    event.preventDefault()
    const options = languageOptionRefs.current.slice(0, lensLanguages.length)
    if (options.length === 0) return
    const currentIndex = options.findIndex((option) => option === document.activeElement)
    const nextIndex = currentIndex < 0
      ? event.key === 'ArrowUp' || event.key === 'End' ? options.length - 1 : 0
      : event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? options.length - 1
        : event.key === 'ArrowDown'
          ? (currentIndex + 1 + options.length) % options.length
          : (currentIndex - 1 + options.length) % options.length
    options[nextIndex]?.focus({ preventScroll: true })
  }, [closeLanguageMenu, lensLanguages.length])

  const selectLensLanguage = useCallback((language: string) => {
    closeLanguageMenu(true)
    if (language === targetLanguage) return
    wordHintsRequestRef.current += 1
    commitExistingWordHints({ userId: user?.id ?? '', language, words: new Set() })
    setActiveLanguage(language)
    // Any result on screen was produced for the previous language — clear it
    // and return to the live preview so the next scan is coherent end to end.
    if (viewState !== 'camera_ready') {
      resetForRescan()
    } else {
      setSaveNotice(null)
    }
  }, [closeLanguageMenu, commitExistingWordHints, resetForRescan, setActiveLanguage, targetLanguage, user?.id, viewState])

  const bulkSaveCurrentItems = useCallback(async () => {
    if (!scanResult) return
    const currentItems = currentRecapIdsRef.current
      .map((id) => recapItemsById.get(id))
      .filter((item): item is RecapItem => Boolean(item))
    if (currentItems.length === 0) return
    setSaveNotice(null)
    const result = await saveLensItemsAccurately(currentItems)
    publishSaveNotice(currentItems[0].language, result)
  }, [publishSaveNotice, recapItemsById, saveLensItemsAccurately, scanResult])

  const selectAlternate = useCallback((alternate: LensAlternate) => {
    const replacement = lensItemFromAlternate(alternate)
    setScanResult((result) => result ? {
      ...result,
      items: result.items.map((item, index) => index === selectedIndex ? replacement : item),
    } : result)

    const currentRecapId = currentRecapIdsRef.current[selectedIndex]
    setRecapItems((items) => {
      const current = items.find((item) => item.id === currentRecapId)
      const replacementRecap: RecapItem = {
        ...replacement,
        id: current?.id ?? `lens-${Date.now()}-${++recapSequenceRef.current}`,
        language: current?.language ?? targetLanguage,
        baseLanguage: current?.baseLanguage ?? baseLanguage,
        saved: false,
        alreadyPresent: hasExistingWordHint(current?.language ?? targetLanguage, replacement.target_text),
      }

      // A saved/known primary is historical session truth. Keep it and add the
      // learner's alternate as a distinct unsaved row.
      if (current?.saved || current?.alreadyPresent) {
        replacementRecap.id = `lens-${Date.now()}-${++recapSequenceRef.current}`
        currentRecapIdsRef.current[selectedIndex] = replacementRecap.id
        return [...items, replacementRecap]
      }

      currentRecapIdsRef.current[selectedIndex] = replacementRecap.id
      return current
        ? items.map((item) => item.id === current.id ? replacementRecap : item)
        : [...items, replacementRecap]
    })
    setActiveItem(replacement)
    setExampleOpen(false)
    setSaveNotice(null)
  }, [baseLanguage, hasExistingWordHint, selectedIndex, targetLanguage])

  const selectedRecapItem = recapItemsById.get(currentRecapIdsRef.current[selectedIndex])
  const selectedSaved = Boolean(selectedRecapItem?.saved)
  const selectedAlreadyPresent = Boolean(selectedRecapItem?.alreadyPresent)
  const currentUnsavedCount = currentRecapIdsRef.current.reduce((count, id) => {
    const item = recapItemsById.get(id)
    return count + (item && !item.saved && !item.alreadyPresent ? 1 : 0)
  }, 0)
  const saveBusy = saveStatus === 'loading'
  const saveNoticeText = saveNotice
    ? saveNotice.inserted === 0 && saveNotice.skipped > 0
      ? t('lens.save.alreadyInVocabulary')
      : saveNotice.inserted > 0 && saveNotice.skipped > 0
        ? t('lens.save.bulkMixed', { saved: saveNotice.inserted, known: saveNotice.skipped })
        : t('lens.save.confirmed')
    : null
  const recapSaveNoticeText = saveNotice
    ? saveNotice.inserted === 0 && saveNotice.skipped > 0
      ? t('lens.save.alreadyInVocabulary')
      : saveNotice.inserted > 0 && saveNotice.skipped > 0
        ? t('lens.save.bulkMixed', { saved: saveNotice.inserted, known: saveNotice.skipped })
        : t('lens.save.bulkConfirmed', { count: saveNotice.inserted })
    : null

  return (
    <TooltipProvider>
      <div className="lens-shell" data-lens-state={viewState}>
        <div className="lens-camera-stage">
          {capturedFrame ? (
            <img className="lens-preview-media" src={capturedFrame.previewUrl} alt={t('lens.preview.frozenAlt')} />
          ) : (
            <video
              ref={attachVideo}
              className="lens-preview-media"
              playsInline
              muted
              autoPlay
              onClick={captureAndScan}
              aria-label={t('lens.preview.label')}
            />
          )}
          <div className="lens-vignette" aria-hidden="true" />
          <div ref={reticleRef} className="lens-reticle" aria-hidden="true" />

          <header className="lens-topbar">
            <button type="button" className="lens-icon-button" onClick={closeLens} aria-label={t('lens.action.close')}>
              <X aria-hidden="true" />
            </button>
            <div className="lens-title-block">
              <span className="lens-kicker">{t('lens.title')}</span>
              {lensLanguages.length > 1 ? (
                <button
                  ref={languageTriggerRef}
                  type="button"
                  className="lens-language-trigger"
                  onClick={() => {
                    if (langMenuOpen) closeLanguageMenu()
                    else openLanguageMenu()
                  }}
                  onKeyDown={handleLanguageTriggerKeyDown}
                  aria-expanded={langMenuOpen}
                  aria-haspopup="menu"
                  aria-controls="lens-language-menu"
                  aria-label={t('lens.language.switch')}
                >
                  <span>{lensSubtitle}</span>
                  <ChevronDown className={langMenuOpen ? 'lens-chevron lens-chevron--open' : 'lens-chevron'} aria-hidden="true" />
                </button>
              ) : (
                <span>{lensSubtitle}</span>
              )}
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

          {langMenuOpen ? (
            <div
              id="lens-language-menu"
              className="lens-language-menu"
              role="menu"
              aria-label={t('lens.language.switch')}
              onKeyDown={handleLanguageMenuKeyDown}
            >
              {lensLanguages.map((language, index) => (
                <button
                  key={language}
                  ref={(node) => {
                    languageOptionRefs.current[index] = node
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  aria-current={language === targetLanguage ? 'true' : undefined}
                  className={language === targetLanguage ? 'lens-language-option lens-language-option--active' : 'lens-language-option'}
                  onClick={() => selectLensLanguage(language)}
                >
                  <FlagIcon code={language} className="w-5 h-auto" />
                  <span>{t(`langName.${language}`)}</span>
                </button>
              ))}
            </div>
          ) : null}

          {viewState === 'camera_ready' && scanLanguagesReady ? (
            <div className="lens-instruction">{t('lens.instruction')}</div>
          ) : null}

          <div className="lens-bottom-controls">
            {viewState === 'camera_ready' && scanLanguagesReady ? (
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

        {viewState === 'camera_unavailable' ? (
          <StatusSheet
            title={t('lens.camera.unavailableTitle')}
            body={errorMessage || t('lens.camera.unavailable')}
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
                {scanResult.items.map((item, index) => {
                  const recapItem = recapItemsById.get(currentRecapIdsRef.current[index])
                  const itemResolved = Boolean(recapItem?.saved || recapItem?.alreadyPresent)
                  return <div
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
                      <span lang={targetLangCode} dir="auto">{item.target_text}</span>
                      <span lang={baseLangCode} dir="auto">{recapItem?.saved ? t('lens.action.saved') : recapItem?.alreadyPresent ? t('lens.action.alreadySaved') : item.base_text}</span>
                    </button>
                    <button
                      type="button"
                      className="lens-row-save-button"
                      onClick={() => {
                        if (!recapItem) return
                        setSaveNotice(null)
                        void saveLensItemsAccurately([recapItem]).then((result) => publishSaveNotice(recapItem.language, result))
                      }}
                      disabled={saveBusy || itemResolved || !recapItem}
                      aria-label={itemResolved ? t('lens.action.alreadySaved') : t('lens.action.save')}
                    >
                      {itemResolved ? <Check aria-hidden="true" /> : <Save aria-hidden="true" />}
                    </button>
                  </div>
                })}
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
                <h1 lang={targetLangCode} dir="auto">{selectedItem.target_text}</h1>
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

            <p className="lens-base-text" lang={baseLangCode} dir="auto">{selectedItem.base_text}</p>

            {/* Model-self-reported confidence is not calibrated — never shown
                as a positive trust marker. Only the low state surfaces, as a
                caution (above), pointing at the alternates. */}
            {selectedItem.article || selectedItem.pos ? (
              <div className="lens-chip-row">
                {selectedItem.article ? <span className="lens-chip" lang={targetLangCode} dir="auto">{selectedItem.article}</span> : null}
                {selectedItem.pos ? <span className="lens-chip">{selectedItem.pos}</span> : null}
              </div>
            ) : null}

            {selectedItem.example ? (
              <button type="button" className="lens-example-toggle" onClick={() => setExampleOpen((open) => !open)}>
                <span>{t('lens.result.example')}</span>
                <ChevronDown className={exampleOpen ? 'lens-chevron lens-chevron--open' : 'lens-chevron'} aria-hidden="true" />
              </button>
            ) : null}

            {exampleOpen && selectedItem.example ? (
              <div className="lens-example">
                <p lang={targetLangCode} dir="auto">{selectedItem.example}</p>
                {selectedItem.example_gloss ? <span lang={baseLangCode} dir="auto">{selectedItem.example_gloss}</span> : null}
              </div>
            ) : null}

            {selectedItem.alternates?.length ? (
              <div className="lens-alternates" aria-label={t('lens.result.alternates')}>
                {selectedItem.alternates.slice(0, 2).map((alternate) => (
                  <button
                    key={`${alternate.target_text}-${alternate.base_text}`}
                    type="button"
                    className="lens-alternate-chip"
                    onClick={() => selectAlternate(alternate)}
                    lang={targetLangCode}
                    dir="auto"
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
                {saveNotice.decks[0] ? (
                  <Link to={`/deck/${saveNotice.decks[0].deckId}`}>{t('lens.save.openDeck')}</Link>
                ) : null}
              </div>
            ) : null}

            {saveError ? <p className="lens-save-error">{t('lens.save.failed')}</p> : null}

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

        {showRecap && typeof document !== 'undefined' ? createPortal(
          <div className="theme-cosmos lens-recap-backdrop">
            <section
              ref={recapDialogRef}
              className="lens-recap"
              role="dialog"
              aria-modal="true"
              aria-labelledby="lens-recap-title"
              tabIndex={-1}
            >
              <h2 id="lens-recap-title">{t('lens.recap.title')}</h2>
              <p>{t('lens.recap.body', { count: recapItems.length })}</p>
              <div className="lens-recap-list">
                {recapItems.map((item) => (
                  <div key={item.id} className="lens-recap-row">
                    <span lang={getLanguageCode(item.language) || undefined} dir="auto">{item.target_text}</span>
                    <span lang={getLanguageCode(item.baseLanguage) || undefined} dir="auto">{item.saved ? t('lens.recap.saved') : item.alreadyPresent ? t('lens.recap.alreadyPresent') : item.base_text}</span>
                    {item.saved ? (
                      <span className="lens-recap-discard" aria-hidden="true" />
                    ) : (
                      <button
                        type="button"
                        className="lens-recap-discard"
                        onClick={() => discardRecapItem(item.id)}
                        aria-label={t('lens.recap.discard', { word: item.target_text })}
                      >
                        <X aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {saveNotice ? (
                <div className="lens-save-confirmation">
                  <span>{recapSaveNoticeText}</span>
                  {saveNotice.decks.map((deck) => (
                    <Link key={`${deck.deckId}-${deck.language}`} to={`/deck/${deck.deckId}`}>
                      {t('lens.save.openDeck')} · {t(`langName.${deck.language}`)}
                    </Link>
                  ))}
                </div>
              ) : null}
              {saveError ? <p className="lens-save-error">{t('lens.save.failed')}</p> : null}
              <div className="lens-actions">
                <Button type="button" variant="secondary" onClick={closeRecap} data-lens-recap-initial-focus>
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
          </div>,
          document.body,
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
