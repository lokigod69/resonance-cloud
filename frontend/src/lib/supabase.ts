import { createClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'
import { isNativeApp } from '@/lib/platform'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

const capacitorPreferencesStorage = {
  async getItem(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key })
    return value
  },
  async setItem(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value })
  },
  async removeItem(key: string): Promise<void> {
    await Preferences.remove({ key })
  },
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  isNativeApp()
    ? {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
          storage: capacitorPreferencesStorage,
        },
      }
    : undefined,
)

export type Profile = {
  id: string
  email?: string | null
  display_name: string | null
  base_language: string | null
  /** Canonical learning-target language (wizard naming). Optional because the
   * column arrives with migration 20260727090000 — code must tolerate its
   * absence (undefined) and read it defensively until applied. */
  target_language?: string | null
  role: 'learner' | 'admin'
  credits: number
  /** Current-period subscription credit grant (resets each renewal, spent before
   * credits). Optional until migration 20260728090000 is applied. */
  plan_credits?: number | null
  new_words_per_day?: number | null
  seen_tutorials: Record<string, string | null>
  theme?: string
  avatar_path?: string | null
  avatar_updated_at?: string | null
  created_at: string
}

export type AuthProfile = Pick<
  Profile,
  | 'display_name'
  | 'base_language'
  | 'target_language'
  | 'role'
  | 'credits'
  | 'plan_credits'
  | 'new_words_per_day'
  | 'seen_tutorials'
  | 'avatar_path'
  | 'avatar_updated_at'
>
