import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { DatabaseManager } from '../repositories/DatabaseManager';
import { UserRole } from '../types/common';

/**
 * Extended Request interface with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    permissions: string[];
  };
}

/**
 * Authentication middleware (simplified for demo)
 * In a real application, this would verify JWT tokens
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get user ID from header (simplified for demo)
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      throw new UnauthorizedError('User ID header is required');
    }

    // Get user from database
    const db = DatabaseManager.getInstance();
    const user = await db.users.findById(userId);
    
    if (!user) {
      throw new UnauthorizedError('Invalid user ID');
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.getPermissions()
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Continues even if no user is authenticated
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    if (userId) {
      const db = DatabaseManager.getInstance();
      const user = await db.users.findById(userId);
      
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.getPermissions()
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Authorization middleware factory
 */
export const authorize = (...requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const hasPermission = requiredPermissions.every(permission =>
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }

    next();
  };
};

/**
 * Admin only middleware
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (req.user.role !== UserRole.ADMIN) {
    throw new ForbiddenError('Admin access required');
  }

  next();
};

/**
 * Editor or Admin middleware
 */
export const requireEditor = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.EDITOR) {
    throw new ForbiddenError('Editor or Admin access required');
  }

  next();
};

/**
 * Self or Admin middleware (for user profile operations)
 */
export const requireSelfOrAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const targetUserId = req.params.id;
  
  if (req.user.id !== targetUserId && req.user.role !== UserRole.ADMIN) {
    throw new ForbiddenError('Can only access your own profile or admin access required');
  }

  next();
};

/**
 * Permission check middleware factory
 */
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!req.user.permissions.includes(permission)) {
      throw new ForbiddenError(`Permission required: ${permission}`);
    }

    next();
  };
};

/**
 * Multiple permissions check (all required)
 */
export const requireAllPermissions = (...permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const hasAllPermissions = permissions.every(permission =>
      req.user!.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      throw new ForbiddenError(`All permissions required: ${permissions.join(', ')}`);
    }

    next();
  };
};

/**
 * Any permission check (at least one required)
 */
export const requireAnyPermission = (...permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const hasAnyPermission = permissions.some(permission =>
      req.user!.permissions.includes(permission)
    );

    if (!hasAnyPermission) {
      throw new ForbiddenError(`One of these permissions required: ${permissions.join(', ')}`);
    }

    next();
  };
};

/**
 * Rate limiting middleware (simplified implementation)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [ip, data] of rateLimitStore.entries()) {
      if (data.resetTime < now) {
        rateLimitStore.delete(ip);
      }
    }

    const current = rateLimitStore.get(key);

    if (!current) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (current.resetTime < now) {
      // Reset window
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        statusCode: 429,
        timestamp: new Date().toISOString(),
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      });
      return;
    }

    current.count++;
    next();
  };
};

/**
 * API key authentication middleware (for external integrations)
 */
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    throw new UnauthorizedError('API key is required');
  }

  // In a real application, you would validate the API key against a database
  // For this demo, we'll use a simple check
  const validApiKeys = ['demo-api-key-123', 'test-api-key-456'];
  
  if (!validApiKeys.includes(apiKey)) {
    throw new UnauthorizedError('Invalid API key');
  }

  next();
};

/**
 * CORS preflight handler
 */
export const handleCors = (req: Request, res: Response, next: NextFunction): void => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id, x-api-key');
  res.header('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.header('Content-Security-Policy', "default-src 'self'");
  
  next();
};

