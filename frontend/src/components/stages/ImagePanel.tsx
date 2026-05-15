import { useState } from 'react'
import { Trash2, Loader, ZoomIn } from 'lucide-react'
import { deleteImage, deleteVersion, mediaUrl, getGenerationMeta } from '../../api'
import type { Storyboard, StoryboardScene } from '../../api'
import { CollapsibleRun } from '../CollapsibleRun'
import { ImageLightbox } from '../ImageLightbox'
import type { StageProps } from './shared'
import { EmptyStage } from './shared'

export function ImagePanel({ slug, detail, onSelect, onRefresh }: StageProps) {
  const versions = detail.stages.images.versions
  const selected = detail.stages.images.selected
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deletingVer, setDeletingVer] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(selected ? [selected] : versions.length ? [versions[versions.length - 1].version] : [])
  )
  const [activeScene, setActiveScene] = useState<{ version: string; index: number } | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [meta, setMeta] = useState<Record<string, Record<string, any> | null>>({})

  const toggle = (v: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v); else next.add(v)
      return next
    })
    if (!(v in meta)) {
      getGenerationMeta(slug, 'images', v).then(res => setMeta(prev => ({ ...prev, [v]: res.meta }))).catch(() => setMeta(prev => ({ ...prev, [v]: null })))
    }
  }

  // Load meta for initially expanded versions
  useState(() => {
    expanded.forEach(v => {
      if (!(v in meta)) {
        getGenerationMeta(slug, 'images', v).then(res => setMeta(prev => ({ ...prev, [v]: res.meta }))).catch(() => {})
      }
    })
  })

  const handleDelete = async (version: string, filename: string) => {
    setDeleting(`${version}/${filename}`)
    try {
      await deleteImage(slug, version, filename)
      await onRefresh()
    } catch { /* noop: delete failure leaves the image visible */ }
    setDeleting(null)
  }

  if (versions.length === 0) {
    return <EmptyStage message="No image sets generated yet. Click Generate to create images." />
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {versions.map((v, i) => (
        <CollapsibleRun
          key={v.version}
          version={v.version}
          isSelected={selected === v.version}
          isExpanded={expanded.has(v.version)}
          onToggle={() => toggle(v.version)}
          onSelect={() => onSelect(v.version)}
          onDelete={async () => { setDeletingVer(v.version); try { await deleteVersion(slug, 'images', v.version); await onRefresh() } catch { /* noop: delete failure leaves the row visible */ } setDeletingVer(null) }}
          deleting={deletingVer === v.version}
          stage="images"
          index={i}
          total={versions.length}
        >
          {meta[v.version] && <GenerationInfoBar meta={meta[v.version]!} storyboard={v.storyboard} />}

          {v.storyboard && <StoryboardSummary storyboard={v.storyboard} />}

          <div className={`grid gap-2 ${v.images.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : v.images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {v.images.map((img, i) => {
              const isActive = activeScene?.version === v.version && activeScene?.index === i
              return (
                <div
                  key={img}
                  className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${
                    isActive ? 'border-[var(--accent)]' : 'border-transparent'
                  }`}
                  onClick={() => setActiveScene(isActive ? null : { version: v.version, index: i })}
                >
                  <img
                    src={mediaUrl(slug, `images/${v.version}/${img}`)}
                    alt={img}
                    className="w-full aspect-video object-cover"
                  />
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setLightboxSrc(mediaUrl(slug, `images/${v.version}/${img}`)) }}
                      className="p-1 rounded bg-[var(--bg-base)]/80 text-[var(--text-secondary)] hover:text-white cursor-pointer"
                      title="View full size"
                    >
                      <ZoomIn size={10} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(v.version, img) }}
                      disabled={deleting === `${v.version}/${img}`}
                      className="p-1 rounded bg-[var(--bg-base)]/80 text-[var(--error)] cursor-pointer"
                      title="Delete image"
                    >
                      {deleting === `${v.version}/${img}` ? <Loader size={10} className="animate-spin" /> : <Trash2 size={10} />}
                    </button>
                  </div>
                  <div className="absolute bottom-1 left-1 text-[10px] text-white/60 bg-black/50 px-1 rounded">{img}</div>
                </div>
              )
            })}
          </div>

          {activeScene?.version === v.version && v.storyboard?.scenes?.[activeScene.index] && (
            <SceneDetail
              scene={v.storyboard.scenes[activeScene.index]}
              index={activeScene.index}
              isLast={activeScene.index === (v.storyboard.scenes?.length ?? 0) - 1}
            />
          )}
        </CollapsibleRun>
      ))}

      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </div>
  )
}

/* ── Generation Info Bar ─────────────────────────────────────────────── */

function truncateModel(model: string): string {
  const idx = model.lastIndexOf('/')
  return idx >= 0 ? model.slice(idx + 1) : model
}

function GenerationInfoBar({ meta, storyboard }: { meta: Record<string, any>; storyboard: Storyboard | null }) {
  const settings = meta.settings ?? {}
  const steps = meta.steps ?? {}
  const sb = storyboard

  const llm = steps.storyboard_generation?.llm_model ?? settings.llm_model
  const frameNarrative = sb?.frame_narrative ?? ''
  const frameAuto = settings.frame_narrative === 'auto'
  const artStyle = sb?.art_style ?? ''
  const artAuto = !settings.art_style || settings.art_style === 'auto'
  const scenes = sb?.scene_count ?? sb?.scenes?.length ?? '?'
  const renderModel = steps.image_rendering?.model
  const totalTime = meta.duration_seconds

  const parts: Array<{ label: string; value: string }> = []

  if (llm) parts.push({ label: 'LLM', value: truncateModel(llm) })
  if (frameNarrative) parts.push({ label: 'Mode', value: `${frameNarrative.toLowerCase()}${frameAuto ? ' (auto)' : ''}` })
  if (artStyle) parts.push({ label: 'Art', value: `${artStyle}${artAuto ? ' (auto)' : ''}` })
  parts.push({ label: 'Scenes', value: String(scenes) })
  if (renderModel) parts.push({ label: 'Render', value: truncateModel(renderModel) })
  if (totalTime != null) parts.push({ label: 'Time', value: `${Math.round(totalTime)}s` })

  if (parts.length === 0) return null

  return (
    <div className="mb-3 px-3 py-1.5 rounded bg-[var(--bg-hover)] font-mono text-[10px] text-[var(--text-muted)] leading-relaxed flex flex-wrap gap-x-3 gap-y-0.5">
      {parts.map((p, i) => (
        <span key={i}>
          <span className="text-[var(--text-muted)]">{p.label}:</span>{' '}
          <span className="text-[var(--text-secondary)]">{p.value}</span>
        </span>
      ))}
    </div>
  )
}

/* ── Storyboard Summary ──────────────────────────────────────────────── */

function StoryboardSummary({ storyboard }: { storyboard: Storyboard }) {
  if (!storyboard.visual_concept && !storyboard.art_style && !storyboard.shared_motif) return null
  return (
    <details open className="border border-[var(--border)] rounded-lg p-3 mb-3 bg-[var(--bg-base)]">
      <summary className="text-xs font-medium text-[var(--text-muted)] cursor-pointer select-none">Storyboard</summary>
      <div className="mt-2 space-y-1.5">
        {storyboard.visual_concept && <Field label="Visual Concept" value={storyboard.visual_concept} />}
        {storyboard.art_style && <Field label="Art Style" value={storyboard.art_style} />}
        {storyboard.shared_palette && storyboard.shared_palette.length > 0 && (
          <Field label="Palette" value={storyboard.shared_palette.join(', ')} />
        )}
        {storyboard.shared_motif && <Field label="Motif" value={storyboard.shared_motif} />}
      </div>
    </details>
  )
}

/* ── Scene Detail ────────────────────────────────────────────────────── */

function SceneDetail({ scene, index, isLast }: { scene: StoryboardScene; index: number; isLast: boolean }) {
  return (
    <div className="border border-[var(--border)] rounded-lg p-3 mt-3 bg-[var(--bg-base)] space-y-1.5">
      <div className="text-xs font-medium text-[var(--text-muted)] mb-2">Scene {index + 1} Details</div>
      {scene.description && <Field label="Description" value={scene.description} />}
      {scene.word_render && (scene.word_render.text || scene.word_render.technique || scene.word_render.method) && (
        <Field
          label="Word Render"
          value={[scene.word_render.text, scene.word_render.technique || scene.word_render.method, scene.word_render.instruction || scene.word_render.placement].filter(Boolean).join(' — ')}
        />
      )}
      {scene.camera_motion?.description && (
        <Field label="Camera" value={`${scene.camera_motion.type ?? ''} (${scene.camera_motion.speed ?? ''}) — ${scene.camera_motion.description}`} />
      )}
      {scene.video_prompt && (
        <details className="mt-1">
          <summary className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider cursor-pointer select-none">Video Prompt</summary>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{scene.video_prompt}</p>
        </details>
      )}
      {!isLast && scene.transition_prompt && (
        <details className="mt-1">
          <summary className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider cursor-pointer select-none">Transition Prompt</summary>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{scene.transition_prompt}</p>
        </details>
      )}
    </div>
  )
}

/* ── Field helper ────────────────────────────────────────────────────── */

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}: </span>
      <span className="text-xs text-[var(--text-secondary)]">{value}</span>
    </div>
  )
}
