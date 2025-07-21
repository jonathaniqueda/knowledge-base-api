import { BaseEntity } from '../models/BaseEntity';
import { SearchCriteria, PaginationOptions, SortOptions } from '../types/common';

/**
 * Generic repository interface defining common CRUD operations
 */
export interface IRepository<T extends BaseEntity> {
  /**
   * Create a new entity
   */
  create(entity: T): Promise<T>;

  /**
   * Find entity by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find all entities
   */
  findAll(): Promise<T[]>;

  /**
   * Find entities by criteria
   */
  findBy(criteria: SearchCriteria): Promise<T[]>;

  /**
   * Find entities with pagination
   */
  findWithPagination(
    criteria?: SearchCriteria,
    pagination?: PaginationOptions,
    sort?: SortOptions
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Update an entity
   */
  update(id: string, entity: Partial<T>): Promise<T | null>;

  /**
   * Delete an entity
   */
  delete(id: string): Promise<boolean>;

  /**
   * Check if entity exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Count entities
   */
  count(criteria?: SearchCriteria): Promise<number>;

  /**
   * Save all data to persistent storage
   */
  save(): Promise<void>;

  /**
   * Load all data from persistent storage
   */
  load(): Promise<void>;

  /**
   * Clear all data
   */
  clear(): Promise<void>;
}

