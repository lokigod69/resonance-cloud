-- Queue position RPC and supporting index for learner-facing queue display.
-- Purely additive: one partial index + one SECURITY DEFINER read-only function.
-- Does NOT alter any existing table, column, constraint, RLS policy, index,
-- trigger, or function. Does NOT modify worker code paths or how
-- generation_jobs transitions through pending/approved/processing/complete/failed.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_generation_jobs_active_queue_order
  ON public.generation_jobs (priority DESC, created_at ASC, id ASC)
  WHERE status IN ('pending', 'approved', 'processing');

CREATE OR REPLACE FUNCTION public.get_my_queue_position(p_deck_id uuid)
RETURNS TABLE (
  job_id uuid,
  job_status text,
  jobs_ahead integer,
  queue_paused boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH target_job AS (
    SELECT gj.id, gj.status, gj.priority, gj.created_at
    FROM public.generation_jobs gj
    WHERE gj.user_id = v_user_id
      AND gj.deck_id = p_deck_id
      AND gj.status IN ('pending', 'approved', 'processing')
    ORDER BY gj.created_at DESC, gj.id DESC
    LIMIT 1
  ),
  settings_row AS (
    SELECT ss.queue_paused
    FROM public.system_settings ss
    WHERE ss.id = 1
  )
  SELECT
    tj.id AS job_id,
    tj.status AS job_status,
    CASE
      WHEN tj.status = 'processing' THEN 0
      ELSE COUNT(ahead.id)::integer
    END AS jobs_ahead,
    COALESCE(sr.queue_paused, false) AS queue_paused
  FROM target_job tj
  CROSS JOIN settings_row sr
  LEFT JOIN public.generation_jobs ahead
    ON tj.status IN ('pending', 'approved')
   AND (
     ahead.status = 'processing'
     OR (
       ahead.status IN ('pending', 'approved')
       AND (
         ahead.priority > tj.priority
         OR (ahead.priority = tj.priority AND ahead.created_at < tj.created_at)
         OR (ahead.priority = tj.priority AND ahead.created_at = tj.created_at AND ahead.id < tj.id)
       )
     )
   )
  GROUP BY tj.id, tj.status, sr.queue_paused;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_queue_position(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_queue_position(uuid) TO authenticated;

-- Rollback:
-- BEGIN;
--   DROP FUNCTION IF EXISTS public.get_my_queue_position(uuid);
--   DROP INDEX IF EXISTS public.idx_generation_jobs_active_queue_order;
-- COMMIT;

COMMIT;
