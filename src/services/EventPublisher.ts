import { IEventPublisher, IEventListener, ServiceEvent } from './IService';

/**
 * Event publisher implementing Observer pattern
 */
export class EventPublisher implements IEventPublisher {
  private static instance: EventPublisher;
  private listeners: Map<string, Set<IEventListener>>;

  private constructor() {
    this.listeners = new Map();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EventPublisher {
    if (!EventPublisher.instance) {
      EventPublisher.instance = new EventPublisher();
    }
    return EventPublisher.instance;
  }

  /**
   * Subscribe to events
   */
  public subscribe(eventType: string, listener: IEventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  /**
   * Unsubscribe from events
   */
  public unsubscribe(eventType: string, listener: IEventListener): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * Publish event to all subscribers
   */
  public async publish(event: ServiceEvent): Promise<void> {
    const eventListeners = this.listeners.get(event.type);
    if (!eventListeners || eventListeners.size === 0) {
      return;
    }

    const promises = Array.from(eventListeners).map(listener => 
      listener.handle(event).catch(error => {
        console.error(`Error in event listener for ${event.type}:`, error);
      })
    );

    await Promise.all(promises);
  }

  /**
   * Get all event types
   */
  public getEventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get listener count for event type
   */
  public getListenerCount(eventType: string): number {
    return this.listeners.get(eventType)?.size || 0;
  }

  /**
   * Clear all listeners
   */
  public clear(): void {
    this.listeners.clear();
  }
}

/**
 * Common event types
 */
export enum EventType {
  TOPIC_CREATED = 'topic.created',
  TOPIC_UPDATED = 'topic.updated',
  TOPIC_DELETED = 'topic.deleted',
  TOPIC_VERSION_CREATED = 'topic.version.created',
  RESOURCE_CREATED = 'resource.created',
  RESOURCE_UPDATED = 'resource.updated',
  RESOURCE_DELETED = 'resource.deleted',
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_ROLE_CHANGED = 'user.role.changed'
}

/**
 * Audit event listener for logging
 */
export class AuditEventListener implements IEventListener {
  private auditLog: ServiceEvent[] = [];

  public async handle(event: ServiceEvent): Promise<void> {
    this.auditLog.push(event);
    console.log(`[AUDIT] ${event.type}: ${event.entityType}(${event.entityId}) by user ${event.userId || 'system'}`);
  }

  public getAuditLog(): ServiceEvent[] {
    return [...this.auditLog];
  }

  public clearAuditLog(): void {
    this.auditLog = [];
  }
}

/**
 * Cache invalidation event listener
 */
export class CacheInvalidationListener implements IEventListener {
  private cacheKeys: Set<string> = new Set();

  public async handle(event: ServiceEvent): Promise<void> {
    // Invalidate cache keys related to the entity
    const keysToInvalidate = [
      `${event.entityType}:${event.entityId}`,
      `${event.entityType}:all`,
      `${event.entityType}:list`
    ];

    for (const key of keysToInvalidate) {
      this.cacheKeys.delete(key);
    }

    console.log(`[CACHE] Invalidated cache for ${event.entityType}(${event.entityId})`);
  }

  public isCached(key: string): boolean {
    return this.cacheKeys.has(key);
  }

  public addToCache(key: string): void {
    this.cacheKeys.add(key);
  }

  public clearCache(): void {
    this.cacheKeys.clear();
  }
}

