import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const PROFILE_AVATARS_BUCKET = 'profile-avatars'
const SIGNED_URL_TTL_SECONDS = 3600

export function useProfileAvatarUrl(
  avatarPath: string | null | undefined,
  avatarUpdatedAt: string | null | undefined,
): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!avatarPath) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing the previous URL synchronously avoids flashing a stale signed URL after the avatar is removed
      setUrl(null)
      return
    }

    let cancelled = false

    void (async () => {
      const { data, error } = await supabase
        .storage
        .from(PROFILE_AVATARS_BUCKET)
        .createSignedUrl(avatarPath, SIGNED_URL_TTL_SECONDS)

      if (cancelled) return

      if (error || !data?.signedUrl) {
        setUrl(null)
        return
      }

      const cacheBuster = avatarUpdatedAt
        ? Math.floor(new Date(avatarUpdatedAt).getTime() / 1000)
        : 0
      const separator = data.signedUrl.includes('?') ? '&' : '?'
      setUrl(`${data.signedUrl}${separator}v=${cacheBuster}`)
    })()

    return () => {
      cancelled = true
    }
  }, [avatarPath, avatarUpdatedAt])

  return url
}
