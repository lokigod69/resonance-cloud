-- ============================================================
-- Phase 1 Foundation Migration
-- Run manually in the Supabase SQL Editor.
--
-- Creates:
--   1. email column on profiles + backfill
--   2. Missing profile rows for existing auth.users
--   3. handle_new_user trigger (auto-creates profile on signup)
--   4. RLS policies for profiles
--   5. invite_codes table (multi-use)
--   6. invite_code_redemptions table
--   7. RLS for invite tables
--   8. redeem_invite_code RPC function
--   9. Indexes
-- ============================================================

-- -----------------------------------------------------------------
-- 1. Add email column to profiles
-- -----------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- -----------------------------------------------------------------
-- 2. Backfill email from auth.users for existing profiles
-- -----------------------------------------------------------------

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL;

-- -----------------------------------------------------------------
-- 3. Create profile rows for auth.users that have no profile
-- -----------------------------------------------------------------

INSERT INTO public.profiles (id, email, display_name, role, credits, created_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'learner',
  0,
  COALESCE(u.created_at, NOW())
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- -----------------------------------------------------------------
-- 4. handle_new_user trigger
-- -----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, credits, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'learner',
    0,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------
-- 5. RLS policies for profiles
-- -----------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- The trigger inserts as SECURITY DEFINER so it bypasses RLS,
-- but we allow authenticated inserts as a safety net.
DROP POLICY IF EXISTS "Allow profile inserts" ON public.profiles;
CREATE POLICY "Allow profile inserts" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- -----------------------------------------------------------------
-- 6. invite_codes table
-- -----------------------------------------------------------------

-- Drop old single-use invite_codes table if it exists (no production data to preserve)
DROP TABLE IF EXISTS public.invite_codes CASCADE;

CREATE TABLE public.invite_codes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  credits     INTEGER NOT NULL DEFAULT 10,
  max_uses    INTEGER,                          -- NULL = unlimited
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------
-- 7. invite_code_redemptions table
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invite_code_redemptions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_code_id  UUID NOT NULL REFERENCES public.invite_codes(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credits_awarded INTEGER NOT NULL,
  redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(invite_code_id, user_id)
);

-- -----------------------------------------------------------------
-- 8. RLS for invite_codes
-- -----------------------------------------------------------------

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read codes" ON public.invite_codes;
CREATE POLICY "Authenticated users can read codes" ON public.invite_codes
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage codes" ON public.invite_codes;
CREATE POLICY "Admins can manage codes" ON public.invite_codes
  FOR ALL USING (public.is_admin());

-- -----------------------------------------------------------------
-- 9. RLS for invite_code_redemptions
-- -----------------------------------------------------------------

ALTER TABLE public.invite_code_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see own redemptions" ON public.invite_code_redemptions;
CREATE POLICY "Users can see own redemptions" ON public.invite_code_redemptions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can see all redemptions" ON public.invite_code_redemptions;
CREATE POLICY "Admins can see all redemptions" ON public.invite_code_redemptions
  FOR SELECT USING (public.is_admin());

-- Insert handled by the RPC function (SECURITY DEFINER), so no INSERT policy needed.

-- -----------------------------------------------------------------
-- 10. redeem_invite_code RPC
-- -----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.redeem_invite_code(code_text TEXT)
RETURNS JSONB AS $$
DECLARE
  v_code   public.invite_codes%ROWTYPE;
  v_count  INTEGER;
BEGIN
  -- Look up the code (case-insensitive)
  SELECT * INTO v_code
  FROM public.invite_codes
  WHERE code = upper(code_text) AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive code');
  END IF;

  -- Check if user already redeemed this code
  IF EXISTS (
    SELECT 1 FROM public.invite_code_redemptions
    WHERE invite_code_id = v_code.id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already redeemed this code');
  END IF;

  -- Check max uses
  IF v_code.max_uses IS NOT NULL THEN
    SELECT count(*) INTO v_count
    FROM public.invite_code_redemptions
    WHERE invite_code_id = v_code.id;

    IF v_count >= v_code.max_uses THEN
      RETURN jsonb_build_object('success', false, 'error', 'This code has reached its maximum uses');
    END IF;
  END IF;

  -- Record redemption
  INSERT INTO public.invite_code_redemptions (invite_code_id, user_id, credits_awarded)
  VALUES (v_code.id, auth.uid(), v_code.credits);

  -- Add credits to user profile
  UPDATE public.profiles
  SET credits = credits + v_code.credits
  WHERE id = auth.uid();

  RETURN jsonb_build_object('success', true, 'credits_awarded', v_code.credits);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------
-- 11. Indexes
-- -----------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_invite_codes_code
  ON public.invite_codes(code);

CREATE INDEX IF NOT EXISTS idx_invite_code_redemptions_code_id
  ON public.invite_code_redemptions(invite_code_id);

CREATE INDEX IF NOT EXISTS idx_invite_code_redemptions_user_id
  ON public.invite_code_redemptions(user_id);
