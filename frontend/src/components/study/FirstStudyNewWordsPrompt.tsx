import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'
import { NEW_WORDS_PER_DAY_OPTIONS, normalizeNewWordsPerDay } from '@/lib/dailyHabits'

const seenKey = (userId: string) => `lingwave:nwpd-prompt-seen:${userId}`

/**
 * The first time a learner reaches the study flow, ask how many NEW words per DAY they
 * want — defaulting to the stored profile value — and persist the choice to
 * profiles.new_words_per_day. Shown once per account (tracked in localStorage); afterwards
 * it lives in the profile/settings and does not reappear. Deliberately NOT part of
 * onboarding (a concurrent agent owns that flow); the at-first-study moment is its home.
 */
export function FirstStudyNewWordsPrompt() {
  const { user, profile, refreshProfile } = useAuth()
  const { t } = useTranslation()
  const storedValue = normalizeNewWordsPerDay(profile?.new_words_per_day)

  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(storedValue)
  const [saving, setSaving] = useState(false)

  // Open once, the first time, once the user is known and they haven't been prompted
  // before on this device. Keyed on the user id only so the dialog doesn't re-open as
  // the profile streams in.
  useEffect(() => {
    if (!user) return
    if (typeof window === 'undefined') return
    if (window.localStorage.getItem(seenKey(user.id))) return
    setValue(normalizeNewWordsPerDay(profile?.new_words_per_day))
    setOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot the stored default once when the user becomes known; intentionally not re-running on profile updates
  }, [user?.id])

  if (!user || !open) return null

  const markSeen = () => {
    try {
      window.localStorage.setItem(seenKey(user.id), '1')
    } catch {
      /* localStorage unavailable (private mode) — prompt may reappear, harmless */
    }
  }

  const close = () => {
    markSeen()
    setOpen(false)
  }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      if (value !== storedValue) {
        await supabase.from('profiles').update({ new_words_per_day: value }).eq('id', user.id)
        await refreshProfile()
      }
    } finally {
      setSaving(false)
      close()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close() }}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('study.newWordsPrompt.title')}</DialogTitle>
          <DialogDescription>{t('study.newWordsPrompt.body')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('profile.newWordsPerDay')}</label>
          <Select
            value={String(value)}
            onValueChange={(next) => setValue(normalizeNewWordsPerDay(Number(next)))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NEW_WORDS_PER_DAY_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {t('study.newWordsPrompt.perDayOption', { count: option })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} disabled={saving}>
            {t('study.newWordsPrompt.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
