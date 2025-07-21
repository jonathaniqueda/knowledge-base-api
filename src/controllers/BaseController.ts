import { Request, Response } from 'express';
import { ValidationResult } from '../types/common';

/**
 * Base controller with common functionality
 */
export abstract class BaseController {
  
  /**
   * Send success response
   */
  protected sendSuccess(res: Response, data: any, message?: string, statusCode: number = 200): void {
    res.status(statusCode).json({
      success: true,
      message: message || 'Operation completed successfully',
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send error response
   */
  protected sendError(res: Response, error: string | Error, statusCode: number = 500): void {
    const message = error instanceof Error ? error.message : error;
    
    res.status(statusCode).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send validation error response
   */
  protected sendValidationError(res: Response, validation: ValidationResult): void {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: validation.errors,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send not found response
   */
  protected sendNotFound(res: Response, resource: string = 'Resource'): void {
    res.status(404).json({
      success: false,
      error: `${resource} not found`,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send unauthorized response
   */
  protected sendUnauthorized(res: Response, message: string = 'Unauthorized'): void {
    res.status(401).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send forbidden response
   */
  protected sendForbidden(res: Response, message: string = 'Forbidden'): void {
    res.status(403).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Extract user ID from request (simplified for demo)
   */
  protected getUserId(req: Request): string | undefined {
    // In a real application, this would extract user ID from JWT token
    return req.headers['x-user-id'] as string;
  }

  /**
   * Extract pagination parameters
   */
  protected getPaginationParams(req: Request): {
    page: number;
    limit: number;
  } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    
    return { page, limit };
  }

  /**
   * Extract sort parameters
   */
  protected getSortParams(req: Request): {
    field: string;
    direction: 'asc' | 'desc';
  } {
    const field = (req.query.sortBy as string) || 'createdAt';
    const direction = (req.query.sortOrder as string) === 'desc' ? 'desc' : 'asc';
    
    return { field, direction };
  }

  /**
   * Extract search criteria from query parameters
   */
  protected getSearchCriteria(req: Request, allowedFields: string[]): Record<string, any> {
    const criteria: Record<string, any> = {};
    
    for (const field of allowedFields) {
      if (req.query[field]) {
        criteria[field] = req.query[field];
      }
    }
    
    return criteria;
  }

  /**
   * Async error handler wrapper
   */
  protected asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
    return (req: Request, res: Response): void => {
      Promise.resolve(fn(req, res)).catch((error) => {
        console.error('Controller error:', error);
        this.sendError(res, error as Error);
      });
    };
  }

  /**
   * Validate required fields
   */
  protected validateRequiredFields(data: any, requiredFields: string[]): ValidationResult {
    const errors: string[] = [];
    
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors.push(`${field} is required`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize input data
   */
  protected sanitizeInput(data: any): any {
    if (typeof data === 'string') {
      return data.trim();
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return data;
  }

  /**
   * Log request for debugging
   */
  protected logRequest(req: Request, action: string): void {
    console.log(`[${new Date().toISOString()}] ${action}: ${req.method} ${req.path}`, {
      userId: this.getUserId(req),
      body: req.body,
      query: req.query
    });
  }
}

