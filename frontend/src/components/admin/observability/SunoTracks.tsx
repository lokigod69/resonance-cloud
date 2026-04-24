import { useEffect, useState } from 'react'
import { AudioPlayer } from '@/components/AudioPlayer'
import { fetchWordSunoUrls, type SunoUrls } from '@/lib/observability'
import styles from './observability.module.css'

export default function SunoTracks({ wordId }: { wordId: string }) {
  const [tracks, setTracks] = useState<SunoUrls | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchWordSunoUrls(wordId)
      .then((urls) => {
        if (!cancelled) setTracks(urls)
      })
      .catch(() => {
        if (!cancelled) setTracks({})
      })

    return () => {
      cancelled = true
    }
  }, [wordId])

  if (!tracks?.trackA && !tracks?.trackB) return null

  return (
    <div className={styles.tracks}>
      {tracks.trackA && (
        <div className={styles.track}>
          <span className={styles.bodyLabel}>Track A</span>
          <AudioPlayer src={tracks.trackA} className={styles.trackPlayer} />
        </div>
      )}
      {tracks.trackB && (
        <div className={styles.track}>
          <span className={styles.bodyLabel}>Track B</span>
          <AudioPlayer src={tracks.trackB} className={styles.trackPlayer} />
        </div>
      )}
    </div>
  )
}
