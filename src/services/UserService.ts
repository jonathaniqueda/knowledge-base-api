import { User } from '../models/User';
import { UserRepository } from '../repositories/UserRepository';
import { IService } from './IService';
import { EventPublisher, EventType } from './EventPublisher';
import { SearchCriteria, PaginationOptions, SortOptions, ValidationResult, UserRole } from '../types/common';

/**
 * User service for managing users and authentication
 */
export class UserService implements IService<User> {
  private userRepository: UserRepository;
  private eventPublisher: EventPublisher;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
    this.eventPublisher = EventPublisher.getInstance();
  }

  /**
   * Create a new user
   */
  public async create(data: Partial<User>): Promise<User> {
    if (!data.name || !data.email || !data.role) {
      throw new Error('Name, email, and role are required');
    }

    const user = new User(
      data.name,
      data.email,
      data.role
    );

    const validation = this.validate(user);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const createdUser = await this.userRepository.create(user);

    // Publish event
    await this.eventPublisher.publish({
      type: EventType.USER_CREATED,
      entityType: 'User',
      entityId: createdUser.id,
      timestamp: new Date(),
      data: { 
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role
      }
    });

    return createdUser;
  }

  /**
   * Get user by ID with permission checks
   */
  public async getById(id: string, userId?: string): Promise<User | null> {
    if (userId) {
      const requestingUser = await this.userRepository.findById(userId);
      if (!requestingUser) {
        throw new Error('Requesting user not found');
      }

      // Users can view their own profile, admins can view any profile
      if (id !== userId && !requestingUser.canManageUsers()) {
        throw new Error('Insufficient permissions to view user profile');
      }
    }

    return this.userRepository.findById(id);
  }

  /**
   * Get all users
   */
  public async getAll(criteria?: SearchCriteria, userId?: string): Promise<User[]> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canManageUsers()) {
        throw new Error('Insufficient permissions to list users');
      }
    }

    return criteria ? 
      this.userRepository.findBy(criteria) : 
      this.userRepository.findAll();
  }

  /**
   * Get users with pagination
   */
  public async getPaginated(
    criteria?: SearchCriteria,
    pagination?: PaginationOptions,
    sort?: SortOptions,
    userId?: string
  ): Promise<{
    data: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canManageUsers()) {
        throw new Error('Insufficient permissions to list users');
      }
    }

    return this.userRepository.findWithPagination(criteria, pagination, sort);
  }

  /**
   * Update user
   */
  public async update(id: string, data: Partial<User>, userId?: string): Promise<User | null> {
    if (userId) {
      const requestingUser = await this.userRepository.findById(userId);
      if (!requestingUser) {
        throw new Error('Requesting user not found');
      }

      // Users can update their own profile (except role), admins can update any profile
      if (id !== userId && !requestingUser.canManageUsers()) {
        throw new Error('Insufficient permissions to update user');
      }

      // Only admins can change roles
      if (data.role && !requestingUser.canManageUsers()) {
        throw new Error('Insufficient permissions to change user role');
      }
    }

    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      return null;
    }

    const updatedUser = await this.userRepository.update(id, data);

    if (updatedUser) {
      await this.eventPublisher.publish({
        type: EventType.USER_UPDATED,
        entityType: 'User',
        entityId: id,
        userId,
        timestamp: new Date(),
        data: { changes: data }
      });

      // Publish role change event if role was updated
      if (data.role && data.role !== existingUser.role) {
        await this.eventPublisher.publish({
          type: EventType.USER_ROLE_CHANGED,
          entityType: 'User',
          entityId: id,
          userId,
          timestamp: new Date(),
          data: { 
            oldRole: existingUser.role,
            newRole: data.role
          }
        });
      }
    }

    return updatedUser;
  }

  /**
   * Delete user
   */
  public async delete(id: string, userId?: string): Promise<boolean> {
    if (userId) {
      const requestingUser = await this.userRepository.findById(userId);
      if (!requestingUser || !requestingUser.canManageUsers()) {
        throw new Error('Insufficient permissions to delete users');
      }

      // Prevent self-deletion
      if (id === userId) {
        throw new Error('Cannot delete your own account');
      }
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      return false;
    }

    const deleted = await this.userRepository.delete(id);

    if (deleted) {
      await this.eventPublisher.publish({
        type: EventType.USER_DELETED,
        entityType: 'User',
        entityId: id,
        userId,
        timestamp: new Date(),
        data: { 
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }

    return deleted;
  }

  /**
   * Validate user data
   */
  public validate(data: Partial<User>): ValidationResult {
    const user = data as User;
    return user.validate ? user.validate() : { isValid: true, errors: [] };
  }

  /**
   * Authenticate user (simplified for demo)
   */
  public async authenticate(email: string, password: string): Promise<User | null> {
    // In a real application, you would verify password hash
    return this.userRepository.validateCredentials(email);
  }

  /**
   * Get user by email
   */
  public async getByEmail(email: string, userId?: string): Promise<User | null> {
    if (userId) {
      const requestingUser = await this.userRepository.findById(userId);
      if (!requestingUser || !requestingUser.canManageUsers()) {
        throw new Error('Insufficient permissions to search users by email');
      }
    }

    return this.userRepository.findByEmail(email);
  }

  /**
   * Get users by role
   */
  public async getByRole(role: UserRole, userId?: string): Promise<User[]> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canManageUsers()) {
        throw new Error('Insufficient permissions to filter users by role');
      }
    }

    return this.userRepository.findByRole(role);
  }

  /**
   * Update user role
   */
  public async updateRole(targetUserId: string, newRole: UserRole, userId?: string): Promise<User | null> {
    if (userId) {
      const requestingUser = await this.userRepository.findById(userId);
      if (!requestingUser || !requestingUser.canManageUsers()) {
        throw new Error('Insufficient permissions to change user roles');
      }

      // Prevent self-role change to non-admin
      if (targetUserId === userId && newRole !== UserRole.ADMIN) {
        throw new Error('Cannot remove admin role from your own account');
      }
    }

    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      return null;
    }

    const oldRole = targetUser.role;
    const updatedUser = await this.userRepository.updateRole(targetUserId, newRole);

    if (updatedUser) {
      await this.eventPublisher.publish({
        type: EventType.USER_ROLE_CHANGED,
        entityType: 'User',
        entityId: targetUserId,
        userId,
        timestamp: new Date(),
        data: { oldRole, newRole }
      });
    }

    return updatedUser;
  }

  /**
   * Get user statistics
   */
  public async getStatistics(userId?: string): Promise<{
    totalUsers: number;
    byRole: Record<UserRole, number>;
    recentUsers: User[];
  }> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canManageUsers()) {
        throw new Error('Insufficient permissions to view user statistics');
      }
    }

    const [totalUsers, byRole, recentUsers] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.getUserStatsByRole(),
      this.userRepository.getRecentUsers(5)
    ]);

    return {
      totalUsers,
      byRole,
      recentUsers
    };
  }

  /**
   * Search users by name
   */
  public async searchByName(namePattern: string, userId?: string): Promise<User[]> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canManageUsers()) {
        throw new Error('Insufficient permissions to search users');
      }
    }

    return this.userRepository.searchByName(namePattern);
  }

  /**
   * Get user profile with permissions
   */
  public async getUserProfile(targetUserId: string, userId?: string): Promise<{
    user: User;
    permissions: string[];
    roleDescription: string;
  } | null> {
    if (userId) {
      const requestingUser = await this.userRepository.findById(userId);
      if (!requestingUser) {
        throw new Error('Requesting user not found');
      }

      // Users can view their own profile, admins can view any profile
      if (targetUserId !== userId && !requestingUser.canManageUsers()) {
        throw new Error('Insufficient permissions to view user profile');
      }
    }

    return this.userRepository.getUserProfile(targetUserId);
  }

  /**
   * Check user permission
   */
  public async checkPermission(targetUserId: string, permission: string, userId?: string): Promise<boolean> {
    if (userId) {
      const requestingUser = await this.userRepository.findById(userId);
      if (!requestingUser) {
        throw new Error('Requesting user not found');
      }

      // Users can check their own permissions, admins can check any user's permissions
      if (targetUserId !== userId && !requestingUser.canManageUsers()) {
        throw new Error('Insufficient permissions to check user permissions');
      }
    }

    return this.userRepository.checkPermission(targetUserId, permission);
  }

  /**
   * Promote user to admin
   */
  public async promoteToAdmin(targetUserId: string, userId?: string): Promise<User | null> {
    return this.updateRole(targetUserId, UserRole.ADMIN, userId);
  }

  /**
   * Demote admin to editor
   */
  public async demoteToEditor(targetUserId: string, userId?: string): Promise<User | null> {
    if (userId) {
      const requestingUser = await this.userRepository.findById(userId);
      if (!requestingUser || !requestingUser.canManageUsers()) {
        throw new Error('Insufficient permissions to demote users');
      }

      // Prevent self-demotion
      if (targetUserId === userId) {
        throw new Error('Cannot demote your own account');
      }
    }

    return this.userRepository.demoteToEditor(targetUserId);
  }

  /**
   * Get all admins
   */
  public async getAdmins(userId?: string): Promise<User[]> {
    if (userId) {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.canManageUsers()) {
        throw new Error('Insufficient permissions to list admins');
      }
    }

    return this.userRepository.getAdmins();
  }

  /**
   * Ensure admin exists (system function)
   */
  public async ensureAdminExists(): Promise<void> {
    return this.userRepository.ensureAdminExists();
  }

  /**
   * Change user password (placeholder for real implementation)
   */
  public async changePassword(
    targetUserId: string, 
    _oldPassword: string, 
    _newPassword: string, 
    userId?: string
  ): Promise<boolean> {
    if (userId) {
      const requestingUser = await this.userRepository.findById(userId);
      if (!requestingUser) {
        throw new Error('Requesting user not found');
      }

      // Users can change their own password, admins can change any password
      if (targetUserId !== userId && !requestingUser.canManageUsers()) {
        throw new Error('Insufficient permissions to change password');
      }
    }

    // In a real implementation, you would:
    // 1. Verify old password
    // 2. Hash new password
    // 3. Update password in database
    // For this demo, we'll just return true
    
    console.log(`Password change requested for user ${targetUserId}`);
    return true;
  }
}

