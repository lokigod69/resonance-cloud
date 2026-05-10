import type { EngineEvent, EngineEventName, EventBus, EventListener } from './types';

export class ConsoleEventBus implements EventBus {
  private readonly listeners = new Map<EngineEventName, Set<EventListener>>();
  private readonly anyListeners = new Set<EventListener>();

  constructor(private readonly options: { silent?: boolean } = {}) {}

  emit(name: EngineEventName, payload: Record<string, unknown> = {}): void {
    const event: EngineEvent = { name, payload, at: Date.now() };
    void this.options;
    this.listeners.get(name)?.forEach((listener) => listener(event));
    this.anyListeners.forEach((listener) => listener(event));
  }

  on(name: EngineEventName, listener: EventListener): () => void {
    const listeners = this.listeners.get(name) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(name, listeners);
    return () => listeners.delete(listener);
  }

  onAny(listener: EventListener): () => void {
    this.anyListeners.add(listener);
    return () => this.anyListeners.delete(listener);
  }
}
