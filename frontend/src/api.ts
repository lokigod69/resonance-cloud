/**
 * API client for the Resonance Orchestrator backend.
 */

const BASE = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090') + '/api'

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json()
}

export interface WordStageStatus {
  status: 'empty' | 'pending_selection' | 'done' | 'failed' | 'running'
  version_count: number
  selected: string | null
}

export interface WordSummary {
  word_original: string
  word_slug: string
  translation: string
  language: string
  stages: Record<string, WordStageStatus>
  updated_at: string
  muted: boolean
  approved: boolean
  error?: string
}

export interface ConceptArtifact {
  word: string
  translation: string
  language: string
  language_code: string
  lyrics: string
  music_caption: string
  visual_hint: string | null
  generation_info?: Record<string, unknown>
}

export interface Manifest {
  word_original: string
  word_slug: string
  translation: string
  language: string
  language_code: string
  created_at: string
  updated_at: string
  enrichment: Record<string, unknown>
  selected: Record<string, string | null>
  settings: Record<string, Record<string, unknown>>
  lineage: Array<{
    stage: string
    version: string
    from_versions: Record<string, string>
    settings_snapshot: Record<string, unknown>
    timestamp: string
    status: string
  }>
  muted: boolean
  approved: boolean
}

export interface StoryboardScene {
  scene_number: number
  description: string
  image_prompt?: {
    subject?: string
    scene?: string
    style?: string
    lighting?: string
    composition?: string
    mood?: string
    colors?: string[]
    details?: string
    text_element?: { text?: string; rendering?: string; placement?: string } | null
  }
  word_render?: { enabled?: boolean; text?: string; method?: string; technique?: string; instruction?: string; placement?: string }
  camera_motion?: { type?: string; direction?: string; speed?: string; description?: string }
  video_prompt?: string
  transition_prompt?: string
}

export interface Storyboard {
  visual_concept?: string
  art_style?: string
  frame_narrative?: string
  shared_palette?: string[]
  shared_motif?: string
  scene_count?: number
  scenes?: StoryboardScene[]
}

export interface WordDetail {
  manifest: Manifest
  stages: {
    concept: { versions: Array<{name: string, selected: boolean, status?: string}>, selected: string | null }
    song: { versions: Array<{version: string, takes: string[], selected: boolean, selected_take: string | null, status?: string}>, selected: string | null }
    images: { versions: Array<{version: string, images: string[], storyboard: Storyboard | null, selected: boolean, status?: string}>, selected: string | null }
    video: { versions: Array<{version: string, clips: string[], thumbnails: string[], selected: boolean, status?: string}>, selected: string | null }
    final: { versions: Array<{version: string, files: string[], selected: boolean, status?: string}>, selected: string | null }
    bookend: { versions: Array<{version: string, files: string[], selected: boolean, status?: string}>, selected: string | null }
  }
}

export interface EngineHealth {
  name: string
  port: number
  url: string
  reachable: boolean
  last_checked: string
}

export interface WorkspaceInfo {
  path: string
  exists: boolean
  meta: {
    name: string
    created_at: string
    source_csv: string | null
    word_count: number
    languages: string[]
    language: string | null
    workspace_version: string
  } | null
  word_count: number
}

export interface AutopilotStatus {
  running: boolean
  cancelled: boolean
  progress: string[]
  current_word: string | null
  current_stage: string | null
  total: number
  done: number
  errors: string[]
  paused_for_song_selection?: boolean
  paused_word?: string | null
}

// ─── Workspace ───────────────────────────────────────────────────────────────

export const getWorkspaceInfo = () => req<WorkspaceInfo>('/workspace/info')

export interface ImportResult {
  imported: string[]
  skipped: string[]
  errors: string[]
  total: number
  needs_language?: boolean
}

export const importCSV = async (file: File, batchName?: string, language?: string): Promise<ImportResult> => {
  const form = new FormData()
  form.append('file', file)
  if (batchName) form.append('batch_name', batchName)
  if (language) form.append('language', language)
  const res = await fetch(`${BASE}/workspace/import`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export interface WorkspaceEntry {
  name: string
  path: string
  word_count: number
  meta: WorkspaceInfo['meta'] | null
  active: boolean
  language: string | null
  approved_count: number
}

export const listWorkspaces = () => req<WorkspaceEntry[]>('/workspaces')
export const createWorkspace = (name: string, language?: string | null) =>
  req<{ok: boolean, path: string, name: string}>('/workspaces/create', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ name, language: language || null }),
  })
export const switchWorkspace = (path: string) =>
  req<{ok: boolean, path: string}>('/workspaces/switch', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ path }),
  })
export const renameWorkspace = (path: string, newName: string) =>
  req<{ok: boolean, new_path: string, new_name: string}>('/workspaces/rename', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ path, new_name: newName }),
  })
export const deleteWorkspace = async (path: string): Promise<{ok: boolean}> => {
  const res = await fetch(`${BASE}/workspaces`, {
    method: 'DELETE',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ path }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || `Delete failed: ${res.status}`)
  }
  return res.json()
}

export interface RecentWorkspaceEntry {
  path: string
  name: string
  language: string | null
  word_count: number
}

export const getRecentWorkspaces = () => req<RecentWorkspaceEntry[]>('/workspaces/recent')
export const openWorkspaceFolder = (path: string) =>
  req<{ok: boolean, path: string, name: string}>('/workspaces/open-folder', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ path }),
  })

// ─── Words ───────────────────────────────────────────────────────────────────

export const getWords = () => req<WordSummary[]>('/words')
export const getWord = (slug: string) => req<WordDetail>(`/words/${slug}`)
export const getSupportedLanguages = () => req<string[]>('/languages')

export const addWord = (data: {word: string, translation: string, language: string, mnemonic?: string, etymology?: string, example?: string, tags?: string}) =>
  req<{ok: boolean, word_slug: string}>('/words', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  })

export const deleteWord = (slug: string) =>
  req<{ok: boolean, deleted: string}>(`/words/${slug}`, { method: 'DELETE' })

export const toggleMute = (slug: string, muted: boolean) =>
  req<{ok: boolean}>(`/words/${slug}/mute`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ muted }),
  })

export const muteAll = (muted: boolean) =>
  req<{ok: boolean, count: number}>('/words/mute-all', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ muted }),
  })

export const toggleApprove = (slug: string) =>
  req<{ok: boolean, approved: boolean}>(`/words/${slug}/approve`, { method: 'PUT' })

export const getManifest = (slug: string) => req<Manifest>(`/words/${slug}/manifest`)

export const updateWordSettings = (slug: string, stage: string, settings: Record<string, unknown>) =>
  req(`/words/${slug}/settings/${stage}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(settings),
  })

export interface WordStageSettingsResponse {
  effective: Record<string, unknown>
  overrides: Record<string, unknown>
  defaults: Record<string, unknown>
}

export const getWordStageSettings = (slug: string, stage: string) =>
  req<WordStageSettingsResponse>(`/words/${slug}/settings/${stage}`)

export const deleteWordStageSettings = (slug: string, stage: string) =>
  req(`/words/${slug}/settings/${stage}`, { method: 'DELETE' })

export const selectVersion = (slug: string, stage: string, version: string) =>
  req(`/words/${slug}/select/${stage}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ version }),
  })

export const runStage = (slug: string, stage: string) =>
  req<{stage: string, version: string, result: unknown}>(`/words/${slug}/run/${stage}`, {
    method: 'POST',
  })

// ─── Concept editing ─────────────────────────────────────────────────────────

export const getConceptArtifact = (slug: string, version: string) =>
  req<ConceptArtifact>(`/words/${slug}/concept/${version}`)

export const saveConceptEdit = (slug: string, version: string, data: Partial<ConceptArtifact>) =>
  req<{ok: boolean, new_version: string}>(`/words/${slug}/concept/${version}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  })

// ─── Image management ────────────────────────────────────────────────────────

export const deleteImage = (slug: string, version: string, filename: string) =>
  req(`/words/${slug}/images/${version}/${filename}`, { method: 'DELETE' })

export const deleteVersion = (slug: string, stage: string, version: string) =>
  req(`/words/${slug}/versions/${stage}/${version}`, { method: 'DELETE' })

// ─── LoRA library ────────────────────────────────────────────────────────

export interface LoraInfo {
  id: string
  display_name: string
  language_code: string
  language_name: string
  trigger_phrase: string
  recommended_strength: number
  strength_range: [number, number]
  recommended_checkpoint: string
  checkpoints: string[]
  gender: string
  base_path: string
}

export const getLoras = () => req<LoraInfo[]>('/loras')

// ─── Voices ─────────────────────────────────────────────────────────────────

export interface Voice {
  id: string
  voice_id: string
  name: string
  language: string
  notes: string
  created_at: string
}

export const getVoices = () => req<Voice[]>('/voices')

export const getSupabaseVoices = async (): Promise<Voice[]> => {
  const { supabase } = await import('@/lib/supabase')
  const { data } = await supabase
    .from('voices')
    .select('*')
    .order('language')
    .order('name')
  return (data || []).map((row: Record<string, unknown>) => ({
    id: String(row.id ?? row.voice_id ?? ''),
    voice_id: String(row.voice_id ?? ''),
    name: String(row.name ?? ''),
    language: String(row.language ?? ''),
    notes: String(row.notes ?? ''),
    created_at: String(row.created_at ?? ''),
  }))
}

export const createVoice = (data: { voice_id: string; name: string; language?: string; notes?: string }) =>
  req<Voice>('/voices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

export const updateVoice = (id: string, data: Partial<Pick<Voice, 'voice_id' | 'name' | 'language' | 'notes'>>) =>
  req<Voice>(`/voices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

export const deleteVoice = (id: string) =>
  req<{ ok: boolean }>(`/voices/${id}`, { method: 'DELETE' })

// ─── Settings ────────────────────────────────────────────────────────────────

export const getDefaults = () => req<Record<string, Record<string, unknown>>>('/settings/defaults')

export const updateDefaults = (settings: Record<string, Record<string, unknown>>) =>
  req('/settings/defaults', {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(settings),
  })

// ─── Presets ─────────────────────────────────────────────────────────────────

export type PresetSummary = { slug: string; name: string; created_at: string }
export type PresetFull = PresetSummary & {
  settings: Record<string, Record<string, unknown>>
}

export const listPresets = () => req<PresetSummary[]>('/presets')

export const loadPreset = (slug: string) => req<PresetFull>(`/presets/${slug}`)

export const savePreset = (name: string, settings: Record<string, Record<string, unknown>>) =>
  req<PresetSummary>('/presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, settings }),
  })

export const deletePreset = (slug: string) =>
  req<{ ok: boolean }>(`/presets/${slug}`, { method: 'DELETE' })

// ─── Engine health ────────────────────────────────────────────────────────────

export const getEnginesHealth = () => req<EngineHealth[]>('/engines/health')

// ─── Autopilot ───────────────────────────────────────────────────────────────

export const startAutopilot = (wordSlugs?: string[], pauseAtSong = false) =>
  req('/autopilot/run', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ word_slugs: wordSlugs, pause_at_song: pauseAtSong }),
  })

export const cancelAutopilot = () => req('/autopilot/cancel', { method: 'POST' })
export const resumeAutopilot = () => req('/autopilot/resume', { method: 'POST' })
export const getAutopilotStatus = () => req<AutopilotStatus>('/autopilot/status')

// ─── Word Pipeline (single-word autopilot) ──────────────────────────────────

export interface WordPipelineStatus {
  running: boolean
  cancelled: boolean
  current_stage: string | null
  completed_stages: string[]
  stages_remaining: string[]
  paused_for_song: boolean
  error: { stage: string; message: string } | null
  progress: string[]
}

export const startWordPipeline = (slug: string, startFrom?: string) =>
  req<{ok: boolean, stages: string[]}>(`/words/${slug}/pipeline/start`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ start_from: startFrom }),
  })

export const getWordPipelineStatus = (slug: string) =>
  req<WordPipelineStatus>(`/words/${slug}/pipeline/status`)

export const cancelWordPipeline = (slug: string) =>
  req(`/words/${slug}/pipeline/cancel`, { method: 'POST' })

export const resumeWordPipeline = (slug: string) =>
  req(`/words/${slug}/pipeline/resume`, { method: 'POST' })

// ─── Assembly trim ──────────────────────────────────────────────────────────

export const trimAssembly = (slug: string, sourceVersion: string, trimStart: number, trimEnd: number) =>
  req<{stage: string, version: string, result: {status: string, output_paths: string[], error: unknown}}>(`/words/${slug}/trim/assembly`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ source_version: sourceVersion, trim_start: trimStart, trim_end: trimEnd }),
  })

// ─── Generation metadata ──────────────────────────────────────────────────────

/**
 * Loose shape for the per-stage generation meta blob returned by the orchestrator.
 * Stages emit overlapping subsets of these fields; everything is optional.
 * Unknown nested values surface as `unknown` via the index signatures so callers
 * narrow at the access site.
 */
export interface MetaSettings {
  // image stage
  llm_model?: string
  frame_narrative?: string
  art_style?: string
  // song stage
  duration?: number
  seed?: number
  // video stage
  video_mode?: string
  resolution?: string
  fps?: number
  // assembly stage
  assembly_mode?: string
  // bookend stage
  voice_id?: string
  text_color?: string
  [key: string]: unknown
}

export interface GenerationMeta {
  outputs?: {
    duration_seconds?: number
    tts_duration_seconds?: number
    resolution?: string
    file_size_bytes?: number
    requested_duration?: number
    takes?: string[]
    [key: string]: unknown
  }
  inputs?: {
    settings_used?: MetaSettings
    caption?: string
    video_prompt?: string
    [key: string]: unknown
  }
  settings?: MetaSettings
  steps?: Record<string, { llm_model?: string; model?: string } | undefined>
  lora?: { active?: boolean; path?: string; strength?: number } | null
  cost?: { estimated_usd?: number }
  acestep?: { model?: string }
  duration_seconds?: number
  [key: string]: unknown
}

export const getGenerationMeta = (slug: string, stage: string, version: string) =>
  req<{meta: GenerationMeta | null}>(`/words/${slug}/stages/${stage}/${version}/meta`)

// ─── Media URLs ───────────────────────────────────────────────────────────────

export const mediaUrl = (slug: string, path: string) =>
  `${BASE}/media/${slug}/${path}`

export const workspaceMediaUrl = (workspace: string, slug: string, path: string) =>
  `${BASE}/media/ws/${encodeURIComponent(workspace)}/${slug}/${path}`

// ─── Suno full song generation ──────────────────────────────────────────────

export interface SunoGenerateResult {
  audio_url: string
  storage_url?: string
  task_id: string
}

export const generateSunoSong = (wordSlug: string, deckId: string, userId: string) =>
  req<SunoGenerateResult>('/suno/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word_slug: wordSlug, deck_id: deckId, user_id: userId }),
  })
