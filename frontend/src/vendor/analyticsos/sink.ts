/** VENDORED from analytics-os @ b53d154 (2026-08-02). Do NOT hand-edit. */
import type { CaptureItem } from "./events.js";

/**
 * The engine seam. Everything above this interface is engine-agnostic; the
 * concrete analytics engine adapter lives strictly below it and is wired in
 * by the calling project, never by this package.
 */
export interface CaptureSink {
  send(items: CaptureItem[]): Promise<void>;
}

/** In-memory sink for tests and dev — accumulates every item sent to it. */
export class MemorySink implements CaptureSink {
  readonly items: CaptureItem[] = [];

  async send(items: CaptureItem[]): Promise<void> {
    this.items.push(...items);
  }
}
