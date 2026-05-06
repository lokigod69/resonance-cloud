type JsonRecord = Record<string, unknown>

export type MusicLyricsSource = {
  lyrics: string
  source: 'music_generation_jobs.concept_artifact.suno_lyrics'
    | 'music_generation_jobs.concept_artifact.lyrics'
    | 'words.metadata.song_generation.suno_lyrics'
    | 'words.metadata.song_generation.lyrics'
}

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

const SECTION_TAG_PATTERN =
  /^\s*\[(?:Intro|Verse(?:\s+\d+)?|Chorus|Bridge|Outro|Hook|Pre-Chorus)\]\s*$/i

export function cleanDisplayLyrics(rawLyrics: string): string {
  const rawLines = rawLyrics.replace(/\r\n?/g, '\n').split('\n')
  const lines: string[] = []

  for (const rawLine of rawLines) {
    const line = rawLine.trimEnd()

    if (SECTION_TAG_PATTERN.test(line)) {
      if (lines.length > 0 && lines[lines.length - 1] !== '') {
        lines.push('')
      }
      continue
    }

    if (!line.trim()) {
      if (lines.length > 0 && lines[lines.length - 1] !== '') {
        lines.push('')
      }
      continue
    }

    lines.push(line)
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function extractMusicLyrics({
  conceptArtifact,
  songGeneration,
}: {
  conceptArtifact?: JsonRecord | null
  songGeneration?: JsonRecord | null
}): MusicLyricsSource | null {
  const sunoLyrics = cleanText(conceptArtifact?.suno_lyrics)
  if (sunoLyrics) {
    return {
      lyrics: sunoLyrics,
      source: 'music_generation_jobs.concept_artifact.suno_lyrics',
    }
  }

  const conceptLyrics = cleanText(conceptArtifact?.lyrics)
  if (conceptLyrics) {
    return {
      lyrics: conceptLyrics,
      source: 'music_generation_jobs.concept_artifact.lyrics',
    }
  }

  const metadataSunoLyrics = cleanText(songGeneration?.suno_lyrics)
  if (metadataSunoLyrics) {
    return {
      lyrics: metadataSunoLyrics,
      source: 'words.metadata.song_generation.suno_lyrics',
    }
  }

  const metadataLyrics = cleanText(songGeneration?.lyrics)
  if (metadataLyrics) {
    return {
      lyrics: metadataLyrics,
      source: 'words.metadata.song_generation.lyrics',
    }
  }

  return null
}
