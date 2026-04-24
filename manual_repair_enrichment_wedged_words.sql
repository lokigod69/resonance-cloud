-- Manual repair for enrichment bootstrap failures.
-- Review before running in the Supabase SQL editor.
-- Do not add this as a migration; this is a one-time production repair script.

-- Repair the originally wedged job's two words.
UPDATE words
SET current_stage = 'pending'
WHERE id IN (
  '08c93b47-1327-4f1e-a9f3-a8acc95cb3c9',
  '47f2de8d-5080-4a7a-8226-da941bd2a11c'
)
AND current_stage = 'enrichment'
AND deck_id = 'a5f3f3e0-d5f3-4e92-90a6-49fb771403d4';

-- Repair the second known wedged job's word.
UPDATE words
SET
  current_stage = 'pending',
  status = 'pending',
  failed_stage = NULL
WHERE id = '345c48c4-841f-4b62-a190-d859ee704ec6'
AND current_stage = 'failed'
AND deck_id = '18bf3074-dd37-4ba7-9cee-48f04c7a3548';

-- Scan for any remaining words stuck at enrichment.
-- Review each returned row before applying any broader cleanup.
SELECT id, deck_id, word, current_stage, status
FROM words
WHERE current_stage = 'enrichment'
  AND status = 'pending';
