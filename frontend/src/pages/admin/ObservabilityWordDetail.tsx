import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import AggregatorSnapshot from '@/components/admin/observability/AggregatorSnapshot'
import CardImage from '@/components/admin/observability/CardImage'
import FinalVideo from '@/components/admin/observability/FinalVideo'
import FailureNotice from '@/components/admin/observability/FailureNotice'
import LayoutSelector, { type WordLayoutMode } from '@/components/admin/observability/LayoutSelector'
import SceneStills from '@/components/admin/observability/SceneStills'
import SunoTracks from '@/components/admin/observability/SunoTracks'
import WordPanelsLayout from '@/components/admin/observability/variants/WordPanelsLayout'
import WordScrollLayout, { type StageEvents } from '@/components/admin/observability/variants/WordScrollLayout'
import WordTabsLayout from '@/components/admin/observability/variants/WordTabsLayout'
import styles from '@/components/admin/observability/observability.module.css'
import {
  fetchPipelineEventsForWord,
  fetchWordWithMetadata,
  type PipelineEvent,
  type WordRow,
} from '@/lib/observability'
import { supabase } from '@/lib/supabase'
import { useFerrariTitle } from '@/layouts/useFerrariTitle'

const VIDEO_DECK_STAGES = ['concept', 'images', 'video', 'assembly', 'bookend', 'suno_bakein']
const CARD_DECK_STAGES = ['concept', 'pending_image']
const LAYOUT_STORAGE_KEY = 'ferrari-obs:word-layout'

function getStoredLayout(): WordLayoutMode {
  if (typeof window === 'undefined') return 'A'
  const stored = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
  return stored === 'A' || stored === 'B' || stored === 'C' ? stored : 'A'
}

async function fetchFinalVideoUrl(wordId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('words')
    .select('video_url')
    .eq('id', wordId)
    .maybeSingle()

  if (error) throw error
  return ((data as { video_url?: string | null } | null)?.video_url) ?? null
}

export default function ObservabilityWordDetail() {
  useFerrariTitle('Word detail')

  const { wordId } = useParams()
  const [word, setWord] = useState<WordRow | null>(null)
  const [events, setEvents] = useState<PipelineEvent[]>([])
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null)
  const [layout, setLayout] = useState<WordLayoutMode>(getStoredLayout)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleLayoutChange = (nextLayout: WordLayoutMode) => {
    setLayout(nextLayout)
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, nextLayout)
  }

  useEffect(() => {
    if (!wordId) return

    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets loading/error state when wordId changes before re-fetching; canonical fetch-on-key pattern
    setLoading(true)
    setError(null)

    Promise.all([
      fetchWordWithMetadata(wordId),
      fetchPipelineEventsForWord(wordId),
      fetchFinalVideoUrl(wordId),
    ])
      .then(([wordRow, pipelineEvents, videoUrl]) => {
        if (cancelled) return
        setWord(wordRow)
        setEvents(pipelineEvents)
        setFinalVideoUrl(videoUrl)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [wordId])

  const baseStages = useMemo<string[]>(() => {
    if (word?.deck_type === 'card') return CARD_DECK_STAGES
    return VIDEO_DECK_STAGES
  }, [word?.deck_type])

  const stages = useMemo<string[]>(() => {
    const known = new Set(baseStages)
    const extras: string[] = []
    for (const event of events) {
      if (event.stage && !known.has(event.stage) && !extras.includes(event.stage)) {
        extras.push(event.stage)
      }
    }
    return [...baseStages, ...extras]
  }, [baseStages, events])

  const eventsByStage = useMemo(() => {
    const grouped: StageEvents = Object.fromEntries(
      stages.map((stage) => [stage, [] as PipelineEvent[]]),
    )
    for (const event of events) {
      grouped[event.stage] = grouped[event.stage] ?? []
      grouped[event.stage].push(event)
    }
    return grouped
  }, [events, stages])

  const failedEvents = useMemo(
    () => events.filter((event) => event.status === 'failed'),
    [events],
  )

  if (!wordId) return <p className={styles.error}>Error: Missing word id</p>
  if (loading) return <p className={styles.loading}>Loading...</p>
  if (error) return <p className={styles.error}>Error: {error}</p>

  const layoutProps = { stages, eventsByStage }

  return (
    <>
      <FailureNotice events={failedEvents} />
      <FinalVideo src={finalVideoUrl} />
      <CardImage src={word?.deck_type === 'card' ? word?.thumbnail_url ?? null : null} />
      <SceneStills events={events} />
      <SunoTracks wordId={wordId} />
      <AggregatorSnapshot metadata={word?.metadata ?? null} />
      <LayoutSelector value={layout} onChange={handleLayoutChange} />
      {layout === 'A' && <WordScrollLayout {...layoutProps} />}
      {layout === 'B' && <WordTabsLayout {...layoutProps} />}
      {layout === 'C' && <WordPanelsLayout {...layoutProps} />}
    </>
  )
}
