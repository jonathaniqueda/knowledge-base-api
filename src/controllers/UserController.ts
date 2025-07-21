import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { UserService } from '../services/UserService';
import { UserRole } from '../types/common';

/**
 * Controller for user management and authentication
 */
export class UserController extends BaseController {
  private userService: UserService;

  constructor(userService: UserService) {
    super();
    this.userService = userService;
  }

  /**
   * Create a new user
   * POST /api/users
   */
  public createUser = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'CREATE_USER');
    
    const validation = this.validateRequiredFields(req.body, ['name', 'email', 'role']);
    if (!validation.isValid) {
      this.sendValidationError(res, validation);
      return;
    }

    // Validate user role
    if (!Object.values(UserRole).includes(req.body.role)) {
      this.sendError(res, 'Invalid user role', 400);
      return;
    }

    const sanitizedData = this.sanitizeInput(req.body);

    try {
      const user = await this.userService.create(sanitizedData);
      this.sendSuccess(res, user, 'User created successfully', 201);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get all users with optional filtering and pagination
   * GET /api/users
   */
  public getUsers = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_USERS');
    
    const userId = this.getUserId(req);
    const pagination = this.getPaginationParams(req);
    const sort = this.getSortParams(req);
    const criteria = this.getSearchCriteria(req, ['name', 'email', 'role']);

    try {
      const result = await this.userService.getPaginated(criteria, pagination, sort, userId);
      this.sendSuccess(res, result);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get user by ID
   * GET /api/users/:id
   */
  public getUserById = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_USER_BY_ID');
    
    const { id } = req.params;
    const userId = this.getUserId(req);

    try {
      const user = await this.userService.getById(id, userId);
      if (!user) {
        this.sendNotFound(res, 'User');
        return;
      }
      this.sendSuccess(res, user);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Update user
   * PUT /api/users/:id
   */
  public updateUser = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'UPDATE_USER');
    
    const { id } = req.params;
    const sanitizedData = this.sanitizeInput(req.body);
    const userId = this.getUserId(req);

    // Validate user role if provided
    if (sanitizedData.role && !Object.values(UserRole).includes(sanitizedData.role)) {
      this.sendError(res, 'Invalid user role', 400);
      return;
    }

    try {
      const user = await this.userService.update(id, sanitizedData, userId);
      if (!user) {
        this.sendNotFound(res, 'User');
        return;
      }
      this.sendSuccess(res, user, 'User updated successfully');
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Delete user
   * DELETE /api/users/:id
   */
  public deleteUser = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'DELETE_USER');
    
    const { id } = req.params;
    const userId = this.getUserId(req);

    try {
      const deleted = await this.userService.delete(id, userId);
      if (!deleted) {
        this.sendNotFound(res, 'User');
        return;
      }
      this.sendSuccess(res, null, 'User deleted successfully');
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Authenticate user (simplified for demo)
   * POST /api/users/auth
   */
  public authenticateUser = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'AUTHENTICATE_USER');
    
    const validation = this.validateRequiredFields(req.body, ['email', 'password']);
    if (!validation.isValid) {
      this.sendValidationError(res, validation);
      return;
    }

    const { email, password } = req.body;

    try {
      const user = await this.userService.authenticate(email, password);
      if (!user) {
        this.sendUnauthorized(res, 'Invalid credentials');
        return;
      }

      // In a real application, you would generate and return a JWT token
      this.sendSuccess(res, {
        user,
        token: `demo-token-${user.id}`, // Simplified for demo
        message: 'Authentication successful'
      });
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get user by email
   * GET /api/users/email/:email
   */
  public getUserByEmail = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_USER_BY_EMAIL');
    
    const { email } = req.params;
    const userId = this.getUserId(req);

    try {
      const user = await this.userService.getByEmail(email, userId);
      if (!user) {
        this.sendNotFound(res, 'User');
        return;
      }
      this.sendSuccess(res, user);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get users by role
   * GET /api/users/role/:role
   */
  public getUsersByRole = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_USERS_BY_ROLE');
    
    const { role } = req.params;
    const userId = this.getUserId(req);

    // Validate user role
    if (!Object.values(UserRole).includes(role as UserRole)) {
      this.sendError(res, 'Invalid user role', 400);
      return;
    }

    try {
      const users = await this.userService.getByRole(role as UserRole, userId);
      this.sendSuccess(res, users);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Update user role
   * PATCH /api/users/:id/role
   */
  public updateUserRole = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'UPDATE_USER_ROLE');
    
    const { id } = req.params;
    const { role } = req.body;
    const userId = this.getUserId(req);

    if (!role || !Object.values(UserRole).includes(role)) {
      this.sendError(res, 'Valid role is required', 400);
      return;
    }

    try {
      const user = await this.userService.updateRole(id, role, userId);
      if (!user) {
        this.sendNotFound(res, 'User');
        return;
      }
      this.sendSuccess(res, user, 'User role updated successfully');
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get user statistics
   * GET /api/users/statistics
   */
  public getStatistics = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_USER_STATISTICS');
    
    const userId = this.getUserId(req);

    try {
      const statistics = await this.userService.getStatistics(userId);
      this.sendSuccess(res, statistics);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Search users by name
   * GET /api/users/search
   */
  public searchUsers = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'SEARCH_USERS');
    
    const { q: query } = req.query;
    const userId = this.getUserId(req);

    if (!query || typeof query !== 'string') {
      this.sendError(res, 'Search query is required', 400);
      return;
    }

    try {
      const users = await this.userService.searchByName(query, userId);
      this.sendSuccess(res, users);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get user profile with permissions
   * GET /api/users/:id/profile
   */
  public getUserProfile = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_USER_PROFILE');
    
    const { id } = req.params;
    const userId = this.getUserId(req);

    try {
      const profile = await this.userService.getUserProfile(id, userId);
      if (!profile) {
        this.sendNotFound(res, 'User');
        return;
      }
      this.sendSuccess(res, profile);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Check user permission
   * GET /api/users/:id/permissions/:permission
   */
  public checkPermission = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'CHECK_USER_PERMISSION');
    
    const { id, permission } = req.params;
    const userId = this.getUserId(req);

    try {
      const hasPermission = await this.userService.checkPermission(id, permission, userId);
      this.sendSuccess(res, {
        userId: id,
        permission,
        hasPermission
      });
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Promote user to admin
   * POST /api/users/:id/promote
   */
  public promoteToAdmin = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'PROMOTE_TO_ADMIN');
    
    const { id } = req.params;
    const userId = this.getUserId(req);

    try {
      const user = await this.userService.promoteToAdmin(id, userId);
      if (!user) {
        this.sendNotFound(res, 'User');
        return;
      }
      this.sendSuccess(res, user, 'User promoted to admin successfully');
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Demote admin to editor
   * POST /api/users/:id/demote
   */
  public demoteToEditor = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'DEMOTE_TO_EDITOR');
    
    const { id } = req.params;
    const userId = this.getUserId(req);

    try {
      const user = await this.userService.demoteToEditor(id, userId);
      if (!user) {
        this.sendNotFound(res, 'User');
        return;
      }
      this.sendSuccess(res, user, 'User demoted to editor successfully');
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get all admins
   * GET /api/users/admins
   */
  public getAdmins = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_ADMINS');
    
    const userId = this.getUserId(req);

    try {
      const admins = await this.userService.getAdmins(userId);
      this.sendSuccess(res, admins);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Change user password (placeholder)
   * POST /api/users/:id/password
   */
  public changePassword = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'CHANGE_PASSWORD');
    
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;
    const userId = this.getUserId(req);

    const validation = this.validateRequiredFields(req.body, ['oldPassword', 'newPassword']);
    if (!validation.isValid) {
      this.sendValidationError(res, validation);
      return;
    }

    if (newPassword.length < 6) {
      this.sendError(res, 'New password must be at least 6 characters long', 400);
      return;
    }

    try {
      const success = await this.userService.changePassword(id, oldPassword, newPassword, userId);
      if (!success) {
        this.sendError(res, 'Failed to change password', 400);
        return;
      }
      this.sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Get available user roles
   * GET /api/users/roles
   */
  public getUserRoles = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_USER_ROLES');
    
    const roles = Object.values(UserRole).map(role => ({
      value: role,
      label: role,
      description: this.getRoleDescription(role)
    }));

    this.sendSuccess(res, roles);
  });

  /**
   * Get current user info (from token)
   * GET /api/users/me
   */
  public getCurrentUser = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logRequest(req, 'GET_CURRENT_USER');
    
    const userId = this.getUserId(req);

    if (!userId) {
      this.sendUnauthorized(res, 'User ID not found in request');
      return;
    }

    try {
      const profile = await this.userService.getUserProfile(userId, userId);
      if (!profile) {
        this.sendNotFound(res, 'User');
        return;
      }
      this.sendSuccess(res, profile);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  });

  /**
   * Private helper methods
   */

  private getRoleDescription(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'Full system access with user management capabilities';
      case UserRole.EDITOR:
        return 'Can create, read, and update content';
      case UserRole.VIEWER:
        return 'Read-only access to content';
      default:
        return 'Unknown role';
    }
  }
}

