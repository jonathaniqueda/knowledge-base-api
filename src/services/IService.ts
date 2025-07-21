import { BaseEntity } from '../models/BaseEntity';
import { SearchCriteria, PaginationOptions, SortOptions, ValidationResult } from '../types/common';

/**
 * Base service interface defining common business operations
 */
export interface IService<T extends BaseEntity> {
  /**
   * Create a new entity with business logic validation
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * Get entity by ID with permission checks
   */
  getById(id: string, userId?: string): Promise<T | null>;

  /**
   * Get all entities with optional filtering
   */
  getAll(criteria?: SearchCriteria, userId?: string): Promise<T[]>;

  /**
   * Get entities with pagination
   */
  getPaginated(
    criteria?: SearchCriteria,
    pagination?: PaginationOptions,
    sort?: SortOptions,
    userId?: string
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Update entity with business logic validation
   */
  update(id: string, data: Partial<T>, userId?: string): Promise<T | null>;

  /**
   * Delete entity with business logic checks
   */
  delete(id: string, userId?: string): Promise<boolean>;

  /**
   * Validate entity data
   */
  validate(data: Partial<T>): ValidationResult;
}

/**
 * Event interface for service events
 */
export interface ServiceEvent {
  type: string;
  entityType: string;
  entityId: string;
  userId?: string;
  timestamp: Date;
  data?: any;
}

/**
 * Event listener interface
 */
export interface IEventListener {
  handle(event: ServiceEvent): Promise<void>;
}

/**
 * Event publisher interface
 */
export interface IEventPublisher {
  subscribe(eventType: string, listener: IEventListener): void;
  unsubscribe(eventType: string, listener: IEventListener): void;
  publish(event: ServiceEvent): Promise<void>;
}

