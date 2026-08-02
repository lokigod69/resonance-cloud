/** VENDORED from analytics-os @ b53d154 (2026-08-02). Do NOT hand-edit. */
import type { CaptureItem } from "./events.js";

import type { CaptureSink } from "./sink.js";

export interface PostHogSinkConfig {
  /** Ingestion host, e.g. "https://eu.i.posthog.com" — NOT the eu.posthog.com app/query host. */
  ingestHost: string;
  /** phc_… public project key — the only key this package ever handles. */
  projectApiKey: string;
  /** Injectable fetch, for tests. Defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

/**
 * The engine adapter below the CaptureSink seam, wired in by the calling
 * project. Browser-safe: it only ever holds the public phc_ project key,
 * POSTs to PostHog's ingestion host, and does no re-validation — the capture
 * layer above already validated each event, so this sink is dumb transport.
 */
export class PostHogSink implements CaptureSink {
  constructor(private readonly cfg: PostHogSinkConfig) {}

  async send(items: CaptureItem[]): Promise<void> {
    const batch = items.map(({ distinctId, event }) => ({
      event: event.event,
      distinct_id: distinctId,
      timestamp: event.ts,
      // Top-level (NOT properties): PostHog dedups on this field (same
      // day + same team), so a deterministic uuid survives webhook replays.
      ...(event.uuid !== undefined ? { uuid: event.uuid } : {}),
      properties: {
        project_id: event.project_id,
        platform: event.platform,
        ...(event.ref !== undefined ? { ref: event.ref } : {}),
        ...(event.utm !== undefined ? { utm: event.utm } : {}),
        ...(event.props ?? {}),
        // Pre-consent (anon_) events stay profile-less/cheap; consented
        // identified events get person profiles (C-8).
        $process_person_profile: !distinctId.startsWith("anon_"),
        // Never let PostHog derive location from the request IP — the
        // privacy posture promises no IP-based enrichment, profiles or not.
        $geoip_disable: true,
      },
    }));

    const doFetch = this.cfg.fetchImpl ?? fetch;
    const res = await doFetch(`${this.cfg.ingestHost}/batch/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: this.cfg.projectApiKey, batch }),
      keepalive: true,
    });
    if (!res.ok) {
      throw new Error(`PostHog capture failed: ${res.status} ${await res.text()}`);
    }
  }
}
