import { Topic } from '../models/Topic';
import { TopicRepository } from '../repositories/TopicRepository';
import { IPathFinder, PathResult } from './IAlgorithm';

/**
 * Custom implementation of shortest path algorithm for topic hierarchy
 * Written from scratch without using common graph traversal libraries
 */
export class TopicPathFinder implements IPathFinder {
  private topicRepository: TopicRepository;

  constructor(topicRepository: TopicRepository) {
    this.topicRepository = topicRepository;
  }

  /**
   * Find shortest path between two topics using custom Dijkstra-like algorithm
   */
  public async findShortestPath(startTopicId: string, endTopicId: string): Promise<Topic[] | null> {
    if (startTopicId === endTopicId) {
      const topic = await this.topicRepository.findById(startTopicId);
      return topic ? [topic] : null;
    }

    // Build adjacency graph
    const graph = await this.buildTopicGraph();
    
    if (!graph.has(startTopicId) || !graph.has(endTopicId)) {
      return null;
    }

    // Custom shortest path algorithm implementation
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    // Initialize distances
    for (const topicId of graph.keys()) {
      distances.set(topicId, topicId === startTopicId ? 0 : Infinity);
      previous.set(topicId, null);
      unvisited.add(topicId);
    }

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentNode: string | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        const distance = distances.get(nodeId) || Infinity;
        if (distance < minDistance) {
          minDistance = distance;
          currentNode = nodeId;
        }
      }

      if (currentNode === null || minDistance === Infinity) {
        break; // No path exists
      }

      unvisited.delete(currentNode);

      // If we reached the target, we can stop
      if (currentNode === endTopicId) {
        break;
      }

      // Update distances to neighbors
      const neighbors = graph.get(currentNode) || [];
      const currentDistance = distances.get(currentNode) || 0;

      for (const neighborId of neighbors) {
        if (!unvisited.has(neighborId)) {
          continue;
        }

        const newDistance = currentDistance + 1; // Each edge has weight 1
        const existingDistance = distances.get(neighborId) || Infinity;

        if (newDistance < existingDistance) {
          distances.set(neighborId, newDistance);
          previous.set(neighborId, currentNode);
        }
      }
    }

    // Reconstruct path
    const path: string[] = [];
    let currentNode: string | null = endTopicId;

    while (currentNode !== null) {
      path.unshift(currentNode);
      currentNode = previous.get(currentNode) || null;
    }

    // If path doesn't start with startTopicId, no path exists
    if (path.length === 0 || path[0] !== startTopicId) {
      return null;
    }

    // Convert topic IDs to Topic objects
    const topicPath: Topic[] = [];
    for (const topicId of path) {
      const topic = await this.topicRepository.findById(topicId);
      if (topic) {
        topicPath.push(topic);
      }
    }

    return topicPath.length === path.length ? topicPath : null;
  }

  /**
   * Find all possible paths between two topics (using DFS)
   */
  public async findAllPaths(startTopicId: string, endTopicId: string): Promise<Topic[][]> {
    if (startTopicId === endTopicId) {
      const topic = await this.topicRepository.findById(startTopicId);
      return topic ? [[topic]] : [];
    }

    const graph = await this.buildTopicGraph();
    const allPaths: string[][] = [];
    const visited = new Set<string>();

    await this.dfsAllPaths(graph, startTopicId, endTopicId, [startTopicId], visited, allPaths);

    // Convert paths to Topic objects
    const topicPaths: Topic[][] = [];
    for (const path of allPaths) {
      const topicPath: Topic[] = [];
      for (const topicId of path) {
        const topic = await this.topicRepository.findById(topicId);
        if (topic) {
          topicPath.push(topic);
        }
      }
      if (topicPath.length === path.length) {
        topicPaths.push(topicPath);
      }
    }

    return topicPaths;
  }

  /**
   * Get distance between two topics
   */
  public async getPathDistance(startTopicId: string, endTopicId: string): Promise<number> {
    const path = await this.findShortestPath(startTopicId, endTopicId);
    return path ? path.length - 1 : -1; // -1 indicates no path
  }

  /**
   * Get detailed path result with additional information
   */
  public async getDetailedPath(startTopicId: string, endTopicId: string): Promise<PathResult | null> {
    const path = await this.findShortestPath(startTopicId, endTopicId);
    
    if (!path) {
      return null;
    }

    return {
      path,
      distance: path.length - 1,
      pathIds: path.map(topic => topic.id),
      pathNames: path.map(topic => topic.name)
    };
  }

  /**
   * Find shortest path with path type information
   */
  public async findShortestPathWithType(startTopicId: string, endTopicId: string): Promise<{
    path: Topic[] | null;
    pathType: 'direct' | 'parent-child' | 'sibling' | 'cousin' | 'distant';
    relationshipDescription: string;
  }> {
    const path = await this.findShortestPath(startTopicId, endTopicId);
    
    if (!path || path.length < 2) {
      return {
        path,
        pathType: 'direct',
        relationshipDescription: path ? 'Same topic' : 'No path found'
      };
    }

    const pathType = await this.determinePathType(startTopicId, endTopicId, path);
    const relationshipDescription = this.getRelationshipDescription(pathType, path.length - 1);

    return {
      path,
      pathType,
      relationshipDescription
    };
  }

  /**
   * Build adjacency graph from topic hierarchy
   */
  private async buildTopicGraph(): Promise<Map<string, string[]>> {
    const graph = new Map<string, string[]>();
    const allTopics = await this.topicRepository.findAll();

    // Initialize graph with all topics
    for (const topic of allTopics) {
      graph.set(topic.id, []);
    }

    // Add edges (bidirectional for parent-child relationships)
    for (const topic of allTopics) {
      const neighbors = graph.get(topic.id) || [];

      // Add parent as neighbor
      if (topic.parentId) {
        neighbors.push(topic.parentId);
        
        // Add this topic as neighbor to parent
        const parentNeighbors = graph.get(topic.parentId) || [];
        if (!parentNeighbors.includes(topic.id)) {
          parentNeighbors.push(topic.id);
          graph.set(topic.parentId, parentNeighbors);
        }
      }

      // Add children as neighbors
      const children = await this.topicRepository.findByParentId(topic.id);
      for (const child of children) {
        if (!neighbors.includes(child.id)) {
          neighbors.push(child.id);
        }
      }

      graph.set(topic.id, neighbors);
    }

    return graph;
  }

  /**
   * Depth-first search to find all paths
   */
  private async dfsAllPaths(
    graph: Map<string, string[]>,
    current: string,
    target: string,
    currentPath: string[],
    visited: Set<string>,
    allPaths: string[][]
  ): Promise<void> {
    if (current === target) {
      allPaths.push([...currentPath]);
      return;
    }

    visited.add(current);

    const neighbors = graph.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        currentPath.push(neighbor);
        await this.dfsAllPaths(graph, neighbor, target, currentPath, visited, allPaths);
        currentPath.pop();
      }
    }

    visited.delete(current);
  }

  /**
   * Determine the type of relationship between two topics
   */
  private async determinePathType(
    startTopicId: string,
    endTopicId: string,
    path: Topic[]
  ): Promise<'direct' | 'parent-child' | 'sibling' | 'cousin' | 'distant'> {
    if (path.length === 2) {
      // Direct connection - check if parent-child
      const startTopic = path[0];
      const endTopic = path[1];
      
      if (startTopic.parentId === endTopic.id || endTopic.parentId === startTopic.id) {
        return 'parent-child';
      }
      
      // Check if siblings (same parent)
      if (startTopic.parentId && startTopic.parentId === endTopic.parentId) {
        return 'sibling';
      }
    }

    if (path.length === 3) {
      // Could be cousins (share grandparent) or other relationship
      const startTopic = path[0];
      const endTopic = path[2];
      
      // Check if they share a grandparent
      if (startTopic.parentId && endTopic.parentId) {
        const startParent = await this.topicRepository.findById(startTopic.parentId);
        const endParent = await this.topicRepository.findById(endTopic.parentId);
        
        if (startParent && endParent && startParent.parentId === endParent.parentId) {
          return 'cousin';
        }
      }
    }

    return 'distant';
  }

  /**
   * Get human-readable relationship description
   */
  private getRelationshipDescription(pathType: string, distance: number): string {
    switch (pathType) {
      case 'direct':
        return 'Same topic';
      case 'parent-child':
        return 'Direct parent-child relationship';
      case 'sibling':
        return 'Sibling topics (same parent)';
      case 'cousin':
        return 'Cousin topics (same grandparent)';
      case 'distant':
        return `Distant relationship (${distance} steps apart)`;
      default:
        return `${distance} steps apart`;
    }
  }

  /**
   * Find topics within a certain distance
   */
  public async findTopicsWithinDistance(centerTopicId: string, maxDistance: number): Promise<{
    topic: Topic;
    distance: number;
  }[]> {
    const graph = await this.buildTopicGraph();
    const distances = new Map<string, number>();
    const queue: Array<{ topicId: string; distance: number }> = [];

    distances.set(centerTopicId, 0);
    queue.push({ topicId: centerTopicId, distance: 0 });

    const results: { topic: Topic; distance: number }[] = [];

    while (queue.length > 0) {
      const { topicId, distance } = queue.shift()!;

      if (distance > maxDistance) {
        continue;
      }

      const topic = await this.topicRepository.findById(topicId);
      if (topic) {
        results.push({ topic, distance });
      }

      const neighbors = graph.get(topicId) || [];
      for (const neighborId of neighbors) {
        if (!distances.has(neighborId)) {
          distances.set(neighborId, distance + 1);
          queue.push({ topicId: neighborId, distance: distance + 1 });
        }
      }
    }

    return results.sort((a, b) => a.distance - b.distance);
  }
}

