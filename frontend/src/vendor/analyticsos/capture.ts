/** VENDORED from analytics-os @ b53d154 (2026-08-02). Do NOT hand-edit. */
import { StandardEventSchema, type CaptureItem, type EventName, type StandardEvent } from "./events.js";

import { parseAttribution, type Attribution } from "./attribution.js";
import { defaultRandomId } from "./id.js";
import type { CaptureSink } from "./sink.js";

export interface CaptureConfig {
  projectId: string;
  platform: "web" | "ios" | "android";
  /** The engine seam — where validated events are sent. */
  sink: CaptureSink;
  /** Page URL at init time; source of first-touch ref/UTM attribution. */
  url?: string;
  /** Injectable clock, for tests. Defaults to `() => new Date()`. */
  now?: () => Date;
  /** Injectable id generator, for tests. Defaults to a random UUID. */
  randomId?: () => string;
}

export interface Capture {
  /**
   * Builds a StandardEvent (ts from now(), project_id, platform, first-touch
   * ref/utm when present), validates it against StandardEventSchema, and
   * sends it via the sink under the current distinctId. An event name or
   * props shape that fails validation THROWS (03 conformance: reject, never
   * silently map) — the returned promise rejects.
   *
   * `opts.uuid` — when provided — becomes the event's top-level `uuid`
   * (never spread into `props`); pass a `deterministicUuid(seed)` (./id.js)
   * for idempotent events such as webhook-driven conversions.
   */
  track(event: EventName, props?: Record<string, unknown>, opts?: { uuid?: string }): Promise<void>;
  /** Attaches identity: subsequent events use `identity` as the distinctId (C-8 post-consent). */
  grantConsent(identity: string): void;
  /** Detaches identity: subsequent events use a fresh, non-persisted anonymous id. */
  revokeConsent(): void;
  state(): { consented: boolean; distinctId: string };
}

const ANON_PREFIX = "anon_";

/**
 * Creates a capture handle. Consent posture (C-8): starts anonymous with an
 * in-memory, session-scoped random distinctId — never persisted, per
 * portfolio law (pre-consent capture must be cookieless).
 */
export function createCapture(config: CaptureConfig): Capture {
  const now = config.now ?? (() => new Date());
  const randomId = config.randomId ?? defaultRandomId;
  const attribution: Attribution = parseAttribution(config.url);

  let consented = false;
  let distinctId = `${ANON_PREFIX}${randomId()}`;

  return {
    async track(event, props, opts) {
      const candidate: StandardEvent = {
        event,
        project_id: config.projectId,
        ts: now().toISOString(),
        platform: config.platform,
        ...(attribution.ref !== undefined ? { ref: attribution.ref } : {}),
        ...(attribution.utm !== undefined ? { utm: attribution.utm } : {}),
        ...(props !== undefined ? { props } : {}),
        ...(opts?.uuid !== undefined ? { uuid: opts.uuid } : {}),
      };

      // Throws (ZodError) on nonconforming input — never silently mapped.
      const validated = StandardEventSchema.parse(candidate);

      const item: CaptureItem = { distinctId, event: validated };
      await config.sink.send([item]);
    },

    grantConsent(identity) {
      consented = true;
      distinctId = identity;
    },

    revokeConsent() {
      consented = false;
      distinctId = `${ANON_PREFIX}${randomId()}`;
    },

    state() {
      return { consented, distinctId };
    },
  };
}
