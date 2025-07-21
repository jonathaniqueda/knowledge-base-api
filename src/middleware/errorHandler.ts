import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends ApiError {
  public errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message, 400);
    this.errors = errors;
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

/**
 * Unauthorized error class
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * Forbidden error class
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  error: string;
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  details?: any;
  stack?: string;
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = undefined;

  // Handle different error types
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    
    if (error instanceof ValidationError) {
      details = { errors: error.errors };
    }
  } else if (error.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    message = 'Validation Error';
    details = { errors: Object.values((error as any).errors).map((e: any) => e.message) };
  } else if (error.name === 'CastError') {
    // Mongoose cast error
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'MongoError' && (error as any).code === 11000) {
    // Duplicate key error
    statusCode = 409;
    message = 'Duplicate entry';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    statusCode = 400;
    message = 'Invalid JSON';
  }

  // Log error
  console.error(`[ERROR] ${new Date().toISOString()}`, {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.headers['x-user-id']
  });

  // Prepare error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // Add details if available
  if (details) {
    errorResponse.details = details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
};

/**
 * Validation error helper
 */
export const createValidationError = (message: string, errors: string[]): ValidationError => {
  return new ValidationError(message, errors);
};

/**
 * Error factory functions
 */
export const createApiError = (message: string, statusCode: number = 500): ApiError => {
  return new ApiError(message, statusCode);
};

export const createNotFoundError = (resource: string = 'Resource'): NotFoundError => {
  return new NotFoundError(resource);
};

export const createUnauthorizedError = (message?: string): UnauthorizedError => {
  return new UnauthorizedError(message);
};

export const createForbiddenError = (message?: string): ForbiddenError => {
  return new ForbiddenError(message);
};

export const createConflictError = (message?: string): ConflictError => {
  return new ConflictError(message);
};

/**
 * Error handling utilities
 */
export const handleDatabaseError = (error: any): ApiError => {
  if (error.code === 'ECONNREFUSED') {
    return new ApiError('Database connection failed', 503);
  }
  
  if (error.code === 'ENOTFOUND') {
    return new ApiError('Database host not found', 503);
  }
  
  if (error.code === 'ETIMEDOUT') {
    return new ApiError('Database operation timed out', 504);
  }
  
  return new ApiError('Database error occurred', 500);
};

export const handleFileSystemError = (error: any): ApiError => {
  if (error.code === 'ENOENT') {
    return new ApiError('File not found', 404);
  }
  
  if (error.code === 'EACCES') {
    return new ApiError('Permission denied', 403);
  }
  
  if (error.code === 'ENOSPC') {
    return new ApiError('No space left on device', 507);
  }
  
  return new ApiError('File system error occurred', 500);
};

/**
 * Process uncaught exceptions and unhandled rejections
 */
export const setupGlobalErrorHandlers = (): void => {
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
};

