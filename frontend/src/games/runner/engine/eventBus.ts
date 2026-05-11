import type { EventType, LexiconPathEvent } from './types';

export class EventBus {
  private readonly sink: (event: LexiconPathEvent) => void;

  constructor(sink: (event: LexiconPathEvent) => void = defaultSink) {
    this.sink = sink;
  }

  emit(type: EventType, payload: Record<string, unknown> = {}): LexiconPathEvent {
    const event = { type, payload, at: Date.now() };
    this.sink(event);
    return event;
  }
}

function defaultSink(event: LexiconPathEvent): void {
  void event;
}
