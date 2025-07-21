import { BaseRepository } from './BaseRepository';
import { User } from '../models/User';
import { UserRole } from '../types/common';

/**
 * User repository for managing users and authentication
 */
export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users.json');
  }

  /**
   * Create entity from JSON data
   */
  protected fromJSON(data: any): User {
    return User.fromJSON(data);
  }

  /**
   * Find user by email
   */
  public async findByEmail(email: string): Promise<User | null> {
    const users = await this.findBy({ email: email.toLowerCase() });
    return users.length > 0 ? users[0] : null;
  }

  /**
   * Find users by role
   */
  public async findByRole(role: UserRole): Promise<User[]> {
    return this.findBy({ role });
  }

  /**
   * Check if email is already taken
   */
  public async isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
    const existingUser = await this.findByEmail(email);
    if (!existingUser) {
      return false;
    }
    
    return excludeUserId ? existingUser.id !== excludeUserId : true;
  }

  /**
   * Create user with email uniqueness check
   */
  public override async create(user: User): Promise<User> {
    if (await this.isEmailTaken(user.email)) {
      throw new Error('Email address is already taken');
    }

    // Normalize email to lowercase
    user.email = user.email.toLowerCase();
    
    return super.create(user);
  }

  /**
   * Update user with email uniqueness check
   */
  public override async update(id: string, updates: Partial<User>): Promise<User | null> {
    if (updates.email) {
      updates.email = updates.email.toLowerCase();
      
      if (await this.isEmailTaken(updates.email, id)) {
        throw new Error('Email address is already taken');
      }
    }

    return super.update(id, updates);
  }

  /**
   * Update user role
   */
  public async updateRole(userId: string, newRole: UserRole): Promise<User | null> {
    const user = await this.findById(userId);
    if (!user) {
      return null;
    }

    user.updateRole(newRole);
    this.data.set(userId, user);
    await this.save();
    
    return user;
  }

  /**
   * Get user statistics by role
   */
  public async getUserStatsByRole(): Promise<Record<UserRole, number>> {
    const allUsers = await this.findAll();
    const stats: Record<UserRole, number> = {
      [UserRole.ADMIN]: 0,
      [UserRole.EDITOR]: 0,
      [UserRole.VIEWER]: 0
    };

    for (const user of allUsers) {
      stats[user.role]++;
    }

    return stats;
  }

  /**
   * Get all admins
   */
  public async getAdmins(): Promise<User[]> {
    return this.findByRole(UserRole.ADMIN);
  }

  /**
   * Get all editors
   */
  public async getEditors(): Promise<User[]> {
    return this.findByRole(UserRole.EDITOR);
  }

  /**
   * Get all viewers
   */
  public async getViewers(): Promise<User[]> {
    return this.findByRole(UserRole.VIEWER);
  }

  /**
   * Check if user has specific permission
   */
  public async checkPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    return user.hasPermission(permission);
  }

  /**
   * Get users with specific permission
   */
  public async getUsersWithPermission(permission: string): Promise<User[]> {
    const allUsers = await this.findAll();
    return allUsers.filter(user => user.hasPermission(permission));
  }

  /**
   * Search users by name
   */
  public async searchByName(namePattern: string): Promise<User[]> {
    const allUsers = await this.findAll();
    return allUsers.filter(user => 
      user.name.toLowerCase().includes(namePattern.toLowerCase())
    );
  }

  /**
   * Get recent users
   */
  public async getRecentUsers(limit: number = 10): Promise<User[]> {
    const allUsers = await this.findAll();
    return allUsers
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Validate user credentials (basic implementation)
   */
  public async validateCredentials(email: string): Promise<User | null> {
    // Note: In a real application, you would hash passwords and compare hashes
    // This is a simplified implementation for the interview test
    const user = await this.findByEmail(email);
    
    if (!user) {
      return null;
    }

    // In a real app, you would compare password hashes here
    // For this demo, we'll just return the user if found
    return user;
  }

  /**
   * Ensure at least one admin exists
   */
  public async ensureAdminExists(): Promise<void> {
    const admins = await this.getAdmins();
    
    if (admins.length === 0) {
      // Create default admin user
      const defaultAdmin = new User(
        'Default Admin',
        'admin@knowledgebase.com',
        UserRole.ADMIN
      );
      
      await this.create(defaultAdmin);
      console.log('Created default admin user: admin@knowledgebase.com');
    }
  }

  /**
   * Promote user to admin
   */
  public async promoteToAdmin(userId: string): Promise<User | null> {
    return this.updateRole(userId, UserRole.ADMIN);
  }

  /**
   * Demote admin to editor
   */
  public async demoteToEditor(userId: string): Promise<User | null> {
    const admins = await this.getAdmins();
    
    if (admins.length <= 1) {
      throw new Error('Cannot demote the last admin user');
    }
    
    return this.updateRole(userId, UserRole.EDITOR);
  }

  /**
   * Delete user with admin protection
   */
  public override async delete(id: string): Promise<boolean> {
    const user = await this.findById(id);
    
    if (user && user.isAdmin()) {
      const admins = await this.getAdmins();
      
      if (admins.length <= 1) {
        throw new Error('Cannot delete the last admin user');
      }
    }
    
    return super.delete(id);
  }

  /**
   * Get user profile summary
   */
  public async getUserProfile(userId: string): Promise<{
    user: User;
    permissions: string[];
    roleDescription: string;
  } | null> {
    const user = await this.findById(userId);
    if (!user) {
      return null;
    }

    const roleDescriptions = {
      [UserRole.ADMIN]: 'Full system access with user management capabilities',
      [UserRole.EDITOR]: 'Can create, read, and update content',
      [UserRole.VIEWER]: 'Read-only access to content'
    };

    return {
      user,
      permissions: user.getPermissions(),
      roleDescription: roleDescriptions[user.role]
    };
  }
}

