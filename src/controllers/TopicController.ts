import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { TopicService } from '../services/TopicService';
import { TopicPathFinder } from '../algorithms/TopicPathFinder';
import { TopicTreeTraversal } from '../algorithms/TopicTreeTraversal';
import { TopicHierarchyAlgorithm } from '../algorithms/TopicHierarchyAlgorithm';
import { TopicSearchAlgorithm } from '../algorithms/TopicSearchAlgorithm';

/**
 * Controller for topic management with version control and hierarchy
 */
export class TopicController extends BaseController {
  private topicService: TopicService;
  private pathFinder: TopicPathFinder;
  private treeTraversal: TopicTreeTraversal;
  private hierarchyAlgorithm: TopicHierarchyAlgorithm;
  private searchAlgorithm: TopicSearchAlgorithm;

  constructor(
    topicService: TopicService,
    pathFinder: TopicPathFinder,
    treeTraversal: TopicTreeTraversal,
    hierarchyAlgorithm: TopicHierarchyAlgorithm,
    searchAlgorithm: TopicSearchAlgorithm
  ) {
    super();
    this.topicService = topicService;
    this.pathFinder = pathFinder;
    this.treeTraversal = treeTraversal;
    this.hierarchyAlgorithm = hierarchyAlgorithm;
    this.searchAlgorithm = searchAlgorithm;
  }

  /**
   * Create a new topic
   * POST /api/topics
   */
  public createTopic = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'CREATE_TOPIC');
    
    const validation = this.validateRequiredFields(req.body, ['name', 'content']);
    if (!validation.isValid) {
      this.sendValidationError(res, validation);
      return;
    }

    const sanitizedData = this.sanitizeInput(req.body);
    const userId = this.getUserId(req);

    try {
      const topic = await this.topicService.create(sanitizedData);
      this.sendSuccess(res, topic, 'Topic created successfully', 201);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get all topics with optional filtering and pagination
   * GET /api/topics
   */
  public getTopics = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_TOPICS');
    
    const userId = this.getUserId(req);
    const pagination = this.getPaginationParams(req);
    const sort = this.getSortParams(req);
    const criteria = this.getSearchCriteria(req, ['name', 'parentId']);

    try {
      const result = await this.topicService.getPaginated(criteria, pagination, sort, userId);
      this.sendSuccess(res, result);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get topic by ID
   * GET /api/topics/:id
   */
  public getTopicById = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_TOPIC_BY_ID');
    
    const { id } = req.params;
    const userId = this.getUserId(req);

    try {
      const topic = await this.topicService.getById(id, userId);
      if (!topic) {
        this.sendNotFound(res, 'Topic');
        return;
      }
      this.sendSuccess(res, topic);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Update topic (creates new version)
   * PUT /api/topics/:id
   */
  public updateTopic = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'UPDATE_TOPIC');
    
    const { id } = req.params;
    const sanitizedData = this.sanitizeInput(req.body);
    const userId = this.getUserId(req);

    try {
      const topic = await this.topicService.update(id, sanitizedData, userId);
      if (!topic) {
        this.sendNotFound(res, 'Topic');
        return;
      }
      this.sendSuccess(res, topic, 'Topic updated successfully (new version created)');
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Delete topic
   * DELETE /api/topics/:id
   */
  public deleteTopic = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'DELETE_TOPIC');
    
    const { id } = req.params;
    const userId = this.getUserId(req);

    try {
      const deleted = await this.topicService.delete(id, userId);
      if (!deleted) {
        this.sendNotFound(res, 'Topic');
        return;
      }
      this.sendSuccess(res, null, 'Topic deleted successfully');
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get topic version history
   * GET /api/topics/:id/versions
   */
  public getVersionHistory = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_VERSION_HISTORY');
    
    const { id } = req.params;
    const userId = this.getUserId(req);

    try {
      const history = await this.topicService.getVersionHistory(id, userId);
      this.sendSuccess(res, history);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get specific version of a topic
   * GET /api/topics/:id/versions/:version
   */
  public getTopicVersion = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_TOPIC_VERSION');
    
    const { id, version } = req.params;
    const userId = this.getUserId(req);
    const versionNumber = parseInt(version);

    if (isNaN(versionNumber)) {
      this.sendError(res, 'Invalid version number', 400);
      return;
    }

    try {
      const topic = await this.topicService.getVersion(id, versionNumber, userId);
      if (!topic) {
        this.sendNotFound(res, 'Topic version');
        return;
      }
      this.sendSuccess(res, topic);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get topic hierarchy
   * GET /api/topics/:id/hierarchy
   */
  public getTopicHierarchy = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_TOPIC_HIERARCHY');
    
    const { id } = req.params;
    const userId = this.getUserId(req);

    try {
      const hierarchy = await this.topicService.getTopicHierarchy(id, userId);
      if (!hierarchy) {
        this.sendNotFound(res, 'Topic');
        return;
      }
      this.sendSuccess(res, hierarchy);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get root topics
   * GET /api/topics/roots
   */
  public getRootTopics = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_ROOT_TOPICS');
    
    const userId = this.getUserId(req);

    try {
      const rootTopics = await this.topicService.getRootTopics(userId);
      this.sendSuccess(res, rootTopics);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get children of a topic
   * GET /api/topics/:id/children
   */
  public getChildren = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_CHILDREN');
    
    const { id } = req.params;
    const userId = this.getUserId(req);

    try {
      const children = await this.topicService.getChildren(id, userId);
      this.sendSuccess(res, children);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Move topic to new parent
   * POST /api/topics/:id/move
   */
  public moveTopic = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'MOVE_TOPIC');
    
    const { id } = req.params;
    const { parentId } = req.body;
    const userId = this.getUserId(req);

    try {
      const topic = await this.topicService.moveToParent(id, parentId, userId);
      if (!topic) {
        this.sendNotFound(res, 'Topic');
        return;
      }
      this.sendSuccess(res, topic, 'Topic moved successfully');
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Search topics
   * GET /api/topics/search
   */
  public searchTopics = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'SEARCH_TOPICS');
    
    const { q: query } = req.query;
    const userId = this.getUserId(req);

    if (!query || typeof query !== 'string') {
      this.sendError(res, 'Search query is required', 400);
      return;
    }

    try {
      const topics = await this.topicService.searchByContent(query, userId);
      const searchResults = await this.searchAlgorithm.searchWithRelevance(query, topics);
      this.sendSuccess(res, searchResults);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Find shortest path between two topics
   * GET /api/topics/:id1/path/:id2
   */
  public findShortestPath = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'FIND_SHORTEST_PATH');
    
    const { id1, id2 } = req.params;

    try {
      const pathResult = await this.pathFinder.getDetailedPath(id1, id2);
      if (!pathResult) {
        this.sendSuccess(res, null, 'No path found between topics');
        return;
      }
      this.sendSuccess(res, pathResult);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get all paths between two topics
   * GET /api/topics/:id1/paths/:id2
   */
  public findAllPaths = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'FIND_ALL_PATHS');
    
    const { id1, id2 } = req.params;

    try {
      const paths = await this.pathFinder.findAllPaths(id1, id2);
      this.sendSuccess(res, {
        paths,
        count: paths.length
      });
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get topic tree traversal
   * GET /api/topics/:id/traverse/:method
   */
  public traverseTree = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'TRAVERSE_TREE');
    
    const { id, method } = req.params;

    try {
      let result;
      switch (method) {
        case 'dfs':
          result = await this.treeTraversal.traverseDepthFirst(id);
          break;
        case 'bfs':
          result = await this.treeTraversal.traverseBreadthFirst(id);
          break;
        case 'preorder':
          result = await this.treeTraversal.traversePreOrder(id);
          break;
        case 'postorder':
          result = await this.treeTraversal.traversePostOrder(id);
          break;
        default:
          this.sendError(res, 'Invalid traversal method. Use: dfs, bfs, preorder, postorder', 400);
          return;
      }

      this.sendSuccess(res, {
        method,
        topics: result,
        count: result.length
      });
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get topic relationship
   * GET /api/topics/:id1/relationship/:id2
   */
  public getRelationship = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_RELATIONSHIP');
    
    const { id1, id2 } = req.params;

    try {
      const relationship = await this.hierarchyAlgorithm.getRelationship(id1, id2);
      this.sendSuccess(res, relationship);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get topic statistics
   * GET /api/topics/statistics
   */
  public getStatistics = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_STATISTICS');
    
    const userId = this.getUserId(req);

    try {
      const statistics = await this.topicService.getStatistics(userId);
      this.sendSuccess(res, statistics);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get hierarchy statistics for a subtree
   * GET /api/topics/:id/hierarchy-stats
   */
  public getHierarchyStatistics = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_HIERARCHY_STATISTICS');
    
    const { id } = req.params;

    try {
      const statistics = await this.hierarchyAlgorithm.getHierarchyStatistics(id);
      this.sendSuccess(res, statistics);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Bulk delete topics
   * DELETE /api/topics/bulk
   */
  public bulkDeleteTopics = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'BULK_DELETE_TOPICS');
    
    const { topicIds } = req.body;
    const userId = this.getUserId(req);

    if (!Array.isArray(topicIds) || topicIds.length === 0) {
      this.sendError(res, 'Topic IDs array is required', 400);
      return;
    }

    try {
      const result = await this.topicService.bulkDelete(topicIds, userId);
      this.sendSuccess(res, result, 'Bulk delete operation completed');
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get topics within distance
   * GET /api/topics/:id/nearby/:distance
   */
  public getTopicsWithinDistance = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_TOPICS_WITHIN_DISTANCE');
    
    const { id, distance } = req.params;
    const maxDistance = parseInt(distance);

    if (isNaN(maxDistance) || maxDistance < 0) {
      this.sendError(res, 'Invalid distance parameter', 400);
      return;
    }

    try {
      const nearbyTopics = await this.pathFinder.findTopicsWithinDistance(id, maxDistance);
      this.sendSuccess(res, {
        centerTopicId: id,
        maxDistance,
        topics: nearbyTopics,
        count: nearbyTopics.length
      });
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });
}

