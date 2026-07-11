-- Cost Tracking System: rollup views for admin queries.
-- Depends on: 20260416000000_cost_tracking.sql

-- Average variable cost per word (last 30 days)
CREATE OR REPLACE VIEW v_avg_cost_per_word AS
SELECT
    DATE_TRUNC('day', ce.created_at)::date AS day,
    ce.user_id,
    ce.deck_id,
    ce.word_slug,
    COUNT(DISTINCT ce.stage) AS stages_completed,
    SUM(ce.estimated_cost_usd) FILTER (WHERE ce.status = 'success') AS total_variable_cost,
    SUM(ce.estimated_cost_usd) FILTER (WHERE ce.status = 'failed')  AS total_wasted_cost,
    COUNT(*) FILTER (WHERE ce.status = 'failed')  AS failed_attempts,
    COUNT(*) AS total_attempts
FROM cost_events ce
WHERE ce.created_at > now() - INTERVAL '30 days'
GROUP BY 1, 2, 3, 4;

-- Provider spend by month
CREATE OR REPLACE VIEW v_provider_spend_monthly AS
SELECT
    DATE_TRUNC('month', ce.created_at)::date AS month,
    ce.provider,
    ce.model,
    ce.stage,
    COUNT(*)                    AS call_count,
    SUM(ce.estimated_cost_usd)  AS total_estimated_usd,
    AVG(ce.estimated_cost_usd)  AS avg_cost_per_call,
    AVG(ce.duration_ms)         AS avg_duration_ms
FROM cost_events ce
GROUP BY 1, 2, 3, 4;

-- Cost breakdown per word (for single-word deep-dive)
CREATE OR REPLACE VIEW v_word_cost_breakdown AS
SELECT
    ce.word_slug,
    ce.deck_id,
    ce.user_id,
    ce.stage,
    ce.provider,
    ce.model,
    ce.status,
    ce.estimated_cost_usd,
    ce.usage_metrics,
    ce.duration_ms,
    ce.created_at
FROM cost_events ce
ORDER BY ce.created_at DESC;

-- Margin analysis helper
-- Combines variable costs from cost_events with fixed costs for the same month.
CREATE OR REPLACE VIEW v_margin_analysis AS
SELECT
    DATE_TRUNC('month', ce.created_at)::date AS month,
    ce.user_id,
    COUNT(DISTINCT ce.word_slug || '|' || ce.deck_id) AS words_generated,
    SUM(ce.estimated_cost_usd) AS variable_cost_usd,
    COALESCE(fc.total_fixed, 0) AS fixed_cost_total_usd
FROM cost_events ce
LEFT JOIN (
    SELECT month, SUM(amount_usd) AS total_fixed
    FROM fixed_costs
    GROUP BY month
) fc ON DATE_TRUNC('month', ce.created_at)::date = fc.month
GROUP BY 1, 2, fc.total_fixed;
