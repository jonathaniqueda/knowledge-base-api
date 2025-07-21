import { Topic } from '../models/Topic';
import { TopicRepository } from '../repositories/TopicRepository';
import { IHierarchyAlgorithm } from './IAlgorithm';

/**
 * Algorithms for managing topic hierarchy and relationships
 */
export class TopicHierarchyAlgorithm implements IHierarchyAlgorithm {
  private topicRepository: TopicRepository;

  constructor(topicRepository: TopicRepository) {
    this.topicRepository = topicRepository;
  }

  /**
   * Get complete topic hierarchy starting from root
   */
  public async getTopicHierarchy(rootTopicId: string): Promise<Topic | null> {
    return this.topicRepository.getTopicHierarchy(rootTopicId);
  }

  /**
   * Get all descendants of a topic
   */
  public async getAllDescendants(topicId: string): Promise<Topic[]> {
    const descendants: Topic[] = [];
    const visited = new Set<string>();
    
    await this.collectDescendants(topicId, descendants, visited);
    return descendants;
  }

  /**
   * Get all ancestors of a topic (path to root)
   */
  public async getAllAncestors(topicId: string): Promise<Topic[]> {
    const ancestors: Topic[] = [];
    let currentTopicId: string | undefined = topicId;

    while (currentTopicId) {
      const topic = await this.topicRepository.findById(currentTopicId);
      if (!topic) {
        break;
      }

      if (topic.parentId) {
        const parent = await this.topicRepository.findById(topic.parentId);
        if (parent) {
          ancestors.push(parent);
          currentTopicId = parent.id;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return ancestors;
  }

  /**
   * Find the lowest common ancestor of two topics
   */
  public async getCommonAncestor(topicId1: string, topicId2: string): Promise<Topic | null> {
    if (topicId1 === topicId2) {
      return this.topicRepository.findById(topicId1);
    }

    const ancestors1 = await this.getAncestorPath(topicId1);
    const ancestors2 = await this.getAncestorPath(topicId2);

    // Find the lowest common ancestor
    for (const ancestor1 of ancestors1) {
      for (const ancestor2 of ancestors2) {
        if (ancestor1.id === ancestor2.id) {
          return ancestor1;
        }
      }
    }

    return null;
  }

  /**
   * Calculate depth of a topic in the hierarchy
   */
  public async calculateDepth(topicId: string): Promise<number> {
    let depth = 0;
    let currentTopicId: string | undefined = topicId;

    while (currentTopicId) {
      const topic = await this.topicRepository.findById(currentTopicId);
      if (!topic || !topic.parentId) {
        break;
      }
      depth++;
      currentTopicId = topic.parentId;
    }

    return depth;
  }

  /**
   * Check if one topic is an ancestor of another
   */
  public async isAncestor(ancestorId: string, descendantId: string): Promise<boolean> {
    if (ancestorId === descendantId) {
      return false; // A topic is not its own ancestor
    }

    const ancestors = await this.getAllAncestors(descendantId);
    return ancestors.some(ancestor => ancestor.id === ancestorId);
  }

  /**
   * Get siblings of a topic (topics with same parent)
   */
  public async getSiblings(topicId: string): Promise<Topic[]> {
    const topic = await this.topicRepository.findById(topicId);
    if (!topic || !topic.parentId) {
      return [];
    }

    const siblings = await this.topicRepository.findByParentId(topic.parentId);
    return siblings.filter(sibling => sibling.id !== topicId);
  }

  /**
   * Get direct children of a topic
   */
  public async getDirectChildren(topicId: string): Promise<Topic[]> {
    return this.topicRepository.findByParentId(topicId);
  }

  /**
   * Get the root topic of a hierarchy
   */
  public async getRootTopic(topicId: string): Promise<Topic | null> {
    let currentTopic = await this.topicRepository.findById(topicId);
    
    while (currentTopic && currentTopic.parentId) {
      const parent = await this.topicRepository.findById(currentTopic.parentId);
      if (parent) {
        currentTopic = parent;
      } else {
        break;
      }
    }

    return currentTopic;
  }

  /**
   * Check if a topic is a leaf (has no children)
   */
  public async isLeaf(topicId: string): Promise<boolean> {
    const children = await this.topicRepository.findByParentId(topicId);
    return children.length === 0;
  }

  /**
   * Check if a topic is a root (has no parent)
   */
  public async isRoot(topicId: string): Promise<boolean> {
    const topic = await this.topicRepository.findById(topicId);
    return topic ? !topic.parentId : false;
  }

  /**
   * Get topic level in hierarchy (0 for root, 1 for first level, etc.)
   */
  public async getTopicLevel(topicId: string): Promise<number> {
    return this.calculateDepth(topicId);
  }

  /**
   * Find all topics at the same level as the given topic
   */
  public async getTopicsAtSameLevel(topicId: string): Promise<Topic[]> {
    const level = await this.getTopicLevel(topicId);
    const rootTopic = await this.getRootTopic(topicId);
    
    if (!rootTopic) {
      return [];
    }

    return this.getTopicsAtLevel(rootTopic.id, level);
  }

  /**
   * Get all topics at a specific level in the hierarchy
   */
  public async getTopicsAtLevel(rootTopicId: string, level: number): Promise<Topic[]> {
    if (level === 0) {
      const rootTopic = await this.topicRepository.findById(rootTopicId);
      return rootTopic ? [rootTopic] : [];
    }

    const result: Topic[] = [];
    await this.collectTopicsAtLevel(rootTopicId, 0, level, result, new Set());
    return result;
  }

  /**
   * Calculate the relationship between two topics
   */
  public async getRelationship(topicId1: string, topicId2: string): Promise<{
    type: 'same' | 'parent-child' | 'child-parent' | 'siblings' | 'cousins' | 'ancestor-descendant' | 'descendant-ancestor' | 'unrelated';
    description: string;
    commonAncestor?: Topic;
    distance: number;
  }> {
    if (topicId1 === topicId2) {
      return {
        type: 'same',
        description: 'Same topic',
        distance: 0
      };
    }

    const topic1 = await this.topicRepository.findById(topicId1);
    const topic2 = await this.topicRepository.findById(topicId2);

    if (!topic1 || !topic2) {
      return {
        type: 'unrelated',
        description: 'One or both topics not found',
        distance: -1
      };
    }

    // Check parent-child relationship
    if (topic1.parentId === topicId2) {
      return {
        type: 'child-parent',
        description: `${topic1.name} is a child of ${topic2.name}`,
        distance: 1
      };
    }

    if (topic2.parentId === topicId1) {
      return {
        type: 'parent-child',
        description: `${topic1.name} is a parent of ${topic2.name}`,
        distance: 1
      };
    }

    // Check siblings
    if (topic1.parentId && topic1.parentId === topic2.parentId) {
      return {
        type: 'siblings',
        description: `${topic1.name} and ${topic2.name} are siblings`,
        distance: 2
      };
    }

    // Check ancestor-descendant relationship
    if (await this.isAncestor(topicId1, topicId2)) {
      const distance = await this.calculateDepth(topicId2) - await this.calculateDepth(topicId1);
      return {
        type: 'ancestor-descendant',
        description: `${topic1.name} is an ancestor of ${topic2.name}`,
        distance
      };
    }

    if (await this.isAncestor(topicId2, topicId1)) {
      const distance = await this.calculateDepth(topicId1) - await this.calculateDepth(topicId2);
      return {
        type: 'descendant-ancestor',
        description: `${topic1.name} is a descendant of ${topic2.name}`,
        distance
      };
    }

    // Check cousins (share common ancestor)
    const commonAncestor = await this.getCommonAncestor(topicId1, topicId2);
    if (commonAncestor) {
      const distance1 = await this.calculateDepth(topicId1) - await this.calculateDepth(commonAncestor.id);
      const distance2 = await this.calculateDepth(topicId2) - await this.calculateDepth(commonAncestor.id);
      
      return {
        type: 'cousins',
        description: `${topic1.name} and ${topic2.name} are cousins (common ancestor: ${commonAncestor.name})`,
        commonAncestor,
        distance: distance1 + distance2
      };
    }

    return {
      type: 'unrelated',
      description: `${topic1.name} and ${topic2.name} are not related in the hierarchy`,
      distance: -1
    };
  }

  /**
   * Get hierarchy statistics for a subtree
   */
  public async getHierarchyStatistics(rootTopicId: string): Promise<{
    totalTopics: number;
    maxDepth: number;
    leafTopics: number;
    branchingFactor: number;
    topicsByLevel: Record<number, number>;
  }> {
    const allDescendants = await this.getAllDescendants(rootTopicId);
    const rootTopic = await this.topicRepository.findById(rootTopicId);
    const allTopics = rootTopic ? [rootTopic, ...allDescendants] : allDescendants;

    let maxDepth = 0;
    let leafCount = 0;
    let totalChildren = 0;
    let parentsWithChildren = 0;
    const topicsByLevel: Record<number, number> = {};

    for (const topic of allTopics) {
      const depth = await this.calculateDepth(topic.id);
      maxDepth = Math.max(maxDepth, depth);
      
      topicsByLevel[depth] = (topicsByLevel[depth] || 0) + 1;

      const children = await this.getDirectChildren(topic.id);
      if (children.length === 0) {
        leafCount++;
      } else {
        totalChildren += children.length;
        parentsWithChildren++;
      }
    }

    const branchingFactor = parentsWithChildren > 0 ? totalChildren / parentsWithChildren : 0;

    return {
      totalTopics: allTopics.length,
      maxDepth,
      leafTopics: leafCount,
      branchingFactor,
      topicsByLevel
    };
  }

  /**
   * Private helper methods
   */

  private async collectDescendants(topicId: string, descendants: Topic[], visited: Set<string>): Promise<void> {
    if (visited.has(topicId)) {
      return;
    }

    visited.add(topicId);
    const children = await this.topicRepository.findByParentId(topicId);

    for (const child of children) {
      descendants.push(child);
      await this.collectDescendants(child.id, descendants, visited);
    }
  }

  private async getAncestorPath(topicId: string): Promise<Topic[]> {
    const path: Topic[] = [];
    let currentTopicId: string | undefined = topicId;

    // Include the topic itself in the path
    const startTopic = await this.topicRepository.findById(topicId);
    if (startTopic) {
      path.push(startTopic);
    }

    // Add all ancestors
    const ancestors = await this.getAllAncestors(topicId);
    path.push(...ancestors);

    return path;
  }

  private async collectTopicsAtLevel(
    topicId: string,
    currentLevel: number,
    targetLevel: number,
    result: Topic[],
    visited: Set<string>
  ): Promise<void> {
    if (visited.has(topicId) || currentLevel > targetLevel) {
      return;
    }

    visited.add(topicId);

    if (currentLevel === targetLevel) {
      const topic = await this.topicRepository.findById(topicId);
      if (topic) {
        result.push(topic);
      }
      return;
    }

    const children = await this.topicRepository.findByParentId(topicId);
    for (const child of children) {
      await this.collectTopicsAtLevel(child.id, currentLevel + 1, targetLevel, result, visited);
    }
  }
}

