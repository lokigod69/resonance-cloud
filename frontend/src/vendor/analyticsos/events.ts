/**
 * VENDORED from analytics-os @ b53d154 (2026-08-02). Do NOT hand-edit —
 * regenerate via analytics-os (skills/instrument-project). Source:
 * packages/core/src/events.ts + CaptureItem from store.ts.
 */
import { z } from "zod";

/**
 * The portfolio event standard. Every product emits events shaped like this
 * so analytics-os can aggregate across the portfolio without each product
 * inventing its own vocabulary.
 */
export const EVENT_NAMES = [
  "visit",
  "signup",
  "activation",
  "core_action",
  "share",
  "trial_start",
  "conversion",
  "churn_marker",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

/** Query-string parameter carrying the referral/attribution code. */
export const REF_PARAM = "ref";

const slug = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, "project_id must be a lowercase slug matching /^[a-z0-9][a-z0-9-]*$/");

export const StandardEventSchema = z.object({
  event: z.enum(EVENT_NAMES),
  project_id: slug,
  ts: z.string().datetime(),
  platform: z.enum(["web", "ios", "android"]),
  ref: z.string().optional(),
  utm: z
    .object({
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
      content: z.string().optional(),
      term: z.string().optional(),
    })
    .optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  /**
   * Optional deterministic event id (see `deterministicUuid` in id.ts).
   * Must be a valid UUID string — PostHog dedups on this as a TOP-LEVEL
   * batch field (same day + same team), so webhook replays with the same
   * seed (e.g. "conversion:<purchase_id>") can't double-count. Omitted by
   * default; every existing caller keeps working unchanged.
   */
  uuid: z.string().uuid().optional(),
});

export type StandardEvent = z.infer<typeof StandardEventSchema>;

/** True when `name` is one of the portfolio event standard's known event names. */
export function isStandardEvent(name: string): name is EventName {
  return (EVENT_NAMES as readonly string[]).includes(name);
}

/**
 * One captured occurrence: a standard event attributed to a stable subject id.
 * `distinctId` is an engine-level concern (anonymous or identified),
 * deliberately outside the event vocabulary itself.
 */
export interface CaptureItem {
  distinctId: string;
  event: StandardEvent;
}
