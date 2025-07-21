import { BaseRepository } from './BaseRepository';
import { Resource } from '../models/Resource';
import { ResourceType } from '../types/common';

/**
 * Resource repository for managing topic resources
 */
export class ResourceRepository extends BaseRepository<Resource> {
  constructor() {
    super('resources.json');
  }

  /**
   * Create entity from JSON data
   */
  protected fromJSON(data: any): Resource {
    return Resource.fromJSON(data);
  }

  /**
   * Find resources by topic ID
   */
  public async findByTopicId(topicId: string): Promise<Resource[]> {
    return this.findBy({ topicId });
  }

  /**
   * Find resources by type
   */
  public async findByType(type: ResourceType): Promise<Resource[]> {
    return this.findBy({ type });
  }

  /**
   * Find resources by topic ID and type
   */
  public async findByTopicIdAndType(topicId: string, type: ResourceType): Promise<Resource[]> {
    return this.findBy({ topicId, type });
  }

  /**
   * Search resources by URL pattern
   */
  public async searchByUrl(urlPattern: string): Promise<Resource[]> {
    const allResources = await this.findAll();
    return allResources.filter(resource => 
      resource.url.toLowerCase().includes(urlPattern.toLowerCase())
    );
  }

  /**
   * Search resources by description
   */
  public async searchByDescription(descriptionPattern: string): Promise<Resource[]> {
    const allResources = await this.findAll();
    return allResources.filter(resource => 
      resource.description.toLowerCase().includes(descriptionPattern.toLowerCase())
    );
  }

  /**
   * Get resource statistics by type
   */
  public async getResourceStatsByType(): Promise<Record<ResourceType, number>> {
    const allResources = await this.findAll();
    const stats: Record<ResourceType, number> = {
      [ResourceType.VIDEO]: 0,
      [ResourceType.ARTICLE]: 0,
      [ResourceType.PDF]: 0,
      [ResourceType.DOCUMENT]: 0,
      [ResourceType.LINK]: 0
    };

    for (const resource of allResources) {
      stats[resource.type]++;
    }

    return stats;
  }

  /**
   * Get resources grouped by topic
   */
  public async getResourcesByTopic(): Promise<Record<string, Resource[]>> {
    const allResources = await this.findAll();
    const groupedResources: Record<string, Resource[]> = {};

    for (const resource of allResources) {
      if (!groupedResources[resource.topicId]) {
        groupedResources[resource.topicId] = [];
      }
      groupedResources[resource.topicId].push(resource);
    }

    return groupedResources;
  }

  /**
   * Validate resource accessibility
   */
  public async validateResourceAccessibility(resourceId: string): Promise<{
    isAccessible: boolean;
    isTypeConsistent: boolean;
    hasValidUrl: boolean;
  }> {
    const resource = await this.findById(resourceId);
    if (!resource) {
      throw new Error(`Resource with ID ${resourceId} not found`);
    }

    return {
      isAccessible: resource.isAccessible(),
      isTypeConsistent: resource.isTypeConsistent(),
      hasValidUrl: this.isValidUrl(resource.url)
    };
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete all resources for a topic
   */
  public async deleteByTopicId(topicId: string): Promise<number> {
    const resources = await this.findByTopicId(topicId);
    const resourceIds = resources.map(resource => resource.id);
    return this.deleteMany(resourceIds);
  }

  /**
   * Update resource URL and validate
   */
  public async updateResourceUrl(resourceId: string, newUrl: string): Promise<Resource | null> {
    const resource = await this.findById(resourceId);
    if (!resource) {
      return null;
    }

    if (!this.isValidUrl(newUrl)) {
      throw new Error('Invalid URL format');
    }

    return this.update(resourceId, { url: newUrl });
  }

  /**
   * Bulk update resources for a topic
   */
  public async bulkUpdateForTopic(
    topicId: string, 
    updates: Partial<Resource>
  ): Promise<Resource[]> {
    const resources = await this.findByTopicId(topicId);
    const updatedResources: Resource[] = [];

    for (const resource of resources) {
      const updated = await this.update(resource.id, updates);
      if (updated) {
        updatedResources.push(updated);
      }
    }

    return updatedResources;
  }

  /**
   * Get resource count by topic
   */
  public async getResourceCountByTopic(topicId: string): Promise<number> {
    return this.count({ topicId });
  }

  /**
   * Find duplicate resources (same URL)
   */
  public async findDuplicateResources(): Promise<Resource[][]> {
    const allResources = await this.findAll();
    const urlMap = new Map<string, Resource[]>();

    // Group resources by URL
    for (const resource of allResources) {
      const url = resource.url.toLowerCase();
      if (!urlMap.has(url)) {
        urlMap.set(url, []);
      }
      urlMap.get(url)!.push(resource);
    }

    // Return only groups with duplicates
    return Array.from(urlMap.values()).filter(group => group.length > 1);
  }

  /**
   * Get recent resources
   */
  public async getRecentResources(limit: number = 10): Promise<Resource[]> {
    const allResources = await this.findAll();
    return allResources
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

