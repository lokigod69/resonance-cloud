-- Cost Tracking System: core tables
-- Records every external API call with cost attribution per word.

-- cost_events: one row per external API call attempt
CREATE TABLE IF NOT EXISTS cost_events (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Attribution
    word_id         UUID REFERENCES words(id) ON DELETE SET NULL,
    user_id         UUID NOT NULL,
    deck_id         UUID NOT NULL,
    word_slug       TEXT NOT NULL,

    -- Pipeline context
    stage           TEXT NOT NULL,       -- concept | images_storyboard | images_rendering | song | video | video_infrastructure | bookend | enrichment
    attempt_number  INT DEFAULT 1,
    status          TEXT NOT NULL,       -- success | failed | skipped

    -- Provider details
    provider        TEXT NOT NULL,       -- openrouter | gemini | kie_ai | fal_ai | runpod | elevenlabs | self_hosted
    model           TEXT,                -- deepseek/deepseek-v3.2 | gemini-2.5-flash-image | wan/2-7-image | ltx-2.3-fast | ...

    -- Usage metrics (provider-specific, stored as JSONB)
    usage_metrics   JSONB DEFAULT '{}'::jsonb,
    -- Examples:
    --   LLM:   {"prompt_tokens": 1200, "completion_tokens": 800, "total_tokens": 2000}
    --   GPU:   {"gpu_seconds": 90, "gpu_type": "NVIDIA L40S", "pod_id": "abc123"}
    --   Image: {"images_generated": 4, "images_refused": 1, "retries": 2}
    --   TTS:   {"characters": 12, "voice_id": "abc", "model_id": "eleven_flash_v2_5"}
    --   Video: {"duration_seconds": 6, "resolution": "1080p", "video_mode": "ltx_fast"}
    --   Suno:  {"task_id": "xxx", "model": "V5_5"}

    -- Cost
    estimated_cost_usd  NUMERIC(10, 6),  -- Our estimate at time of logging
    provider_cost_usd   NUMERIC(10, 6),  -- From provider response, if available

    -- Duration
    duration_ms     INT,                 -- Wall-clock time for this specific call

    -- Debugging
    error_message   TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb  -- Catch-all for provider-specific data
);

-- Indexes for the queries we'll run
CREATE INDEX idx_cost_events_user_id ON cost_events(user_id);
CREATE INDEX idx_cost_events_created_at ON cost_events(created_at);
CREATE INDEX idx_cost_events_stage ON cost_events(stage);
CREATE INDEX idx_cost_events_provider ON cost_events(provider);
CREATE INDEX idx_cost_events_word ON cost_events(deck_id, word_slug);

-- Fixed costs: monthly recurring expenses not tied to specific words
CREATE TABLE IF NOT EXISTS fixed_costs (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    month       DATE NOT NULL,              -- First of month: 2026-04-01
    service     TEXT NOT NULL,              -- railway | vercel | supabase | runpod_volume | domain | ...
    category    TEXT NOT NULL DEFAULT 'infrastructure',  -- infrastructure | storage | cdn | monitoring
    amount_usd  NUMERIC(10, 2) NOT NULL,
    notes       TEXT,
    UNIQUE(month, service)                  -- One entry per service per month
);

-- Enable RLS (admin-only access)
ALTER TABLE cost_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_costs ENABLE ROW LEVEL SECURITY;

-- No user-facing policies needed; this is admin/backend only.
-- The service role key (used by the orchestrator) bypasses RLS.
