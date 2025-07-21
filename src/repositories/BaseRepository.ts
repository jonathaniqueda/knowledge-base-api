import fs from 'fs/promises';
import path from 'path';
import { BaseEntity } from '../models/BaseEntity';
import { IRepository } from './IRepository';
import { SearchCriteria, PaginationOptions, SortOptions } from '../types/common';

/**
 * Abstract base repository with in-memory storage and JSON file persistence
 */
export abstract class BaseRepository<T extends BaseEntity> implements IRepository<T> {
  protected data: Map<string, T>;
  protected filePath: string;

  constructor(fileName: string) {
    this.data = new Map();
    this.filePath = path.join(process.cwd(), 'data', fileName);
    this.ensureDataDirectory();
  }

  /**
   * Ensure data directory exists
   */
  private async ensureDataDirectory(): Promise<void> {
    const dataDir = path.dirname(this.filePath);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  /**
   * Abstract method to create entity from JSON data
   */
  protected abstract fromJSON(data: any): T;

  /**
   * Create a new entity
   */
  public async create(entity: T): Promise<T> {
    const validation = entity.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    this.data.set(entity.id, entity);
    await this.save();
    return entity;
  }

  /**
   * Find entity by ID
   */
  public async findById(id: string): Promise<T | null> {
    return this.data.get(id) || null;
  }

  /**
   * Find all entities
   */
  public async findAll(): Promise<T[]> {
    return Array.from(this.data.values());
  }

  /**
   * Find entities by criteria
   */
  public async findBy(criteria: SearchCriteria): Promise<T[]> {
    const entities = Array.from(this.data.values());
    
    return entities.filter(entity => {
      return Object.entries(criteria).every(([key, value]) => {
        const entityValue = (entity as any)[key];
        
        if (value === null || value === undefined) {
          return entityValue === value;
        }
        
        if (typeof value === 'string' && typeof entityValue === 'string') {
          return entityValue.toLowerCase().includes(value.toLowerCase());
        }
        
        return entityValue === value;
      });
    });
  }

  /**
   * Find entities with pagination
   */
  public async findWithPagination(
    criteria?: SearchCriteria,
    pagination?: PaginationOptions,
    sort?: SortOptions
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    let entities = criteria ? await this.findBy(criteria) : await this.findAll();

    // Apply sorting
    if (sort) {
      entities.sort((a, b) => {
        const aValue = (a as any)[sort.field];
        const bValue = (b as any)[sort.field];
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;
        
        return sort.direction === 'desc' ? -comparison : comparison;
      });
    }

    const total = entities.length;
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const totalPages = Math.ceil(total / limit);
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = entities.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total,
      page,
      limit,
      totalPages
    };
  }

  /**
   * Update an entity
   */
  public async update(id: string, updates: Partial<T>): Promise<T | null> {
    const entity = this.data.get(id);
    if (!entity) {
      return null;
    }

    // Apply updates
    Object.assign(entity, updates);
    (entity as any).updatedAt = new Date();

    const validation = entity.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    this.data.set(id, entity);
    await this.save();
    return entity;
  }

  /**
   * Delete an entity
   */
  public async delete(id: string): Promise<boolean> {
    const deleted = this.data.delete(id);
    if (deleted) {
      await this.save();
    }
    return deleted;
  }

  /**
   * Check if entity exists
   */
  public async exists(id: string): Promise<boolean> {
    return this.data.has(id);
  }

  /**
   * Count entities
   */
  public async count(criteria?: SearchCriteria): Promise<number> {
    if (!criteria) {
      return this.data.size;
    }
    
    const entities = await this.findBy(criteria);
    return entities.length;
  }

  /**
   * Save all data to persistent storage
   */
  public async save(): Promise<void> {
    try {
      const entities = Array.from(this.data.values());
      const jsonData = entities.map(entity => entity.toJSON());
      await fs.writeFile(this.filePath, JSON.stringify(jsonData, null, 2));
    } catch (error) {
      console.error(`Failed to save data to ${this.filePath}:`, error);
      throw new Error('Failed to save data to persistent storage');
    }
  }

  /**
   * Load all data from persistent storage
   */
  public async load(): Promise<void> {
    try {
      await fs.access(this.filePath);
      const fileContent = await fs.readFile(this.filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);
      
      this.data.clear();
      for (const item of jsonData) {
        const entity = this.fromJSON(item);
        this.data.set(entity.id, entity);
      }
    } catch (error) {
      // File doesn't exist or is invalid, start with empty data
      this.data.clear();
    }
  }

  /**
   * Clear all data
   */
  public async clear(): Promise<void> {
    this.data.clear();
    await this.save();
  }

  /**
   * Get all IDs
   */
  public async getAllIds(): Promise<string[]> {
    return Array.from(this.data.keys());
  }

  /**
   * Batch create entities
   */
  public async createMany(entities: T[]): Promise<T[]> {
    const created: T[] = [];
    
    for (const entity of entities) {
      const validation = entity.validate();
      if (!validation.isValid) {
        throw new Error(`Validation failed for entity ${entity.id}: ${validation.errors.join(', ')}`);
      }
      
      this.data.set(entity.id, entity);
      created.push(entity);
    }
    
    await this.save();
    return created;
  }

  /**
   * Batch delete entities
   */
  public async deleteMany(ids: string[]): Promise<number> {
    let deletedCount = 0;
    
    for (const id of ids) {
      if (this.data.delete(id)) {
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      await this.save();
    }
    
    return deletedCount;
  }
}

