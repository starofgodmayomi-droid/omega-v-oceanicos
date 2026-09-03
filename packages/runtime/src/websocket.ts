/**
 * WebSocket event broadcaster for real-time verification updates
 * Coordinates publish-subscribe for verification loop events
 */

export interface VerificationEvent {
  type: 'observation' | 'verification' | 'attestation' | 'error';
  timestamp: string;
  id: string;
  data: Record<string, any>;
  source?: string;
}

export interface Subscriber {
  id: string;
  callback: (event: VerificationEvent) => void;
  filter?: (event: VerificationEvent) => boolean;
}

/**
 * Event broadcaster for WebSocket connections
 */
export class EventBroadcaster {
  private subscribers: Map<string, Subscriber> = new Map();
  private eventHistory: VerificationEvent[] = [];
  private maxHistorySize: number;
  private metrics = {
    eventsPublished: 0,
    activeSubscribers: 0,
  };

  constructor(maxHistorySize: number = 1000) {
    this.maxHistorySize = maxHistorySize;
  }

  subscribe(
    id: string,
    callback: (event: VerificationEvent) => void,
    filter?: (event: VerificationEvent) => boolean
  ): () => void {
    const subscriber: Subscriber = { id, callback, filter };
    this.subscribers.set(id, subscriber);
    this.metrics.activeSubscribers = this.subscribers.size;

    return () => {
      this.unsubscribe(id);
    };
  }

  unsubscribe(id: string): void {
    this.subscribers.delete(id);
    this.metrics.activeSubscribers = this.subscribers.size;
  }

  publish(event: VerificationEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    this.metrics.eventsPublished++;

    this.subscribers.forEach((subscriber) => {
      if (!subscriber.filter || subscriber.filter(event)) {
        try {
          subscriber.callback(event);
        } catch (error) {
          console.error(`Error in subscriber ${subscriber.id}:`, error);
        }
      }
    });
  }

  getHistory(limit: number = 50): VerificationEvent[] {
    return this.eventHistory.slice(-limit);
  }

  getHistoryByType(type: VerificationEvent['type'], limit: number = 50): VerificationEvent[] {
    return this.eventHistory.filter((e) => e.type === type).slice(-limit);
  }

  getMetrics() {
    return {
      ...this.metrics,
      historySize: this.eventHistory.length,
    };
  }

  clear(): void {
    this.eventHistory = [];
  }
}

/**
 * WebSocket message types
 */
export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'event' | 'history' | 'metrics' | 'error';
  payload?: any;
  timestamp?: string;
}

/**
 * Create WebSocket message
 */
export function createMessage(type: WebSocketMessage['type'], payload?: any): WebSocketMessage {
  return {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Parse subscription filter from query string
 */
export function parseFilter(
  filterStr?: string
): ((event: VerificationEvent) => boolean) | undefined {
  if (!filterStr) {
    return undefined;
  }

  const filters = filterStr.split(',').map((f) => f.trim());

  return (event: VerificationEvent) => {
    return filters.some((filter) => {
      if (filter.startsWith('type:')) {
        const type = filter.substring(5);
        return event.type === type;
      }

      if (filter.startsWith('source:')) {
        const source = filter.substring(7);
        return event.source === source;
      }

      return false;
    });
  };
}

/**
 * Generate event ID
 */
export function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
