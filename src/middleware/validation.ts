import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errorHandler';
import { UserRole, ResourceType } from '../types/common';

/**
 * Validation schema interface
 */
interface ValidationSchema {
  [key: string]: {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    custom?: (value: any) => boolean | string;
  };
}

/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Generic validation middleware factory
 */
export const validateBody = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validateObject(req.body, schema);
    
    if (!result.isValid) {
      throw new ValidationError('Request validation failed', result.errors);
    }
    
    next();
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validateObject(req.query, schema);
    
    if (!result.isValid) {
      throw new ValidationError('Query validation failed', result.errors);
    }
    
    next();
  };
};

/**
 * Validate URL parameters
 */
export const validateParams = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validateObject(req.params, schema);
    
    if (!result.isValid) {
      throw new ValidationError('Parameter validation failed', result.errors);
    }
    
    next();
  };
};

/**
 * Core validation function
 */
const validateObject = (obj: any, schema: ValidationSchema): ValidationResult => {
  const errors: string[] = [];
  
  // Check required fields
  for (const [field, rules] of Object.entries(schema)) {
    const value = obj[field];
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    if (value === undefined || value === null) {
      continue; // Skip validation for optional undefined/null values
    }
    
    // Type validation
    if (rules.type) {
      const typeError = validateType(field, value, rules.type);
      if (typeError) {
        errors.push(typeError);
        continue;
      }
    }
    
    // String validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters long`);
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be no more than ${rules.maxLength} characters long`);
      }
      
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
    }
    
    // Number validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${field} must be at least ${rules.min}`);
      }
      
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${field} must be no more than ${rules.max}`);
      }
    }
    
    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
    }
    
    // Custom validation
    if (rules.custom) {
      const customResult = rules.custom(value);
      if (typeof customResult === 'string') {
        errors.push(customResult);
      } else if (!customResult) {
        errors.push(`${field} is invalid`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Type validation helper
 */
const validateType = (field: string, value: any, expectedType: string): string | null => {
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  
  if (actualType !== expectedType) {
    return `${field} must be of type ${expectedType}, got ${actualType}`;
  }
  
  return null;
};

/**
 * Common validation schemas
 */

// Topic validation schemas
export const createTopicSchema: ValidationSchema = {
  name: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 200
  },
  content: {
    required: true,
    type: 'string',
    minLength: 1
  },
  parentId: {
    type: 'string',
    pattern: /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i
  }
};

export const updateTopicSchema: ValidationSchema = {
  name: {
    type: 'string',
    minLength: 1,
    maxLength: 200
  },
  content: {
    type: 'string',
    minLength: 1
  },
  parentId: {
    type: 'string',
    pattern: /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i
  }
};

// Resource validation schemas
export const createResourceSchema: ValidationSchema = {
  topicId: {
    required: true,
    type: 'string',
    pattern: /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i
  },
  url: {
    required: true,
    type: 'string',
    custom: (value: string) => {
      try {
        new URL(value);
        return true;
      } catch {
        return 'Invalid URL format';
      }
    }
  },
  description: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 500
  },
  type: {
    required: true,
    enum: Object.values(ResourceType)
  }
};

export const updateResourceSchema: ValidationSchema = {
  topicId: {
    type: 'string',
    pattern: /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i
  },
  url: {
    type: 'string',
    custom: (value: string) => {
      try {
        new URL(value);
        return true;
      } catch {
        return 'Invalid URL format';
      }
    }
  },
  description: {
    type: 'string',
    minLength: 1,
    maxLength: 500
  },
  type: {
    enum: Object.values(ResourceType)
  }
};

// User validation schemas
export const createUserSchema: ValidationSchema = {
  name: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 100
  },
  email: {
    required: true,
    type: 'string',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  role: {
    required: true,
    enum: Object.values(UserRole)
  }
};

export const updateUserSchema: ValidationSchema = {
  name: {
    type: 'string',
    minLength: 1,
    maxLength: 100
  },
  email: {
    type: 'string',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  role: {
    enum: Object.values(UserRole)
  }
};

export const authSchema: ValidationSchema = {
  email: {
    required: true,
    type: 'string',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    required: true,
    type: 'string',
    minLength: 1
  }
};

// Query parameter schemas
export const paginationSchema: ValidationSchema = {
  page: {
    type: 'string',
    custom: (value: string) => {
      const num = parseInt(value);
      return !isNaN(num) && num > 0 ? true : 'Page must be a positive number';
    }
  },
  limit: {
    type: 'string',
    custom: (value: string) => {
      const num = parseInt(value);
      return !isNaN(num) && num > 0 && num <= 100 ? true : 'Limit must be between 1 and 100';
    }
  },
  sortBy: {
    type: 'string',
    enum: ['name', 'createdAt', 'updatedAt']
  },
  sortOrder: {
    type: 'string',
    enum: ['asc', 'desc']
  }
};

export const searchSchema: ValidationSchema = {
  q: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 200
  }
};

// Parameter schemas
export const idParamSchema: ValidationSchema = {
  id: {
    required: true,
    type: 'string',
    pattern: /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i
  }
};

export const versionParamSchema: ValidationSchema = {
  id: {
    required: true,
    type: 'string',
    pattern: /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i
  },
  version: {
    required: true,
    type: 'string',
    custom: (value: string) => {
      const num = parseInt(value);
      return !isNaN(num) && num > 0 ? true : 'Version must be a positive number';
    }
  }
};

/**
 * Sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

/**
 * Sanitize object recursively
 */
const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return obj.trim();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
};

