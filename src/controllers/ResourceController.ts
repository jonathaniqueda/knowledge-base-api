import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { ResourceService } from '../services/ResourceService';
import { ResourceType } from '../types/common';

/**
 * Controller for resource management
 */
export class ResourceController extends BaseController {
  private resourceService: ResourceService;

  constructor(resourceService: ResourceService) {
    super();
    this.resourceService = resourceService;
  }

  /**
   * Create a new resource
   * POST /api/resources
   */
  public createResource = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'CREATE_RESOURCE');
    
    const validation = this.validateRequiredFields(req.body, ['topicId', 'url', 'description', 'type']);
    if (!validation.isValid) {
      this.sendValidationError(res, validation);
      return;
    }

    // Validate resource type
    if (!Object.values(ResourceType).includes(req.body.type)) {
      this.sendError(res, 'Invalid resource type', 400);
      return;
    }

    const sanitizedData = this.sanitizeInput(req.body);
    const userId = this.getUserId(req);

    try {
      const resource = await this.resourceService.create(sanitizedData);
      this.sendSuccess(res, resource, 'Resource created successfully', 201);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get all resources with optional filtering and pagination
   * GET /api/resources
   */
  public getResources = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_RESOURCES');
    
    const userId = this.getUserId(req);
    const pagination = this.getPaginationParams(req);
    const sort = this.getSortParams(req);
    const criteria = this.getSearchCriteria(req, ['topicId', 'type', 'description']);

    try {
      const result = await this.resourceService.getPaginated(criteria, pagination, sort, userId);
      this.sendSuccess(res, result);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get resource by ID
   * GET /api/resources/:id
   */
  public getResourceById = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_RESOURCE_BY_ID');
    
    const { id } = req.params;
    const userId = this.getUserId(req);

    try {
      const resource = await this.resourceService.getById(id, userId);
      if (!resource) {
        this.sendNotFound(res, 'Resource');
        return;
      }
      this.sendSuccess(res, resource);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Update resource
   * PUT /api/resources/:id
   */
  public updateResource = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'UPDATE_RESOURCE');
    
    const { id } = req.params;
    const sanitizedData = this.sanitizeInput(req.body);
    const userId = this.getUserId(req);

    // Validate resource type if provided
    if (sanitizedData.type && !Object.values(ResourceType).includes(sanitizedData.type)) {
      this.sendError(res, 'Invalid resource type', 400);
      return;
    }

    try {
      const resource = await this.resourceService.update(id, sanitizedData, userId);
      if (!resource) {
        this.sendNotFound(res, 'Resource');
        return;
      }
      this.sendSuccess(res, resource, 'Resource updated successfully');
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Delete resource
   * DELETE /api/resources/:id
   */
  public deleteResource = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'DELETE_RESOURCE');
    
    const { id } = req.params;
    const userId = this.getUserId(req);

    try {
      const deleted = await this.resourceService.delete(id, userId);
      if (!deleted) {
        this.sendNotFound(res, 'Resource');
        return;
      }
      this.sendSuccess(res, null, 'Resource deleted successfully');
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get resources by topic ID
   * GET /api/resources/topic/:topicId
   */
  public getResourcesByTopic = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_RESOURCES_BY_TOPIC');
    
    const { topicId } = req.params;
    const userId = this.getUserId(req);

    try {
      const resources = await this.resourceService.getByTopicId(topicId, userId);
      this.sendSuccess(res, resources);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get resources by type
   * GET /api/resources/type/:type
   */
  public getResourcesByType = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_RESOURCES_BY_TYPE');
    
    const { type } = req.params;
    const userId = this.getUserId(req);

    // Validate resource type
    if (!Object.values(ResourceType).includes(type as ResourceType)) {
      this.sendError(res, 'Invalid resource type', 400);
      return;
    }

    try {
      const resources = await this.resourceService.getByType(type as ResourceType, userId);
      this.sendSuccess(res, resources);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Search resources by URL
   * GET /api/resources/search/url
   */
  public searchResourcesByUrl = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'SEARCH_RESOURCES_BY_URL');
    
    const { q: query } = req.query;
    const userId = this.getUserId(req);

    if (!query || typeof query !== 'string') {
      this.sendError(res, 'Search query is required', 400);
      return;
    }

    try {
      const resources = await this.resourceService.searchByUrl(query, userId);
      this.sendSuccess(res, resources);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Search resources by description
   * GET /api/resources/search/description
   */
  public searchResourcesByDescription = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'SEARCH_RESOURCES_BY_DESCRIPTION');
    
    const { q: query } = req.query;
    const userId = this.getUserId(req);

    if (!query || typeof query !== 'string') {
      this.sendError(res, 'Search query is required', 400);
      return;
    }

    try {
      const resources = await this.resourceService.searchByDescription(query, userId);
      this.sendSuccess(res, resources);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get resource statistics
   * GET /api/resources/statistics
   */
  public getStatistics = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_RESOURCE_STATISTICS');
    
    const userId = this.getUserId(req);

    try {
      const statistics = await this.resourceService.getStatistics(userId);
      this.sendSuccess(res, statistics);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Validate resource accessibility
   * GET /api/resources/:id/validate
   */
  public validateAccessibility = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'VALIDATE_RESOURCE_ACCESSIBILITY');
    
    const { id } = req.params;
    const userId = this.getUserId(req);

    try {
      const validation = await this.resourceService.validateAccessibility(id, userId);
      this.sendSuccess(res, validation);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Find duplicate resources
   * GET /api/resources/duplicates
   */
  public findDuplicates = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'FIND_DUPLICATE_RESOURCES');
    
    const userId = this.getUserId(req);

    try {
      const duplicates = await this.resourceService.findDuplicates(userId);
      this.sendSuccess(res, {
        duplicateGroups: duplicates,
        totalGroups: duplicates.length,
        totalDuplicates: duplicates.reduce((sum, group) => sum + group.length, 0)
      });
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get recent resources
   * GET /api/resources/recent
   */
  public getRecentResources = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_RECENT_RESOURCES');
    
    const userId = this.getUserId(req);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

    try {
      const resources = await this.resourceService.getRecent(limit, userId);
      this.sendSuccess(res, resources);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Bulk create resources
   * POST /api/resources/bulk
   */
  public bulkCreateResources = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'BULK_CREATE_RESOURCES');
    
    const { resources } = req.body;
    const userId = this.getUserId(req);

    if (!Array.isArray(resources) || resources.length === 0) {
      this.sendError(res, 'Resources array is required', 400);
      return;
    }

    // Validate each resource
    for (const resource of resources) {
      const validation = this.validateRequiredFields(resource, ['topicId', 'url', 'description', 'type']);
      if (!validation.isValid) {
        this.sendError(res, `Invalid resource data: ${validation.errors.join(', ')}`, 400);
        return;
      }

      if (!Object.values(ResourceType).includes(resource.type)) {
        this.sendError(res, `Invalid resource type: ${resource.type}`, 400);
        return;
      }
    }

    try {
      const result = await this.resourceService.bulkCreate(resources, userId);
      this.sendSuccess(res, result, 'Bulk create operation completed');
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Delete all resources for a topic
   * DELETE /api/resources/topic/:topicId
   */
  public deleteResourcesByTopic = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'DELETE_RESOURCES_BY_TOPIC');
    
    const { topicId } = req.params;
    const userId = this.getUserId(req);

    try {
      const deletedCount = await this.resourceService.deleteByTopicId(topicId, userId);
      this.sendSuccess(res, { deletedCount }, `${deletedCount} resources deleted successfully`);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Update resource URL
   * PATCH /api/resources/:id/url
   */
  public updateResourceUrl = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'UPDATE_RESOURCE_URL');
    
    const { id } = req.params;
    const { url } = req.body;
    const userId = this.getUserId(req);

    if (!url || typeof url !== 'string') {
      this.sendError(res, 'URL is required', 400);
      return;
    }

    try {
      const resource = await this.resourceService.updateUrl(id, url, userId);
      if (!resource) {
        this.sendNotFound(res, 'Resource');
        return;
      }
      this.sendSuccess(res, resource, 'Resource URL updated successfully');
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get available resource types
   * GET /api/resources/types
   */
  public getResourceTypes = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_RESOURCE_TYPES');
    
    const types = Object.values(ResourceType).map(type => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1)
    }));

    this.sendSuccess(res, types);
  });
}

