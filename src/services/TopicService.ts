import { Topic } from '../models/Topic';
import { TopicRepository } from '../repositories/TopicRepository';
import { UserRepository } from '../repositories/UserRepository';
import { IService } from './IService';
import { EventPublisher, EventType } from './EventPublisher';
import { SearchCriteria, PaginationOptions, SortOptions, ValidationResult } from '../types/common';

/**
 * Topic service with version control and hierarchical management
 */
export class TopicService implements IService<Topic> {
  private topicRepository: TopicRepository;
  private userRepository: UserRepository;
  private eventPublisher: EventPublisher;

  constructor(
    topicRepository: TopicRepository,
    userRepository: UserRepository
  ) {
    this.topicRepository = topicRepository;
    this.userRepository = userRepository;
    this.eventPublisher = EventPublisher.getInstance();
  }

  /**
   * Create a new topic
   */
  public async create(data: Partial<Topic>): Promise<Topic> {
    if (!data.name || !data.content) {
      throw new Error('Topic name and content are required');
    }

    // Validate parent topic exists if specified
    if (data.parentId) {
      const parentTopic = await this.topicRepository.findById(data.parentId);
      if (!parentTopic) {
        throw new Error('Parent topic not found');
      }
    }

    const topic = new Topic(
      data.name,
      data.content,
      data.parentId
    );

    const validation = this.validate(topic);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const createdTopic = await this.topicRepository.create(topic);

    // Publish event
    await this.eventPublisher.publish({
      type: EventType.TOPIC_CREATED,
      entityType: 'Topic',
      entityId: createdTopic.id,
      timestamp: new Date(),
      data: { name: createdTopic.name, parentId: createdTopic.parentId }
    });

    return createdTopic;
  }

  /**
   * Get topic by ID with permission checks
   */
  public async getById(id: string, userId?: string): Promise<Topic | null> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to read topics');
      }
    }

    return this.topicRepository.findById(id);
  }

  /**
   * Get all topics
   */
  public async getAll(criteria?: SearchCriteria, userId?: string): Promise<Topic[]> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to read topics');
      }
    }

    return criteria ? 
      this.topicRepository.findBy(criteria) : 
      this.topicRepository.findAll();
  }

  /**
   * Get topics with pagination
   */
  public async getPaginated(
    criteria?: SearchCriteria,
    pagination?: PaginationOptions,
    sort?: SortOptions,
    userId?: string
  ): Promise<{
    data: Topic[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to read topics');
      }
    }

    return this.topicRepository.findWithPagination(criteria, pagination, sort);
  }

  /**
   * Update topic (creates new version)
   */
  public async update(id: string, data: Partial<Topic>, userId?: string): Promise<Topic | null> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canUpdate()) {
        throw new Error('Insufficient permissions to update topics');
      }
    }

    const existingTopic = await this.topicRepository.findById(id);
    if (!existingTopic) {
      return null;
    }

    // Create new version with updated data
    const updatedTopic = existingTopic.createNewVersion(
      data.content || existingTopic.content,
      data.name || existingTopic.name
    );

    // Handle parent change
    if (data.parentId !== undefined && data.parentId !== existingTopic.parentId) {
      if (data.parentId) {
        const parentTopic = await this.topicRepository.findById(data.parentId);
        if (!parentTopic) {
          throw new Error('Parent topic not found');
        }

        // Prevent circular reference
        if (await this.wouldCreateCircularReference(id, data.parentId)) {
          throw new Error('Cannot move topic to its own descendant');
        }
      }
      updatedTopic.parentId = data.parentId;
    }

    const validation = this.validate(updatedTopic);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const newVersion = await this.topicRepository.createNewVersion(id, updatedTopic);

    // Publish events
    await this.eventPublisher.publish({
      type: EventType.TOPIC_UPDATED,
      entityType: 'Topic',
      entityId: id,
      userId,
      timestamp: new Date(),
      data: { 
        oldVersion: existingTopic.version, 
        newVersion: newVersion.version,
        changes: data
      }
    });

    await this.eventPublisher.publish({
      type: EventType.TOPIC_VERSION_CREATED,
      entityType: 'Topic',
      entityId: id,
      userId,
      timestamp: new Date(),
      data: { version: newVersion.version }
    });

    return newVersion;
  }

  /**
   * Delete topic
   */
  public async delete(id: string, userId?: string): Promise<boolean> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canDelete()) {
        throw new Error('Insufficient permissions to delete topics');
      }
    }

    const topic = await this.topicRepository.findById(id);
    if (!topic) {
      return false;
    }

    // Check if topic has children
    if (!(await this.topicRepository.canDelete(id))) {
      throw new Error('Cannot delete topic with children. Delete children first.');
    }

    const deleted = await this.topicRepository.delete(id);

    if (deleted) {
      await this.eventPublisher.publish({
        type: EventType.TOPIC_DELETED,
        entityType: 'Topic',
        entityId: id,
        userId,
        timestamp: new Date(),
        data: { name: topic.name }
      });
    }

    return deleted;
  }

  /**
   * Validate topic data
   */
  public validate(data: Partial<Topic>): ValidationResult {
    const topic = data as Topic;
    return topic.validate ? topic.validate() : { isValid: true, errors: [] };
  }

  /**
   * Get topic version history
   */
  public async getVersionHistory(topicId: string, userId?: string): Promise<any> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || (!user.canViewAllVersions() && !user.canRead())) {
        throw new Error('Insufficient permissions to view version history');
      }
    }

    return this.topicRepository.getVersionHistory(topicId);
  }

  /**
   * Get specific version of a topic
   */
  public async getVersion(topicId: string, version: number, userId?: string): Promise<Topic | null> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || (!user.canViewAllVersions() && !user.canRead())) {
        throw new Error('Insufficient permissions to view topic versions');
      }
    }

    return this.topicRepository.findByVersion(topicId, version);
  }

  /**
   * Get topic hierarchy
   */
  public async getTopicHierarchy(rootTopicId: string, userId?: string): Promise<Topic | null> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to read topics');
      }
    }

    return this.topicRepository.getTopicHierarchy(rootTopicId);
  }

  /**
   * Get all root topics
   */
  public async getRootTopics(userId?: string): Promise<Topic[]> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to read topics');
      }
    }

    return this.topicRepository.findRootTopics();
  }

  /**
   * Get children of a topic
   */
  public async getChildren(parentId: string, userId?: string): Promise<Topic[]> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to read topics');
      }
    }

    return this.topicRepository.findByParentId(parentId);
  }

  /**
   * Move topic to new parent
   */
  public async moveToParent(topicId: string, newParentId?: string, userId?: string): Promise<Topic | null> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canUpdate()) {
        throw new Error('Insufficient permissions to move topics');
      }
    }

    // Prevent circular reference
    if (newParentId && await this.wouldCreateCircularReference(topicId, newParentId)) {
      throw new Error('Cannot move topic to its own descendant');
    }

    const result = await this.topicRepository.moveToParent(topicId, newParentId);

    if (result) {
      await this.eventPublisher.publish({
        type: EventType.TOPIC_UPDATED,
        entityType: 'Topic',
        entityId: topicId,
        userId,
        timestamp: new Date(),
        data: { 
          action: 'moved',
          oldParentId: result.parentId,
          newParentId: newParentId
        }
      });
    }

    return result;
  }

  /**
   * Search topics by content
   */
  public async searchByContent(searchTerm: string, userId?: string): Promise<Topic[]> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to search topics');
      }
    }

    const allTopics = await this.topicRepository.findAll();
    return allTopics.filter(topic => 
      topic.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  /**
   * Get topic statistics
   */
  public async getStatistics(userId?: string): Promise<{
    totalTopics: number;
    rootTopics: number;
    averageDepth: number;
    totalVersions: number;
    topicsByDepth: Record<number, number>;
  }> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canRead()) {
        throw new Error('Insufficient permissions to view statistics');
      }
    }

    const allTopics = await this.topicRepository.findAll();
    const rootTopics = await this.topicRepository.findRootTopics();
    
    let totalVersions = 0;
    let totalDepth = 0;
    const topicsByDepth: Record<number, number> = {};

    for (const topic of allTopics) {
      const versions = await this.topicRepository.getAllVersions(topic.id);
      totalVersions += versions.length;
      
      const depth = topic.getDepth();
      totalDepth += depth;
      topicsByDepth[depth] = (topicsByDepth[depth] || 0) + 1;
    }

    return {
      totalTopics: allTopics.length,
      rootTopics: rootTopics.length,
      averageDepth: allTopics.length > 0 ? totalDepth / allTopics.length : 0,
      totalVersions,
      topicsByDepth
    };
  }

  /**
   * Check if moving a topic would create circular reference
   */
  private async wouldCreateCircularReference(topicId: string, newParentId: string): Promise<boolean> {
    const descendants = await this.topicRepository.getAllDescendants(topicId);
    return descendants.some(descendant => descendant.id === newParentId);
  }

  /**
   * Bulk operations
   */
  public async bulkDelete(topicIds: string[], userId?: string): Promise<{
    deleted: string[];
    failed: Array<{ id: string; reason: string }>;
  }> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canDelete()) {
        throw new Error('Insufficient permissions to delete topics');
      }
    }

    const deleted: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const topicId of topicIds) {
      try {
        const success = await this.delete(topicId, userId);
        if (success) {
          deleted.push(topicId);
        } else {
          failed.push({ id: topicId, reason: 'Topic not found' });
        }
      } catch (error) {
        failed.push({ 
          id: topicId, 
          reason: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return { deleted, failed };
  }
}

