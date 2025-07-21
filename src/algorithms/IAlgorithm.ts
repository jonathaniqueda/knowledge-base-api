import { Topic } from '../models/Topic';

/**
 * Interface for path finding algorithms
 */
export interface IPathFinder {
  findShortestPath(startTopicId: string, endTopicId: string): Promise<Topic[] | null>;
  findAllPaths(startTopicId: string, endTopicId: string): Promise<Topic[][]>;
  getPathDistance(startTopicId: string, endTopicId: string): Promise<number>;
}

/**
 * Interface for tree traversal algorithms
 */
export interface ITreeTraversal {
  traverseDepthFirst(rootTopicId: string): Promise<Topic[]>;
  traverseBreadthFirst(rootTopicId: string): Promise<Topic[]>;
  traversePreOrder(rootTopicId: string): Promise<Topic[]>;
  traversePostOrder(rootTopicId: string): Promise<Topic[]>;
}

/**
 * Interface for search algorithms
 */
export interface ISearchAlgorithm {
  search(query: string, topics: Topic[]): Promise<Topic[]>;
  searchWithRelevance(query: string, topics: Topic[]): Promise<Array<{ topic: Topic; relevance: number }>>;
}

/**
 * Interface for hierarchy algorithms
 */
export interface IHierarchyAlgorithm {
  getTopicHierarchy(rootTopicId: string): Promise<Topic | null>;
  getAllDescendants(topicId: string): Promise<Topic[]>;
  getAllAncestors(topicId: string): Promise<Topic[]>;
  getCommonAncestor(topicId1: string, topicId2: string): Promise<Topic | null>;
  calculateDepth(topicId: string): Promise<number>;
  isAncestor(ancestorId: string, descendantId: string): Promise<boolean>;
}

/**
 * Path result interface
 */
export interface PathResult {
  path: Topic[];
  distance: number;
  pathIds: string[];
  pathNames: string[];
}

/**
 * Search result interface
 */
export interface SearchResult {
  topic: Topic;
  relevance: number;
  matchedFields: string[];
  snippet: string;
}

