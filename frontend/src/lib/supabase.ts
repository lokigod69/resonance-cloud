import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  email?: string | null
  display_name: string | null
  base_language: string | null
  role: 'learner' | 'admin'
  credits: number
  theme?: string
  avatar_path?: string | null
  avatar_updated_at?: string | null
  created_at: string
}

export type AuthProfile = Pick<
  Profile,
  'display_name' | 'base_language' | 'role' | 'credits' | 'avatar_path' | 'avatar_updated_at'
>
