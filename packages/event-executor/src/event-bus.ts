/**
 * Generic typed pub/sub event bus.
 *
 * Decouples Python execution (which only knows how to emit `CarEvent`s)
 * from whatever consumes them (today: a console/terminal panel; later:
 * anything else that wants to react to car actions without the Python
 * library or worker needing to change).
 */
export type EventHandler<T> = (event: T) => void;

export class EventBus<T extends { type: string }> {
  private listeners: Map<T["type"], Set<EventHandler<T>>> = new Map();

  on(type: T["type"], handler: EventHandler<T>): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
  }

  off(type: T["type"], handler: EventHandler<T>): void {
    this.listeners.get(type)?.delete(handler);
  }

  onAny(handler: EventHandler<T>): () => void {
    this.on(ANY_EVENT as T["type"], handler);
    return () => this.off(ANY_EVENT as T["type"], handler);
  }

  emit(event: T): void {
    this.listeners.get(event.type)?.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in event handler for "${event.type}":`, error);
      }
    });
    this.listeners.get(ANY_EVENT as T["type"])?.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in wildcard event handler:`, error);
      }
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}

const ANY_EVENT = "*";
