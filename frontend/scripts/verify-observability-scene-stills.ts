import assert from 'node:assert/strict'
import { collectSceneStills, type StillPipelineEvent } from '../src/lib/sceneStills'

const events: StillPipelineEvent[] = [
  {
    id: 'event-old-1',
    stage: 'images',
    sub_step: 'render_scene',
    model_provider: 'wan',
    metadata: {
      scene_number: 1,
      provider: 'wan',
      output_file: '001.png',
    },
  },
  {
    id: 'event-seedream-1',
    stage: 'images',
    sub_step: 'render_scene',
    model_provider: 'seedream',
    metadata: {
      scene_number: 1,
      provider: 'seedream',
      scene_still_url: 'https://cdn.example/stills/seedream/scene_001.png',
      scene_still_storage_key: 'user/deck/bauer/seedream/scene_001.png',
    },
  },
  {
    id: 'event-wan-2',
    stage: 'images',
    sub_step: 'render_scene',
    model_provider: 'wan',
    metadata: {
      scene_number: '2',
      provider: 'wan',
      scene_still_url: 'https://cdn.example/stills/wan/scene_002.png',
      scene_still_storage_key: 'user/deck/bauer/wan/scene_002.png',
    },
  },
  {
    id: 'event-video',
    stage: 'video',
    sub_step: 'render_scene',
    model_provider: 'ltx',
    metadata: {
      scene_number: 1,
      scene_still_url: 'https://cdn.example/ignore.png',
    },
  },
]

const stills = collectSceneStills(events)

assert.equal(stills.length, 3)
assert.deepEqual(
  stills.map((still) => ({
    eventId: still.eventId,
    sceneNumber: still.sceneNumber,
    provider: still.provider,
    url: still.url,
    available: still.available,
  })),
  [
    {
      eventId: 'event-seedream-1',
      sceneNumber: 1,
      provider: 'seedream',
      url: 'https://cdn.example/stills/seedream/scene_001.png',
      available: true,
    },
    {
      eventId: 'event-old-1',
      sceneNumber: 1,
      provider: 'wan',
      url: null,
      available: false,
    },
    {
      eventId: 'event-wan-2',
      sceneNumber: 2,
      provider: 'wan',
      url: 'https://cdn.example/stills/wan/scene_002.png',
      available: true,
    },
  ],
)

console.log('observability scene still extraction passed')
