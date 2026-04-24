import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Video, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import StarRating from '@/components/ui/StarRating'

type WordRecord = {
  id: string
  deck_id: string
  user_id: string
  word: string
  word_slug: string | null
  translation: string | null
  mnemonic: string | null
  etymology: string | null
  pos: string | null
  article: string | null
  status: string
  video_url: string | null
  thumbnail_url: string | null
  video_url_b: string | null
  thumbnail_url_b: string | null
  error_message: string | null
  retry_count: number
  metadata: Record<string, unknown> | null
  rating: number | null
  rated_at: string | null
  needs_review: boolean
  created_at: string
}

export default function WordDetailPanel({
  word,
  open,
  onClose,
}: {
  word: WordRecord | null
  open: boolean
  onClose: () => void
}) {
  const [rawJsonOpen, setRawJsonOpen] = useState(false)

  if (!word) return null

  const meta = word.metadata

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {word.word}
            {word.translation && (
              <span className="text-muted-foreground font-normal text-base">
                — {word.translation}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Video Player — Version A */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Version A</p>
          <div className="relative rounded-lg overflow-hidden bg-zinc-900 aspect-video w-full flex items-center justify-center">
            {word.video_url ? (
              <video
                src={word.video_url}
                controls
                className="absolute inset-0 w-full h-full object-contain"
                preload="metadata"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Video className="h-10 w-10" />
                <span className="text-sm">No video available</span>
              </div>
            )}
          </div>
        </div>

        {/* Video Player — Version B */}
        {word.video_url_b && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Version B</p>
            <div className="relative rounded-lg overflow-hidden bg-zinc-900 aspect-video w-full flex items-center justify-center">
              <video
                src={word.video_url_b}
                controls
                className="absolute inset-0 w-full h-full object-contain"
                preload="metadata"
              />
            </div>
          </div>
        )}

        {/* Word Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="Word" value={word.word} />
          <InfoRow label="Translation" value={word.translation} />
          <InfoRow label="POS" value={word.pos} />
          <InfoRow label="Article" value={word.article} />
          <div className="col-span-2">
            <InfoRow label="Mnemonic" value={word.mnemonic} />
          </div>
          <div className="col-span-2">
            <InfoRow label="Etymology" value={word.etymology} />
          </div>
          <InfoRow label="Status" value={word.status} />
          <InfoRow label="Retry Count" value={String(word.retry_count)} />
          <div>
            <span className="text-muted-foreground">Rating: </span>
            {word.rating ? (
              <span className="inline-flex items-center gap-2">
                <StarRating rating={word.rating} readOnly size={16} />
                {word.rated_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(word.rated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">Not yet rated</span>
            )}
          </div>
          {word.error_message && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Error: </span>
              <span className="text-red-400">{word.error_message}</span>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Generation Metadata</h3>
          {!meta ? (
            <p className="text-sm text-muted-foreground italic">
              Generation metadata not available for this word (generated before metadata tracking was added)
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              <MetaSection title="Pipeline Summary">
                <MetaRow label="Total Duration" value={formatDuration(meta.pipeline_duration_seconds as number | undefined)} />
                <MetaRow label="Stages Completed" value={Array.isArray(meta.stages_completed) ? (meta.stages_completed as string[]).join(', ') : null} />
                <MetaRow label="Profile Used" value={meta.profile_used as string | undefined} />
              </MetaSection>

              <MetaSection title="Creative Direction">
                <MetaRow label="Direction" value={meta.creative_direction as string | undefined} />
                <MetaRow label="Rationale" value={meta.creative_direction_rationale as string | undefined} />
                <MetaRow label="Art Style" value={meta.art_style as string | undefined} />
                <MetaRow label="Movie Reference" value={meta.movie_reference as string | undefined} />
                <MetaRow label="Music Caption" value={meta.music_caption as string | undefined} />
              </MetaSection>

              <MetaSection title="Image Generation">
                <MetaRow label="Image Count" value={(meta.images as Record<string, unknown>)?.count as number | undefined} />
                <MetaRow label="Refusals" value={(meta.images as Record<string, unknown>)?.refusals as number | undefined} />
                <MetaRow label="Duration" value={formatDuration((meta.images as Record<string, unknown>)?.duration_seconds as number | undefined)} />
                <MetaRow label="Model" value={(meta.images as Record<string, unknown>)?.model as string | undefined} />
              </MetaSection>

              <MetaSection title="Concept">
                <MetaRow label="Duration" value={formatDuration((meta.concept as Record<string, unknown>)?.duration_seconds as number | undefined)} />
                <MetaRow label="Caption Source" value={(meta.concept as Record<string, unknown>)?.caption_source as string | undefined} />
              </MetaSection>

              <MetaSection title="Song Generation">
                <MetaRow label="Duration" value={formatDuration((meta.song as Record<string, unknown>)?.duration_seconds as number | undefined)} />
                <MetaRow label="Takes" value={(meta.song as Record<string, unknown>)?.takes as number | undefined} />
              </MetaSection>

              <MetaSection title="Video Generation">
                <MetaRow label="Mode" value={(meta.video as Record<string, unknown>)?.mode as string | undefined} />
                <MetaRow label="Duration" value={formatDuration((meta.video as Record<string, unknown>)?.duration_seconds as number | undefined)} />
              </MetaSection>

              <MetaSection title="Assembly">
                <MetaRow label="Duration" value={formatDuration((meta.assembly as Record<string, unknown>)?.duration_seconds as number | undefined)} />
                <MetaRow label="Final Video Duration" value={formatDuration((meta.assembly as Record<string, unknown>)?.final_video_duration_seconds as number | undefined)} />
                <MetaRow label="LUFS" value={(meta.assembly as Record<string, unknown>)?.lufs as number | undefined} />
              </MetaSection>

              <MetaSection title="Bookend">
                <MetaRow label="TTS Language" value={(meta.bookend as Record<string, unknown>)?.tts_language as string | undefined} />
                <MetaRow label="Voice ID" value={(meta.bookend as Record<string, unknown>)?.voice_id as string | undefined} />
                <MetaRow label="Duration" value={formatDuration((meta.bookend as Record<string, unknown>)?.duration_seconds as number | undefined)} />
              </MetaSection>

              {meta.lora ? (
              <MetaSection title="LoRA">
                <MetaRow label="Path" value={(meta.lora as Record<string, unknown>)?.path as string | undefined} />
                <MetaRow label="Strength" value={(meta.lora as Record<string, unknown>)?.strength as number | undefined} />
                <MetaRow label="Trigger Phrase" value={(meta.lora as Record<string, unknown>)?.trigger_phrase as string | undefined} />
              </MetaSection>
              ) : null}

              {/* Raw JSON Viewer */}
              <div className="border-t border-border pt-3">
                <button
                  onClick={() => setRawJsonOpen(!rawJsonOpen)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {rawJsonOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  View Raw Metadata
                </button>
                {rawJsonOpen && (
                  <pre className="mt-2 p-3 bg-zinc-900 rounded-lg text-xs font-mono overflow-x-auto max-h-[300px] overflow-y-auto">
                    {JSON.stringify(meta, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        <Link
          to={`/admin/observability/word/${word.id}`}
          className="inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View observability
        </Link>
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span>{value || '—'}</span>
    </div>
  )
}

function MetaSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-accent/20 rounded-lg p-3 space-y-1">
      <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1.5">{title}</p>
      {children}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined) return null
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined) return null
  if (seconds < 60) return `${Math.round(seconds)}s`
  const min = Math.floor(seconds / 60)
  const sec = Math.round(seconds % 60)
  return `${min}m ${sec}s`
}
