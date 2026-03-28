import { useState, useCallback } from 'react'

const STORAGE_KEY = 'resonance-video-version'

type VersionMap = Record<string, 'a' | 'b'>

function readVersionMap(): VersionMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeVersionMap(map: VersionMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

interface WordWithVersions {
  id: string
  video_url: string | null
  video_url_b?: string | null
  thumbnail_url?: string | null
  thumbnail_url_b?: string | null
}

export function useVideoVersion(word: WordWithVersions) {
  const hasAltVersion = !!word.video_url_b

  const [version, setVersion] = useState<'a' | 'b'>(() => {
    if (!hasAltVersion) return 'a'
    const map = readVersionMap()
    return map[word.id] ?? 'a'
  })

  const toggleVersion = useCallback(() => {
    const next = version === 'a' ? 'b' : 'a'
    setVersion(next)
    const map = readVersionMap()
    map[word.id] = next
    writeVersionMap(map)
  }, [version, word.id])

  const activeVideoUrl = version === 'b' && word.video_url_b ? word.video_url_b : word.video_url
  const activeThumbnailUrl = version === 'b' && word.thumbnail_url_b ? word.thumbnail_url_b : word.thumbnail_url

  return {
    version,
    toggleVersion,
    hasAltVersion,
    activeVideoUrl,
    activeThumbnailUrl,
  }
}

/** Read-only version for components that just need the stored preference (e.g. Study mode) */
export function getStoredVersion(wordId: string): 'a' | 'b' {
  const map = readVersionMap()
  return map[wordId] ?? 'a'
}
