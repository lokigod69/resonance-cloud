import type { JsonObject, PipelineEvent } from '@/lib/observability'

export type StillPipelineEvent = Pick<
  PipelineEvent,
  'id' | 'stage' | 'sub_step' | 'model_provider' | 'metadata'
>

export interface SceneStill {
  eventId: string
  sceneNumber: number
  provider: string
  url: string | null
  storageKey: string | null
  available: boolean
}

function asSceneNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isInteger(parsed) && parsed > 0) return parsed
  }
  return null
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function providerFromStorageKey(storageKey: string | null): string | null {
  if (!storageKey) return null
  const parts = storageKey.split('/').filter(Boolean)
  const filename = parts.at(-1) ?? ''
  const maybeProvider = parts.at(-2) ?? ''
  if (filename.startsWith('scene_') && maybeProvider && maybeProvider !== 'images') {
    return maybeProvider
  }
  return null
}

function providerLabel(event: StillPipelineEvent, metadata: JsonObject, storageKey: string | null): string {
  return (
    asText(metadata.provider)
    ?? providerFromStorageKey(storageKey)
    ?? asText(event.model_provider)
    ?? 'unknown'
  )
}

export function collectSceneStills(events: StillPipelineEvent[]): SceneStill[] {
  return events
    .filter((event) => event.stage === 'images' && event.sub_step === 'render_scene')
    .map((event) => {
      const metadata = event.metadata ?? {}
      const sceneNumber = asSceneNumber(metadata.scene_number)
      if (sceneNumber === null) return null

      const url = asText(metadata.scene_still_url)
      const storageKey = asText(metadata.scene_still_storage_key)

      return {
        eventId: event.id,
        sceneNumber,
        provider: providerLabel(event, metadata, storageKey),
        url,
        storageKey,
        available: url !== null,
      }
    })
    .filter((still): still is SceneStill => still !== null)
    .sort((a, b) => (
      a.sceneNumber - b.sceneNumber
      || a.provider.localeCompare(b.provider)
      || a.eventId.localeCompare(b.eventId)
    ))
}
