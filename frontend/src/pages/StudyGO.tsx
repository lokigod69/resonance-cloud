import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Pause } from 'lucide-react'
import { LoadingIndicator } from '@/components/ui/LoadingIndicator'
import { getStoredVersion } from '@/hooks/useVideoVersion'
import { useVideoVolume } from '@/hooks/useVideoVolume'
import { VolumeControl } from '@/components/VolumeControl'
import { FullscreenButton } from '@/components/FullscreenButton'
import { useStudySession } from '@/hooks/useStudySession'

const SWIPE_THRESHOLD = 120
const MAX_RETRIES = 3

export default function StudyGO() {
  const navigate = useNavigate()

  const { words, loading, recordAttempt } = useStudySession()

  const [cardOrder, setCardOrder] = useState<number[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [retryCount, setRetryCount] = useState<Map<string, number>>(new Map())

  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0 })
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const cardElRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const cardOrderRef = useRef(cardOrder)
  cardOrderRef.current = cardOrder
  const wordsRef = useRef(words)
  wordsRef.current = words
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set())
  const [showControls, setShowControls] = useState(true)
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const topVideoRef = useRef<HTMLVideoElement | null>(null)
  const { volume, isMuted, setVolume, toggleMute } = useVideoVolume(topVideoRef)

  // Initialize cardOrder when words load from hook
  useEffect(() => {
    if (words.length > 0 && cardOrder.length === 0) {
      setCardOrder([...Array(words.length).keys()].reverse())
    }
  }, [words, cardOrder.length])

  // ── Drag handlers (pointer events, NOT state) ──────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.target instanceof HTMLButtonElement) return
    if ((e.target as HTMLElement).closest('button')) return
    dragRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.isDragging) return
    const deltaX = e.clientX - dragRef.current.startX
    const deltaY = e.clientY - dragRef.current.startY
    const rotation = deltaX * 0.05
    ;(e.currentTarget as HTMLElement).style.transform =
      `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`

    // Behind-card reactive physics
    const order = cardOrderRef.current
    const ws = wordsRef.current
    if (order.length >= 2) {
      const behindIdx = order[order.length - 2]
      const behindWord = ws[behindIdx]
      if (behindWord) {
        const behindEl = cardElRefs.current.get(behindWord.id)
        if (behindEl) {
          const progress = Math.min(Math.abs(deltaX) / window.innerWidth, 1)
          const reactiveScale = 0.95 + 0.05 * progress
          const reactiveBrightness = 0.8 + 0.2 * progress
          const behindX = -deltaX * 0.1
          behindEl.style.transition = 'none'
          behindEl.style.transform = `translateY(-20px) scale(${reactiveScale}) translateX(${behindX}px)`
          behindEl.style.filter = `brightness(${reactiveBrightness})`
        }
      }
    }
  }, [])

  // Animate card off-screen (shared animation for both pass and fail)
  const animateThrow = useCallback((el: HTMLElement, direction: 1 | -1) => {
    el.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out'
    el.style.transform = `translateX(${window.innerWidth * direction}px) rotate(${direction * 30}deg)`
    el.style.opacity = '0'
    setRevealed(false)
  }, [])

  // Normal card rotation: move top card to bottom of stack
  const rotateCard = useCallback(() => {
    setCardOrder(prev => {
      const next = [...prev]
      const top = next.pop()!
      next.unshift(top)
      return next
    })
    setCurrentIndex(prev => (prev + 1) % words.length)
  }, [words.length])

  // Retry card: insert failed card ~5 positions deep so it reappears after ~5 swipes
  const retryCard = useCallback((failedIdx: number) => {
    setCardOrder(prev => {
      const next = [...prev]
      next.pop() // remove top card
      const insertPos = Math.max(0, next.length - 5)
      next.splice(insertPos, 0, failedIdx)
      return next
    })
    setCurrentIndex(prev => (prev + 1) % words.length)
  }, [words.length])

  const handlePass = useCallback((el: HTMLElement) => {
    const topIdx = cardOrderRef.current[cardOrderRef.current.length - 1]
    const word = wordsRef.current[topIdx]
    if (word) recordAttempt(word.id, true)

    animateThrow(el, 1)
    setTimeout(() => {
      el.style.transition = ''
      el.style.transform = ''
      el.style.opacity = ''
      rotateCard()
    }, 400)
  }, [recordAttempt, animateThrow, rotateCard])

  const handleFail = useCallback((el: HTMLElement) => {
    const topIdx = cardOrderRef.current[cardOrderRef.current.length - 1]
    const word = wordsRef.current[topIdx]
    if (!word) return

    recordAttempt(word.id, false)

    const currentRetries = retryCount.get(word.id) ?? 0
    const shouldRetry = currentRetries < MAX_RETRIES

    if (shouldRetry) {
      setRetryCount(prev => new Map(prev).set(word.id, currentRetries + 1))
    }

    animateThrow(el, -1)
    setTimeout(() => {
      el.style.transition = ''
      el.style.transform = ''
      el.style.opacity = ''
      if (shouldRetry) {
        retryCard(topIdx)
      } else {
        rotateCard()
      }
    }, 400)
  }, [recordAttempt, animateThrow, rotateCard, retryCard, retryCount])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.isDragging) return
    dragRef.current.isDragging = false
    const deltaX = e.clientX - dragRef.current.startX
    const el = e.currentTarget as HTMLElement

    // Reset behind-card to resting position
    const order = cardOrderRef.current
    const ws = wordsRef.current
    if (order.length >= 2) {
      const behindIdx = order[order.length - 2]
      const behindWord = ws[behindIdx]
      if (behindWord) {
        const behindEl = cardElRefs.current.get(behindWord.id)
        if (behindEl) {
          behindEl.style.transition = 'transform 0.3s ease, filter 0.3s ease'
          behindEl.style.transform = 'translateY(-20px) scale(0.95)'
          behindEl.style.filter = 'brightness(0.8)'
        }
      }
    }

    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX > 0) {
        handlePass(el)
      } else {
        handleFail(el)
      }
    } else {
      // Snap back
      el.style.transition = 'transform 0.3s ease'
      el.style.transform = ''
      setTimeout(() => { el.style.transition = '' }, 300)
    }
  }, [handlePass, handleFail])

  // ── Orb dock jump ──────────────────────────────────────

  const jumpToCard = useCallback((targetWordIndex: number) => {
    setCardOrder(prev => {
      const next = prev.filter(i => i !== targetWordIndex)
      next.push(targetWordIndex)
      return next
    })
    setCurrentIndex(targetWordIndex)
    setRevealed(false)
  }, [])

  // ── Auto-play top card video, pause all others ────────

  useEffect(() => {
    if (words.length === 0 || cardOrder.length === 0) return
    const topIdx = cardOrder[cardOrder.length - 1]
    const topWord = words[topIdx]
    if (!topWord?.video_url) return

    // Pause all non-top videos
    videoRefs.current.forEach((video, id) => {
      if (id !== topWord.id && !video.paused) {
        video.pause()
      }
    })

    // Play top card video and sync button state
    const topVideo = videoRefs.current.get(topWord.id)
    topVideoRef.current = topVideo ?? null
    if (topVideo) {
      topVideo.play().catch(() => {})
      setPlayingVideos(new Set([topWord.id]))
    }
  }, [cardOrder, words])

  // ── Video play/pause ───────────────────────────────────

  const toggleVideo = useCallback((wordId: string) => {
    const video = videoRefs.current.get(wordId)
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
      setPlayingVideos(prev => new Set(prev).add(wordId))
    } else {
      video.pause()
      setPlayingVideos(prev => {
        const next = new Set(prev)
        next.delete(wordId)
        return next
      })
    }
  }, [])

  // ── Auto-hide video controls ──────────────────────────

  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => setShowControls(false), 2500)
  }, [])

  // Show controls briefly when top card changes
  useEffect(() => {
    resetControlsTimer()
  }, [cardOrder, resetControlsTimer])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimeout(controlsTimer.current)
  }, [])

  // ── Render ─────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <LoadingIndicator text="Loading study cards" />
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 24, textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 300 }}>No words ready to study yet</h2>
        <p style={{ color: 'var(--go-text-secondary)' }}>Generate a deck first — once your videos are ready, they'll appear here.</p>
        <button
          onClick={() => navigate('/generate')}
          style={{
            marginTop: 16,
            padding: '10px 28px',
            borderRadius: 30,
            background: 'var(--go-accent)',
            color: 'white',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Generate a Deck
        </button>
      </div>
    )
  }

  // Get top 4 cards for rendering
  const visibleIndices = cardOrder.slice(-4).reverse() // [top, depth1, depth2, depth3]

  return (
    <>
      {/* Card stack */}
      <div className="deck-container">
        {visibleIndices.map((wordIdx, i) => {
          const word = words[wordIdx]
          if (!word) return null
          const ver = getStoredVersion(word.id)
          const videoSrc = ver === 'b' && word.video_url_b ? word.video_url_b : word.video_url
          const thumbSrc = ver === 'b' && word.thumbnail_url_b ? word.thumbnail_url_b : word.thumbnail_url
          const depth = i // 0 = top
          const yOffset = depth * -20
          const scale = 1 - depth * 0.05
          const brightness = depth === 0 ? 1 : depth === 1 ? 0.7 : 0.5
          const isTop = depth === 0

          return (
            <div
              key={word.id}
              ref={el => {
                if (el) cardElRefs.current.set(word.id, el)
                else cardElRefs.current.delete(word.id)
              }}
              className="video-card"
              style={{
                transform: `translateY(${yOffset}px) scale(${scale})`,
                filter: `brightness(${brightness})`,
                opacity: depth >= 3 ? 0 : 1,
                zIndex: 4 - depth,
                pointerEvents: isTop ? 'auto' : 'none',
                transition: isTop ? undefined : 'transform 0.3s ease, filter 0.3s ease',
              }}
              onPointerDown={isTop ? handlePointerDown : undefined}
              onPointerMove={isTop ? handlePointerMove : undefined}
              onPointerUp={isTop ? handlePointerUp : undefined}
            >
              {/* Video area */}
              <div
                className="video-wrapper"
                onPointerMove={isTop ? resetControlsTimer : undefined}
                onPointerLeave={isTop ? () => setShowControls(false) : undefined}
                onClick={isTop ? (e) => {
                  if (dragRef.current.isDragging) return
                  if ((e.target as HTMLElement).closest('button')) return
                  setShowControls(prev => !prev)
                } : undefined}
              >
                {isTop ? (
                  // Top card: render video element for playback
                  videoSrc ? (
                    <video
                      ref={(el) => {
                        if (el) {
                          videoRefs.current.set(word.id, el)
                        } else {
                          videoRefs.current.delete(word.id)
                        }
                      }}
                      src={videoSrc}
                      loop
                      playsInline
                    />
                  ) : thumbSrc ? (
                    <img
                      src={thumbSrc}
                      alt={word.word}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--go-text-secondary)' }}>
                      No media
                    </div>
                  )
                ) : (
                  // Behind cards: show thumbnail to avoid black video frames
                  thumbSrc ? (
                    <img
                      src={thumbSrc}
                      alt={word.word}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--go-text-secondary)', background: 'rgba(94, 106, 210, 0.1)' }}>
                      {word.word}
                    </div>
                  )
                )}

                {/* Video controls overlay */}
                {isTop && word.video_url && (
                  <div className={`controls transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleVideo(word.id)
                        }}
                      >
                        {playingVideos.has(word.id) ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                      </button>
                      <VolumeControl
                        volume={volume}
                        isMuted={isMuted}
                        onVolumeChange={setVolume}
                        onToggleMute={toggleMute}
                        iconSize={20}
                        buttonClassName=""
                      />
                      <div style={{ marginLeft: 'auto' }}>
                        <FullscreenButton
                          targetRef={topVideoRef}
                          iconSize={20}
                          className=""
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card info */}
              <div className="card-info">
                <h2>{word.word}</h2>

                {isTop && !revealed && (
                  <div className="study-controls">
                    <button className="reveal-btn" onClick={(e) => { e.stopPropagation(); setRevealed(true) }}>
                      Reveal
                    </button>
                  </div>
                )}

                {isTop && revealed && (
                  <>
                    {word.translation && (
                      <p style={{ color: 'var(--go-accent)', fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>
                        {word.translation}
                      </p>
                    )}
                    {word.mnemonic && (
                      <p style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>{word.mnemonic}</p>
                    )}
                    {word.etymology && (
                      <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{word.etymology}</p>
                    )}

                    <div className="study-controls">
                      <button
                        className="grade-btn fail"
                        onClick={(e) => {
                          e.stopPropagation()
                          const card = (e.currentTarget as HTMLElement).closest('.video-card') as HTMLElement
                          if (card) handleFail(card)
                        }}
                      >
                        ✘
                      </button>
                      <button
                        className="grade-btn pass"
                        onClick={(e) => {
                          e.stopPropagation()
                          const card = (e.currentTarget as HTMLElement).closest('.video-card') as HTMLElement
                          if (card) handlePass(card)
                        }}
                      >
                        ✔
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Orb dock */}
      <div className="orb-dock-container">
        <div className="orb-dock">
          {words.map((word, index) => (
            <div
              key={word.id}
              className={`orb${index === currentIndex ? ' active' : ''}`}
              onClick={() => jumpToCard(index)}
              title={word.word}
            >
              {word.thumbnail_url ? (
                <img src={word.thumbnail_url} alt={word.word} />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: `hsl(${(index * 40) % 360}, 60%, 40%)`,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
