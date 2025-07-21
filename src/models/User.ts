import { BaseEntity } from './BaseEntity';
import { ValidationResult, UserRole } from '../types/common';

/**
 * Interface for permission strategies
 */
export interface IPermissionStrategy {
  canCreate(): boolean;
  canRead(): boolean;
  canUpdate(): boolean;
  canDelete(): boolean;
  canManageUsers(): boolean;
  canViewAllVersions(): boolean;
}

/**
 * Admin permission strategy
 */
export class AdminPermissionStrategy implements IPermissionStrategy {
  canCreate(): boolean { return true; }
  canRead(): boolean { return true; }
  canUpdate(): boolean { return true; }
  canDelete(): boolean { return true; }
  canManageUsers(): boolean { return true; }
  canViewAllVersions(): boolean { return true; }
}

/**
 * Editor permission strategy
 */
export class EditorPermissionStrategy implements IPermissionStrategy {
  canCreate(): boolean { return true; }
  canRead(): boolean { return true; }
  canUpdate(): boolean { return true; }
  canDelete(): boolean { return false; }
  canManageUsers(): boolean { return false; }
  canViewAllVersions(): boolean { return true; }
}

/**
 * Viewer permission strategy
 */
export class ViewerPermissionStrategy implements IPermissionStrategy {
  canCreate(): boolean { return false; }
  canRead(): boolean { return true; }
  canUpdate(): boolean { return false; }
  canDelete(): boolean { return false; }
  canManageUsers(): boolean { return false; }
  canViewAllVersions(): boolean { return false; }
}

/**
 * Factory for creating permission strategies
 */
export class PermissionStrategyFactory {
  public static createStrategy(role: UserRole): IPermissionStrategy {
    switch (role) {
      case UserRole.ADMIN:
        return new AdminPermissionStrategy();
      case UserRole.EDITOR:
        return new EditorPermissionStrategy();
      case UserRole.VIEWER:
        return new ViewerPermissionStrategy();
      default:
        throw new Error(`Unknown user role: ${role}`);
    }
  }
}

/**
 * User entity with role-based permissions using Strategy pattern
 */
export class User extends BaseEntity {
  public name: string;
  public email: string;
  public role: UserRole;
  private permissionStrategy: IPermissionStrategy;

  constructor(
    name: string,
    email: string,
    role: UserRole,
    id?: string
  ) {
    super(id);
    this.name = name;
    this.email = email;
    this.role = role;
    this.permissionStrategy = PermissionStrategyFactory.createStrategy(role);
  }

  /**
   * Validates the user data
   */
  public validate(): ValidationResult {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (this.name && this.name.length > 100) {
      errors.push('Name must be less than 100 characters');
    }

    if (!this.email || this.email.trim().length === 0) {
      errors.push('Email is required');
    }

    if (this.email && !this.isValidEmail(this.email)) {
      errors.push('Email must be a valid email format');
    }

    if (!Object.values(UserRole).includes(this.role)) {
      errors.push('Invalid user role');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Updates user role and permission strategy
   */
  public updateRole(newRole: UserRole): void {
    this.role = newRole;
    this.permissionStrategy = PermissionStrategyFactory.createStrategy(newRole);
    this.touch();
  }

  /**
   * Updates user profile
   */
  public updateProfile(data: { name?: string; email?: string }): ValidationResult {
    if (data.name !== undefined) this.name = data.name;
    if (data.email !== undefined) this.email = data.email;

    const validation = this.validate();
    if (validation.isValid) {
      this.touch();
    }

    return validation;
  }

  /**
   * Permission methods using Strategy pattern
   */
  public canCreate(): boolean {
    return this.permissionStrategy.canCreate();
  }

  public canRead(): boolean {
    return this.permissionStrategy.canRead();
  }

  public canUpdate(): boolean {
    return this.permissionStrategy.canUpdate();
  }

  public canDelete(): boolean {
    return this.permissionStrategy.canDelete();
  }

  public canManageUsers(): boolean {
    return this.permissionStrategy.canManageUsers();
  }

  public canViewAllVersions(): boolean {
    return this.permissionStrategy.canViewAllVersions();
  }

  /**
   * Check if user has specific permission
   */
  public hasPermission(permission: string): boolean {
    switch (permission.toLowerCase()) {
      case 'create':
        return this.canCreate();
      case 'read':
        return this.canRead();
      case 'update':
        return this.canUpdate();
      case 'delete':
        return this.canDelete();
      case 'manage_users':
        return this.canManageUsers();
      case 'view_all_versions':
        return this.canViewAllVersions();
      default:
        return false;
    }
  }

  /**
   * Get all permissions for this user
   */
  public getPermissions(): string[] {
    const permissions: string[] = [];
    
    if (this.canCreate()) permissions.push('create');
    if (this.canRead()) permissions.push('read');
    if (this.canUpdate()) permissions.push('update');
    if (this.canDelete()) permissions.push('delete');
    if (this.canManageUsers()) permissions.push('manage_users');
    if (this.canViewAllVersions()) permissions.push('view_all_versions');
    
    return permissions;
  }

  /**
   * Check if user is admin
   */
  public isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * Check if user is editor
   */
  public isEditor(): boolean {
    return this.role === UserRole.EDITOR;
  }

  /**
   * Check if user is viewer
   */
  public isViewer(): boolean {
    return this.role === UserRole.VIEWER;
  }

  /**
   * Clone the user
   */
  public clone(): User {
    return new User(
      this.name,
      this.email,
      this.role,
      this.id
    );
  }

  /**
   * Serialize to JSON
   */
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      permissions: this.getPermissions()
    };
  }

  /**
   * Create user from JSON data
   */
  public static fromJSON(data: any): User {
    return new User(
      data.name,
      data.email,
      data.role,
      data.id
    );
  }
}

