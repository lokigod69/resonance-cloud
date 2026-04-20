-- Queue position RPC and supporting index for learner-facing queue display.
-- Uses CREATE INDEX CONCURRENTLY because the current public.generation_jobs row
-- count could not be verified locally. Product owner should run
-- SELECT count(*) FROM generation_jobs; before applying if they want to
-- reassess whether a non-concurrent CREATE INDEX would be acceptable.

DROP INDEX IF EXISTS public.idx_generation_jobs_active_queue_order;

BEGIN;

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
    SELECT gj.id, gj.status, gj.created_at
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
    COUNT(ahead.id)::integer AS jobs_ahead,
    COALESCE(sr.queue_paused, false) AS queue_paused
  FROM target_job tj
  LEFT JOIN settings_row sr
    ON true
  LEFT JOIN public.generation_jobs ahead
    ON ahead.status IN ('pending', 'approved', 'processing')
   AND ahead.created_at < tj.created_at
  GROUP BY tj.id, tj.status, sr.queue_paused;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_queue_position(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_queue_position(uuid) TO authenticated;

COMMIT;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generation_jobs_active_created_at
  ON public.generation_jobs (created_at)
  WHERE status IN ('pending', 'approved', 'processing');

-- Rollback:
-- DROP INDEX IF EXISTS public.idx_generation_jobs_active_created_at;
-- BEGIN;
--   DROP FUNCTION IF EXISTS public.get_my_queue_position(uuid);
-- COMMIT;
