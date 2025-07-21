import { BaseRepository } from './BaseRepository';
import { Topic } from '../models/Topic';

/**
 * Topic repository with version control capabilities
 */
export class TopicRepository extends BaseRepository<Topic> {
  private versionData: Map<string, Map<number, Topic>>;

  constructor() {
    super('topics.json');
    this.versionData = new Map();
  }

  /**
   * Create entity from JSON data
   */
  protected fromJSON(data: any): Topic {
    return Topic.fromJSON(data);
  }

  /**
   * Create a new topic or new version of existing topic
   */
  public override async create(topic: Topic): Promise<Topic> {
    // Check if this is a new version of an existing topic
    if (await this.exists(topic.id)) {
      return this.createNewVersion(topic.id, topic);
    }

    // Store version information
    const versionMap = new Map<number, Topic>();
    versionMap.set(topic.version, topic);
    this.versionData.set(topic.id, versionMap);

    return super.create(topic);
  }

  /**
   * Create a new version of an existing topic
   */
  public async createNewVersion(topicId: string, updatedTopic: Topic): Promise<Topic> {
    const existingTopic = await this.findById(topicId);
    if (!existingTopic) {
      throw new Error(`Topic with ID ${topicId} not found`);
    }

    // Create new version
    const newVersion = existingTopic.createNewVersion(
      updatedTopic.content,
      updatedTopic.name
    );

    // Store in version history
    let versionMap = this.versionData.get(topicId);
    if (!versionMap) {
      versionMap = new Map();
      this.versionData.set(topicId, versionMap);
    }
    versionMap.set(newVersion.version, newVersion);

    // Update main data with latest version
    this.data.set(topicId, newVersion);
    await this.save();

    return newVersion;
  }

  /**
   * Get a specific version of a topic
   */
  public async findByVersion(topicId: string, version: number): Promise<Topic | null> {
    const versionMap = this.versionData.get(topicId);
    if (!versionMap) {
      return null;
    }

    return versionMap.get(version) || null;
  }

  /**
   * Get all versions of a topic
   */
  public async getAllVersions(topicId: string): Promise<Topic[]> {
    const versionMap = this.versionData.get(topicId);
    if (!versionMap) {
      return [];
    }

    return Array.from(versionMap.values()).sort((a, b) => b.version - a.version);
  }

  /**
   * Get version history for a topic
   */
  public async getVersionHistory(topicId: string): Promise<{
    topicId: string;
    versions: Array<{
      version: number;
      createdAt: Date;
      updatedAt: Date;
      name: string;
      contentLength: number;
    }>;
  }> {
    const versions = await this.getAllVersions(topicId);
    
    return {
      topicId,
      versions: versions.map(topic => ({
        version: topic.version,
        createdAt: topic.createdAt,
        updatedAt: topic.updatedAt,
        name: topic.name,
        contentLength: topic.content.length
      }))
    };
  }

  /**
   * Find topics by parent ID
   */
  public async findByParentId(parentId: string): Promise<Topic[]> {
    return this.findBy({ parentId });
  }

  /**
   * Find root topics (topics without parent)
   */
  public async findRootTopics(): Promise<Topic[]> {
    const allTopics = await this.findAll();
    return allTopics.filter(topic => !topic.parentId);
  }

  /**
   * Get topic hierarchy starting from a root topic
   */
  public async getTopicHierarchy(rootTopicId: string): Promise<Topic | null> {
    const rootTopic = await this.findById(rootTopicId);
    if (!rootTopic) {
      return null;
    }

    await this.loadChildrenRecursively(rootTopic);
    return rootTopic;
  }

  /**
   * Load children recursively for a topic
   */
  private async loadChildrenRecursively(topic: Topic): Promise<void> {
    const children = await this.findByParentId(topic.id);
    
    for (const child of children) {
      topic.addChild(child);
      await this.loadChildrenRecursively(child);
    }
  }

  /**
   * Get all descendants of a topic
   */
  public async getAllDescendants(topicId: string): Promise<Topic[]> {
    const topic = await this.getTopicHierarchy(topicId);
    if (!topic) {
      return [];
    }

    return topic.getAllDescendants();
  }

  /**
   * Check if topic can be deleted (no children)
   */
  public async canDelete(topicId: string): Promise<boolean> {
    const children = await this.findByParentId(topicId);
    return children.length === 0;
  }

  /**
   * Delete topic and all its versions
   */
  public override async delete(id: string): Promise<boolean> {
    // Check if topic can be deleted
    if (!(await this.canDelete(id))) {
      throw new Error('Cannot delete topic with children. Delete children first.');
    }

    // Delete version history
    this.versionData.delete(id);

    return super.delete(id);
  }

  /**
   * Move topic to new parent
   */
  public async moveToParent(topicId: string, newParentId?: string): Promise<Topic | null> {
    const topic = await this.findById(topicId);
    if (!topic) {
      return null;
    }

    // Validate new parent exists if provided
    if (newParentId && !(await this.exists(newParentId))) {
      throw new Error(`Parent topic with ID ${newParentId} not found`);
    }

    // Prevent circular reference
    if (newParentId) {
      const descendants = await this.getAllDescendants(topicId);
      if (descendants.some(desc => desc.id === newParentId)) {
        throw new Error('Cannot move topic to its own descendant');
      }
    }

    topic.parentId = newParentId;
    return this.update(topicId, { parentId: newParentId });
  }

  /**
   * Save with version history
   */
  public override async save(): Promise<void> {
    await super.save();
    
    // Save version history
    const versionHistoryPath = this.filePath.replace('.json', '_versions.json');
    try {
      const versionData: any = {};
      
      for (const [topicId, versionMap] of this.versionData.entries()) {
        versionData[topicId] = {};
        for (const [version, topic] of versionMap.entries()) {
          versionData[topicId][version] = topic.toJSON();
        }
      }
      
      const fs = await import('fs/promises');
      await fs.writeFile(versionHistoryPath, JSON.stringify(versionData, null, 2));
    } catch (error) {
      console.error('Failed to save version history:', error);
    }
  }

  /**
   * Load with version history
   */
  public override async load(): Promise<void> {
    await super.load();
    
    // Load version history
    const versionHistoryPath = this.filePath.replace('.json', '_versions.json');
    try {
      const fs = await import('fs/promises');
      await fs.access(versionHistoryPath);
      const fileContent = await fs.readFile(versionHistoryPath, 'utf-8');
      const versionData = JSON.parse(fileContent);
      
      this.versionData.clear();
      
      for (const [topicId, versions] of Object.entries(versionData)) {
        const versionMap = new Map<number, Topic>();
        
        for (const [version, topicData] of Object.entries(versions as any)) {
          const topic = this.fromJSON(topicData);
          versionMap.set(parseInt(version), topic);
        }
        
        this.versionData.set(topicId, versionMap);
      }
    } catch (error) {
      // Version history file doesn't exist, start fresh
      this.versionData.clear();
    }
  }
}

