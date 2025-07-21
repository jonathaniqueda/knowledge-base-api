import { Topic } from '../models/Topic';
import { TopicRepository } from '../repositories/TopicRepository';
import { ITreeTraversal } from './IAlgorithm';

/**
 * Tree traversal algorithms for topic hierarchy
 */
export class TopicTreeTraversal implements ITreeTraversal {
  private topicRepository: TopicRepository;

  constructor(topicRepository: TopicRepository) {
    this.topicRepository = topicRepository;
  }

  /**
   * Depth-first traversal (recursive)
   */
  public async traverseDepthFirst(rootTopicId: string): Promise<Topic[]> {
    const result: Topic[] = [];
    const visited = new Set<string>();
    
    await this.dfsRecursive(rootTopicId, result, visited);
    return result;
  }

  /**
   * Breadth-first traversal (iterative)
   */
  public async traverseBreadthFirst(rootTopicId: string): Promise<Topic[]> {
    const result: Topic[] = [];
    const queue: string[] = [rootTopicId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentTopicId = queue.shift()!;
      
      if (visited.has(currentTopicId)) {
        continue;
      }

      visited.add(currentTopicId);
      const topic = await this.topicRepository.findById(currentTopicId);
      
      if (topic) {
        result.push(topic);
        
        // Add children to queue
        const children = await this.topicRepository.findByParentId(currentTopicId);
        for (const child of children) {
          if (!visited.has(child.id)) {
            queue.push(child.id);
          }
        }
      }
    }

    return result;
  }

  /**
   * Pre-order traversal (root -> left -> right)
   */
  public async traversePreOrder(rootTopicId: string): Promise<Topic[]> {
    const result: Topic[] = [];
    const visited = new Set<string>();
    
    await this.preOrderRecursive(rootTopicId, result, visited);
    return result;
  }

  /**
   * Post-order traversal (left -> right -> root)
   */
  public async traversePostOrder(rootTopicId: string): Promise<Topic[]> {
    const result: Topic[] = [];
    const visited = new Set<string>();
    
    await this.postOrderRecursive(rootTopicId, result, visited);
    return result;
  }

  /**
   * Get complete topic hierarchy as nested structure
   */
  public async getCompleteHierarchy(rootTopicId: string): Promise<TopicHierarchyNode | null> {
    const rootTopic = await this.topicRepository.findById(rootTopicId);
    if (!rootTopic) {
      return null;
    }

    return this.buildHierarchyNode(rootTopic);
  }

  /**
   * Get all subtopics recursively with depth information
   */
  public async getSubtopicsWithDepth(rootTopicId: string): Promise<Array<{
    topic: Topic;
    depth: number;
    path: string[];
  }>> {
    const result: Array<{ topic: Topic; depth: number; path: string[] }> = [];
    const visited = new Set<string>();
    
    await this.collectSubtopicsWithDepth(rootTopicId, 0, [], result, visited);
    return result;
  }

  /**
   * Find leaf topics (topics with no children)
   */
  public async findLeafTopics(rootTopicId: string): Promise<Topic[]> {
    const allSubtopics = await this.traverseDepthFirst(rootTopicId);
    const leafTopics: Topic[] = [];

    for (const topic of allSubtopics) {
      const children = await this.topicRepository.findByParentId(topic.id);
      if (children.length === 0) {
        leafTopics.push(topic);
      }
    }

    return leafTopics;
  }

  /**
   * Get topics at specific depth level
   */
  public async getTopicsAtDepth(rootTopicId: string, targetDepth: number): Promise<Topic[]> {
    const result: Topic[] = [];
    const visited = new Set<string>();
    
    await this.collectTopicsAtDepth(rootTopicId, 0, targetDepth, result, visited);
    return result;
  }

  /**
   * Calculate maximum depth of the tree
   */
  public async calculateMaxDepth(rootTopicId: string): Promise<number> {
    const visited = new Set<string>();
    return this.calculateDepthRecursive(rootTopicId, visited);
  }

  /**
   * Get tree statistics
   */
  public async getTreeStatistics(rootTopicId: string): Promise<{
    totalNodes: number;
    maxDepth: number;
    leafNodes: number;
    averageDepth: number;
    nodesByDepth: Record<number, number>;
  }> {
    const allNodes = await this.getSubtopicsWithDepth(rootTopicId);
    const leafNodes = await this.findLeafTopics(rootTopicId);
    const maxDepth = await this.calculateMaxDepth(rootTopicId);
    
    const nodesByDepth: Record<number, number> = {};
    let totalDepth = 0;

    for (const { depth } of allNodes) {
      nodesByDepth[depth] = (nodesByDepth[depth] || 0) + 1;
      totalDepth += depth;
    }

    return {
      totalNodes: allNodes.length,
      maxDepth,
      leafNodes: leafNodes.length,
      averageDepth: allNodes.length > 0 ? totalDepth / allNodes.length : 0,
      nodesByDepth
    };
  }

  /**
   * Find path from root to specific topic
   */
  public async findPathToTopic(rootTopicId: string, targetTopicId: string): Promise<Topic[] | null> {
    const path: Topic[] = [];
    const visited = new Set<string>();
    
    const found = await this.findPathRecursive(rootTopicId, targetTopicId, path, visited);
    return found ? path : null;
  }

  /**
   * Private helper methods
   */

  private async dfsRecursive(topicId: string, result: Topic[], visited: Set<string>): Promise<void> {
    if (visited.has(topicId)) {
      return;
    }

    visited.add(topicId);
    const topic = await this.topicRepository.findById(topicId);
    
    if (topic) {
      result.push(topic);
      
      const children = await this.topicRepository.findByParentId(topicId);
      for (const child of children) {
        await this.dfsRecursive(child.id, result, visited);
      }
    }
  }

  private async preOrderRecursive(topicId: string, result: Topic[], visited: Set<string>): Promise<void> {
    if (visited.has(topicId)) {
      return;
    }

    visited.add(topicId);
    const topic = await this.topicRepository.findById(topicId);
    
    if (topic) {
      // Visit root first
      result.push(topic);
      
      // Then visit children
      const children = await this.topicRepository.findByParentId(topicId);
      for (const child of children) {
        await this.preOrderRecursive(child.id, result, visited);
      }
    }
  }

  private async postOrderRecursive(topicId: string, result: Topic[], visited: Set<string>): Promise<void> {
    if (visited.has(topicId)) {
      return;
    }

    visited.add(topicId);
    const topic = await this.topicRepository.findById(topicId);
    
    if (topic) {
      // Visit children first
      const children = await this.topicRepository.findByParentId(topicId);
      for (const child of children) {
        await this.postOrderRecursive(child.id, result, visited);
      }
      
      // Then visit root
      result.push(topic);
    }
  }

  private async buildHierarchyNode(topic: Topic): Promise<TopicHierarchyNode> {
    const children = await this.topicRepository.findByParentId(topic.id);
    const childNodes: TopicHierarchyNode[] = [];

    for (const child of children) {
      const childNode = await this.buildHierarchyNode(child);
      childNodes.push(childNode);
    }

    return {
      topic,
      children: childNodes,
      depth: await this.calculateDepthRecursive(topic.id, new Set()),
      isLeaf: children.length === 0
    };
  }

  private async collectSubtopicsWithDepth(
    topicId: string,
    currentDepth: number,
    currentPath: string[],
    result: Array<{ topic: Topic; depth: number; path: string[] }>,
    visited: Set<string>
  ): Promise<void> {
    if (visited.has(topicId)) {
      return;
    }

    visited.add(topicId);
    const topic = await this.topicRepository.findById(topicId);
    
    if (topic) {
      const path = [...currentPath, topic.name];
      result.push({ topic, depth: currentDepth, path });
      
      const children = await this.topicRepository.findByParentId(topicId);
      for (const child of children) {
        await this.collectSubtopicsWithDepth(child.id, currentDepth + 1, path, result, visited);
      }
    }
  }

  private async collectTopicsAtDepth(
    topicId: string,
    currentDepth: number,
    targetDepth: number,
    result: Topic[],
    visited: Set<string>
  ): Promise<void> {
    if (visited.has(topicId) || currentDepth > targetDepth) {
      return;
    }

    visited.add(topicId);
    const topic = await this.topicRepository.findById(topicId);
    
    if (topic) {
      if (currentDepth === targetDepth) {
        result.push(topic);
      } else {
        const children = await this.topicRepository.findByParentId(topicId);
        for (const child of children) {
          await this.collectTopicsAtDepth(child.id, currentDepth + 1, targetDepth, result, visited);
        }
      }
    }
  }

  private async calculateDepthRecursive(topicId: string, visited: Set<string>): Promise<number> {
    if (visited.has(topicId)) {
      return 0;
    }

    visited.add(topicId);
    const children = await this.topicRepository.findByParentId(topicId);
    
    if (children.length === 0) {
      return 0;
    }

    let maxChildDepth = 0;
    for (const child of children) {
      const childDepth = await this.calculateDepthRecursive(child.id, visited);
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    }

    return maxChildDepth + 1;
  }

  private async findPathRecursive(
    currentTopicId: string,
    targetTopicId: string,
    path: Topic[],
    visited: Set<string>
  ): Promise<boolean> {
    if (visited.has(currentTopicId)) {
      return false;
    }

    visited.add(currentTopicId);
    const topic = await this.topicRepository.findById(currentTopicId);
    
    if (!topic) {
      return false;
    }

    path.push(topic);

    if (currentTopicId === targetTopicId) {
      return true;
    }

    const children = await this.topicRepository.findByParentId(currentTopicId);
    for (const child of children) {
      if (await this.findPathRecursive(child.id, targetTopicId, path, visited)) {
        return true;
      }
    }

    path.pop();
    return false;
  }
}

/**
 * Interface for topic hierarchy node
 */
export interface TopicHierarchyNode {
  topic: Topic;
  children: TopicHierarchyNode[];
  depth: number;
  isLeaf: boolean;
}

