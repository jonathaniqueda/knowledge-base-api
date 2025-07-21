import { Resource } from '../models/Resource';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { TopicRepository } from '../repositories/TopicRepository';
import { UserRepository } from '../repositories/UserRepository';
import { IService } from './IService';
import { EventPublisher, EventType } from './EventPublisher';
import { SearchCriteria, PaginationOptions, SortOptions, ValidationResult, ResourceType } from '../types/common';

/**
 * Resource service for managing topic resources
 */
export class ResourceService implements IService<Resource> {
  private resourceRepository: ResourceRepository;
  private topicRepository: TopicRepository;
  private userRepository: UserRepository;
  private eventPublisher: EventPublisher;

  constructor(
    resourceRepository: ResourceRepository,
    topicRepository: TopicRepository,
    userRepository: UserRepository
  ) {
    this.resourceRepository = resourceRepository;
    this.topicRepository = topicRepository;
    this.userRepository = userRepository;
    this.eventPublisher = EventPublisher.getInstance();
  }

  /**
   * Create a new resource
   */
  public async create(data: Partial<Resource>): Promise<Resource> {
    if (!data.topicId || !data.url || !data.description || !data.type) {
      throw new Error('Topic ID, URL, description, and type are required');
    }

    // Validate topic exists
    const topic = await this.topicRepository.findById(data.topicId);
    if (!topic) {
      throw new Error('Topic not found');
    }

    const resource = new Resource(
      data.topicId,
      data.url,
      data.description,
      data.type
    );

    const validation = this.validate(resource);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const createdResource = await this.resourceRepository.create(resource);

    // Publish event
    await this.eventPublisher.publish({
      type: EventType.RESOURCE_CREATED,
      entityType: 'Resource',
      entityId: createdResource.id,
      timestamp: new Date(),
      data: { 
        topicId: createdResource.topicId,
        type: createdResource.type,
        url: createdResource.url
      }
    });

    return createdResource;
  }

  /**
   * Get resource by ID with permission checks
   */
  public async getById(id: string, userId?: string): Promise<Resource | null> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to read resources');
      }
    }

    return this.resourceRepository.findById(id);
  }

  /**
   * Get all resources
   */
  public async getAll(criteria?: SearchCriteria, userId?: string): Promise<Resource[]> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to read resources');
      }
    }

    return criteria ? 
      this.resourceRepository.findBy(criteria) : 
      this.resourceRepository.findAll();
  }

  /**
   * Get resources with pagination
   */
  public async getPaginated(
    criteria?: SearchCriteria,
    pagination?: PaginationOptions,
    sort?: SortOptions,
    userId?: string
  ): Promise<{
    data: Resource[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to read resources');
      }
    }

    return this.resourceRepository.findWithPagination(criteria, pagination, sort);
  }

  /**
   * Update resource
   */
  public async update(id: string, data: Partial<Resource>, userId?: string): Promise<Resource | null> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canUpdate()) {
        throw new Error('Insufficient permissions to update resources');
      }
    }

    const existingResource = await this.resourceRepository.findById(id);
    if (!existingResource) {
      return null;
    }

    // Validate topic exists if changing topic
    if (data.topicId && data.topicId !== existingResource.topicId) {
      const topic = await this.topicRepository.findById(data.topicId);
      if (!topic) {
        throw new Error('Topic not found');
      }
    }

    const updatedResource = await this.resourceRepository.update(id, data);

    if (updatedResource) {
      await this.eventPublisher.publish({
        type: EventType.RESOURCE_UPDATED,
        entityType: 'Resource',
        entityId: id,
        userId,
        timestamp: new Date(),
        data: { changes: data }
      });
    }

    return updatedResource;
  }

  /**
   * Delete resource
   */
  public async delete(id: string, userId?: string): Promise<boolean> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canDelete()) {
        throw new Error('Insufficient permissions to delete resources');
      }
    }

    const resource = await this.resourceRepository.findById(id);
    if (!resource) {
      return false;
    }

    const deleted = await this.resourceRepository.delete(id);

    if (deleted) {
      await this.eventPublisher.publish({
        type: EventType.RESOURCE_DELETED,
        entityType: 'Resource',
        entityId: id,
        userId,
        timestamp: new Date(),
        data: { 
          topicId: resource.topicId,
          url: resource.url,
          type: resource.type
        }
      });
    }

    return deleted;
  }

  /**
   * Validate resource data
   */
  public validate(data: Partial<Resource>): ValidationResult {
    const resource = data as Resource;
    return resource.validate ? resource.validate() : { isValid: true, errors: [] };
  }

  /**
   * Get resources by topic ID
   */
  public async getByTopicId(topicId: string, userId?: string): Promise<Resource[]> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to read resources');
      }
    }

    return this.resourceRepository.findByTopicId(topicId);
  }

  /**
   * Get resources by type
   */
  public async getByType(type: ResourceType, userId?: string): Promise<Resource[]> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to read resources');
      }
    }

    return this.resourceRepository.findByType(type);
  }

  /**
   * Search resources by URL
   */
  public async searchByUrl(urlPattern: string, userId?: string): Promise<Resource[]> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to search resources');
      }
    }

    return this.resourceRepository.searchByUrl(urlPattern);
  }

  /**
   * Search resources by description
   */
  public async searchByDescription(descriptionPattern: string, userId?: string): Promise<Resource[]> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to search resources');
      }
    }

    return this.resourceRepository.searchByDescription(descriptionPattern);
  }

  /**
   * Get resource statistics
   */
  public async getStatistics(userId?: string): Promise<{
    totalResources: number;
    byType: Record<ResourceType, number>;
    byTopic: Record<string, number>;
    accessibilityStats: {
      accessible: number;
      typeConsistent: number;
      validUrls: number;
    };
  }> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to view statistics');
      }
    }

    const allResources = await this.resourceRepository.findAll();
    const byType = await this.resourceRepository.getResourceStatsByType();
    const byTopic = await this.resourceRepository.getResourcesByTopic();

    let accessible = 0;
    let typeConsistent = 0;
    let validUrls = 0;

    for (const resource of allResources) {
      if (resource.isAccessible()) accessible++;
      if (resource.isTypeConsistent()) typeConsistent++;
      try {
        new URL(resource.url);
        validUrls++;
      } catch {
        // Invalid URL
      }
    }

    return {
      totalResources: allResources.length,
      byType,
      byTopic: Object.fromEntries(
        Object.entries(byTopic).map(([topicId, resources]) => [topicId, resources.length])
      ),
      accessibilityStats: {
        accessible,
        typeConsistent,
        validUrls
      }
    };
  }

  /**
   * Validate resource accessibility
   */
  public async validateAccessibility(resourceId: string, userId?: string): Promise<{
    isAccessible: boolean;
    isTypeConsistent: boolean;
    hasValidUrl: boolean;
  }> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to validate resources');
      }
    }

    return this.resourceRepository.validateResourceAccessibility(resourceId);
  }

  /**
   * Find duplicate resources
   */
  public async findDuplicates(userId?: string): Promise<Resource[][]> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to find duplicates');
      }
    }

    return this.resourceRepository.findDuplicateResources();
  }

  /**
   * Get recent resources
   */
  public async getRecent(limit: number = 10, userId?: string): Promise<Resource[]> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to view recent resources');
      }
    }

    return this.resourceRepository.getRecentResources(limit);
  }

  /**
   * Bulk operations
   */
  public async bulkCreate(resourcesData: Partial<Resource>[], userId?: string): Promise<{
    created: Resource[];
    failed: Array<{ data: Partial<Resource>; reason: string }>;
  }> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canCreate()) {
        throw new Error('Insufficient permissions to create resources');
      }
    }

    const created: Resource[] = [];
    const failed: Array<{ data: Partial<Resource>; reason: string }> = [];

    for (const resourceData of resourcesData) {
      try {
        const resource = await this.create(resourceData);
        created.push(resource);
      } catch (error) {
        failed.push({
          data: resourceData,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { created, failed };
  }

  /**
   * Bulk delete resources by topic
   */
  public async deleteByTopicId(topicId: string, userId?: string): Promise<number> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canDelete()) {
        throw new Error('Insufficient permissions to delete resources');
      }
    }

    const deletedCount = await this.resourceRepository.deleteByTopicId(topicId);

    if (deletedCount > 0) {
      await this.eventPublisher.publish({
        type: EventType.RESOURCE_DELETED,
        entityType: 'Resource',
        entityId: 'bulk',
        userId,
        timestamp: new Date(),
        data: { 
          action: 'bulk_delete_by_topic',
          topicId,
          deletedCount
        }
      });
    }

    return deletedCount;
  }

  /**
   * Update resource URL with validation
   */
  public async updateUrl(resourceId: string, newUrl: string, userId?: string): Promise<Resource | null> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canUpdate()) {
        throw new Error('Insufficient permissions to update resources');
      }
    }

    return this.resourceRepository.updateResourceUrl(resourceId, newUrl);
  }
}

