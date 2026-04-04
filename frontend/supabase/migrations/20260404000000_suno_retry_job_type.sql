-- Add job routing columns to generation_jobs for Suno retry support
ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS job_type TEXT NOT NULL DEFAULT 'full'
    CHECK (job_type IN ('full', 'suno_retry')),
  ADD COLUMN IF NOT EXISTS target_word_id UUID REFERENCES public.words(id) ON DELETE SET NULL;

-- Index for retry job polling
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status_type
  ON public.generation_jobs(status, job_type);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_target_word_id
  ON public.generation_jobs(target_word_id)
  WHERE target_word_id IS NOT NULL;
