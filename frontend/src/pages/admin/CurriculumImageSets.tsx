import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/Toast'
import { listCurriculumCategories } from '@/data/curriculumCategories'
import {
  invalidateCurriculumImageSetConfigCache,
  loadCurriculumImageSetConfig,
  type CurriculumImageSetConfig,
  type ImageSetRecord,
  type ImageSetSelection,
} from '@/lib/curriculumImageSetConfig'
import {
  resolveCurriculumImageSetAsset,
  type CurriculumImageSetKey,
} from '@/lib/curriculumImageSets'

type ImageSetLanguageIso = 'en'

const LANGUAGE_LABELS: Record<ImageSetLanguageIso, string> = {
  en: 'English',
}

const PREVIEW_TERMS = ['apple', 'book', 'coffee', 'window', 'computer'] as const

type AddOverrideDraft = {
  categorySlug: string
  setKey: CurriculumImageSetKey
}

export default function CurriculumImageSets() {
  const { toast } = useToast()
  const [language] = useState<ImageSetLanguageIso>('en')
  const [config, setConfig] = useState<CurriculumImageSetConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [addDraft, setAddDraft] = useState<AddOverrideDraft>({ categorySlug: '', setKey: 'A' })
  const categories = useMemo(() => listCurriculumCategories(), [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      invalidateCurriculumImageSetConfigCache()
      const fresh = await loadCurriculumImageSetConfig(language)
      setConfig(fresh)
    } finally {
      setLoading(false)
    }
  }, [language])

  useEffect(() => {
    refresh()
  }, [refresh])

  const enabledSets: ImageSetRecord[] = useMemo(
    () => (config?.sets ?? []).filter((s) => s.is_enabled).sort((a, b) => a.sort_order - b.sort_order),
    [config],
  )

  const languageDefault: ImageSetSelection | null = useMemo(
    () =>
      config?.selections.find(
        (s) => s.language_iso === language && s.category_slug === null,
      ) ?? null,
    [config, language],
  )

  const overrideSelections = useMemo(
    () =>
      (config?.selections ?? [])
        .filter((s) => s.language_iso === language && s.category_slug !== null)
        .sort((a, b) => (a.category_slug ?? '').localeCompare(b.category_slug ?? '')),
    [config, language],
  )

  const effectiveDefaultSetKey: CurriculumImageSetKey =
    languageDefault?.active_set_key ?? enabledSets[0]?.set_key ?? 'A'

  const setLanguageDefault = async (nextKey: CurriculumImageSetKey) => {
    if (busy) return
    setBusy(true)
    try {
      const existing = languageDefault
      if (existing) {
        const { error } = await supabase
          .from('curriculum_image_set_selections')
          .update({ active_set_key: nextKey })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('curriculum_image_set_selections')
          .insert({ language_iso: language, category_slug: null, active_set_key: nextKey })
        if (error) throw error
      }
      toast('Default image set saved', 'success')
      await refresh()
    } catch (err) {
      toast(`Save failed: ${String((err as Error)?.message ?? err)}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const upsertOverride = async (categorySlug: string, nextKey: CurriculumImageSetKey) => {
    if (busy) return
    setBusy(true)
    try {
      const existing = overrideSelections.find((s) => s.category_slug === categorySlug)
      if (existing) {
        const { error } = await supabase
          .from('curriculum_image_set_selections')
          .update({ active_set_key: nextKey })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('curriculum_image_set_selections')
          .insert({ language_iso: language, category_slug: categorySlug, active_set_key: nextKey })
        if (error) throw error
      }
      toast(`Override saved for ${categorySlug}`, 'success')
      await refresh()
    } catch (err) {
      toast(`Save failed: ${String((err as Error)?.message ?? err)}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const removeOverride = async (selectionId: string) => {
    if (busy) return
    if (!confirm('Remove this category override? The category will inherit the language default.')) {
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase
        .from('curriculum_image_set_selections')
        .delete()
        .eq('id', selectionId)
      if (error) throw error
      toast('Override removed', 'success')
      await refresh()
    } catch (err) {
      toast(`Remove failed: ${String((err as Error)?.message ?? err)}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleAddOverride = async () => {
    if (!addDraft.categorySlug) {
      toast('Choose a category before saving.', 'info')
      return
    }
    await upsertOverride(addDraft.categorySlug, addDraft.setKey)
    setAddDraft({ categorySlug: '', setKey: effectiveDefaultSetKey })
  }

  const previewKeys = enabledSets.length > 0 ? enabledSets : ([] as ImageSetRecord[])

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Curriculum image sets</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            This controls which curriculum image family learners see when they browse categories.
            This does not create separate decks. Deck imports remain canonical and stored card
            thumbnails are not changed when you switch the active set.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading || busy}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </header>

      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Language</Label>
          <span className="rounded-md border px-2 py-1 text-sm font-medium">
            {LANGUAGE_LABELS[language]}
          </span>
          <span className="text-xs text-muted-foreground">
            (Italian, French and others can be added as additional languages register image sets.)
          </span>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Language default active image set
          </Label>
          <div className="flex flex-wrap gap-2">
            {enabledSets.map((set) => {
              const selected = set.set_key === effectiveDefaultSetKey
              return (
                <button
                  key={set.set_key}
                  type="button"
                  disabled={busy || loading}
                  onClick={() => setLanguageDefault(set.set_key)}
                  className={`min-w-[200px] rounded-lg border p-3 text-left transition-colors ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card hover:bg-accent'
                  }`}
                  aria-pressed={selected}
                >
                  <div className="text-sm font-semibold">{set.label}</div>
                  {set.description && (
                    <div className="mt-1 text-xs text-muted-foreground">{set.description}</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <div>
          <h2 className="text-lg font-semibold">Category overrides</h2>
          <p className="text-sm text-muted-foreground">
            Override the language default for a specific category. Remove an override to inherit the
            default.
          </p>
        </div>

        {overrideSelections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No overrides configured. All categories use the language default.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {overrideSelections.map((sel) => (
              <li key={sel.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-[200px] font-medium">{sel.category_slug}</div>
                <div className="flex flex-wrap items-center gap-2">
                  {enabledSets.map((set) => (
                    <button
                      key={set.set_key}
                      type="button"
                      disabled={busy}
                      onClick={() => upsertOverride(sel.category_slug as string, set.set_key)}
                      className={`rounded-md border px-2 py-1 text-sm ${
                        sel.active_set_key === set.set_key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card hover:bg-accent'
                      }`}
                      aria-pressed={sel.active_set_key === set.set_key}
                    >
                      {set.label}
                    </button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOverride(sel.id)}
                    disabled={busy}
                    aria-label={`Remove override for ${sel.category_slug}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 rounded-md border p-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Add override
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-md border bg-background px-2 py-1 text-sm"
              value={addDraft.categorySlug}
              onChange={(e) => setAddDraft({ ...addDraft, categorySlug: e.target.value })}
              disabled={busy}
            >
              <option value="">Choose category…</option>
              {categories
                .filter((c) => !overrideSelections.some((s) => s.category_slug === c.slug))
                .map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.slug} — {c.title}
                  </option>
                ))}
            </select>

            <select
              className="rounded-md border bg-background px-2 py-1 text-sm"
              value={addDraft.setKey}
              onChange={(e) =>
                setAddDraft({ ...addDraft, setKey: e.target.value as CurriculumImageSetKey })
              }
              disabled={busy}
            >
              {enabledSets.map((set) => (
                <option key={set.set_key} value={set.set_key}>
                  {set.label}
                </option>
              ))}
            </select>

            <Button onClick={handleAddOverride} disabled={busy || !addDraft.categorySlug}>
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </Button>
          </div>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Preview</h2>
          <span className="text-xs text-muted-foreground">
            Active set for {LANGUAGE_LABELS[language]} (no category): {effectiveDefaultSetKey}
          </span>
        </div>
        <div className="space-y-2">
          {previewKeys.map((set) => (
            <div key={set.set_key} className="space-y-1">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {set.label} ({set.set_key})
              </div>
              <div className="flex flex-wrap gap-2">
                {PREVIEW_TERMS.map((term) => {
                  const resolved = resolveCurriculumImageSetAsset(term, {
                    activeSetKey: set.set_key,
                    languageIso: language,
                  })
                  return (
                    <figure
                      key={`${set.set_key}-${term}`}
                      className="flex flex-col items-center gap-1"
                    >
                      {resolved.publicPath ? (
                        <img
                          src={resolved.publicPath}
                          alt={`${term} (${set.label})`}
                          className="h-20 w-32 rounded-md border object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid h-20 w-32 place-items-center rounded-md border bg-muted text-xs text-muted-foreground">
                          missing
                        </div>
                      )}
                      <figcaption className="text-[0.7rem] text-muted-foreground">
                        {term}
                        {resolved.fallbackUsed ? ' (→A fallback)' : ''}
                      </figcaption>
                    </figure>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          <Save className="mr-1 inline h-3 w-3" />
          Changes save immediately. Learner pages pick up the new active set on next load.
        </p>
      </Card>
    </div>
  )
}
