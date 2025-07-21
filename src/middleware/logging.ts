import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

/**
 * Request log interface
 */
interface RequestLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  path: string;
  query: any;
  body: any;
  headers: any;
  ip: string;
  userAgent: string;
  userId?: string;
  duration?: number;
  statusCode?: number;
  responseSize?: number;
  error?: string;
}

/**
 * In-memory log store (in production, use proper logging service)
 */
class LogStore {
  private logs: RequestLog[] = [];
  private maxLogs: number = 1000;

  public addLog(log: RequestLog): void {
    this.logs.push(log);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  public getLogs(limit: number = 100): RequestLog[] {
    return this.logs.slice(-limit);
  }

  public getLogsByUser(userId: string, limit: number = 100): RequestLog[] {
    return this.logs
      .filter(log => log.userId === userId)
      .slice(-limit);
  }

  public getErrorLogs(limit: number = 100): RequestLog[] {
    return this.logs
      .filter(log => log.error || (log.statusCode && log.statusCode >= 400))
      .slice(-limit);
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public getStats(): {
    totalRequests: number;
    errorCount: number;
    averageResponseTime: number;
    requestsByMethod: Record<string, number>;
    requestsByStatus: Record<string, number>;
  } {
    const totalRequests = this.logs.length;
    const errorCount = this.logs.filter(log => 
      log.error || (log.statusCode && log.statusCode >= 400)
    ).length;
    
    const totalDuration = this.logs
      .filter(log => log.duration)
      .reduce((sum, log) => sum + (log.duration || 0), 0);
    
    const averageResponseTime = totalRequests > 0 ? totalDuration / totalRequests : 0;
    
    const requestsByMethod: Record<string, number> = {};
    const requestsByStatus: Record<string, number> = {};
    
    for (const log of this.logs) {
      requestsByMethod[log.method] = (requestsByMethod[log.method] || 0) + 1;
      
      if (log.statusCode) {
        const statusGroup = `${Math.floor(log.statusCode / 100)}xx`;
        requestsByStatus[statusGroup] = (requestsByStatus[statusGroup] || 0) + 1;
      }
    }
    
    return {
      totalRequests,
      errorCount,
      averageResponseTime,
      requestsByMethod,
      requestsByStatus
    };
  }
}

const logStore = new LogStore();

/**
 * Request logging middleware
 */
export const requestLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Add request ID to request object
  (req as any).requestId = requestId;
  
  // Create initial log entry
  const log: RequestLog = {
    id: requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    body: sanitizeBody(req.body),
    headers: sanitizeHeaders(req.headers),
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    userId: req.user?.id
  };
  
  // Log request
  console.log(`[REQUEST] ${log.timestamp} ${log.method} ${log.path}`, {
    requestId,
    userId: log.userId,
    ip: log.ip,
    userAgent: log.userAgent
  });
  
  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    const duration = Date.now() - startTime;
    
    // Update log with response details
    log.duration = duration;
    log.statusCode = res.statusCode;
    log.responseSize = res.get('Content-Length') ? parseInt(res.get('Content-Length')!) : 0;
    
    // Add to log store
    logStore.addLog(log);
    
    // Log response
    const level = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    console.log(`[RESPONSE] ${level} ${log.timestamp} ${log.method} ${log.path} ${res.statusCode} ${duration}ms`, {
      requestId,
      statusCode: res.statusCode,
      duration,
      responseSize: log.responseSize
    });
    
    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Error logging middleware
 */
export const errorLogger = (error: Error, req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const requestId = (req as any).requestId;
  
  // Find and update the log entry
  const logs = logStore.getLogs();
  const logEntry = logs.find(log => log.id === requestId);
  
  if (logEntry) {
    logEntry.error = error.message;
  }
  
  // Log error details
  console.error(`[ERROR] ${new Date().toISOString()} ${req.method} ${req.path}`, {
    requestId,
    error: error.message,
    stack: error.stack,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  next(error);
};

/**
 * Performance monitoring middleware
 */
export const performanceMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log slow requests (> 1 second)
    if (duration > 1000) {
      console.warn(`[SLOW REQUEST] ${req.method} ${req.path} took ${duration.toFixed(2)}ms`, {
        method: req.method,
        path: req.path,
        duration: duration.toFixed(2),
        statusCode: res.statusCode
      });
    }
    
    // Add performance header
    res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
  });
  
  next();
};

/**
 * API usage tracking middleware
 */
const apiUsageStore = new Map<string, {
  count: number;
  lastAccess: Date;
  endpoints: Record<string, number>;
}>();

export const apiUsageTracker = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const userId = req.user?.id || 'anonymous';
  const endpoint = `${req.method} ${req.path}`;
  
  const usage = apiUsageStore.get(userId) || {
    count: 0,
    lastAccess: new Date(),
    endpoints: {}
  };
  
  usage.count++;
  usage.lastAccess = new Date();
  usage.endpoints[endpoint] = (usage.endpoints[endpoint] || 0) + 1;
  
  apiUsageStore.set(userId, usage);
  
  next();
};

/**
 * Health check middleware
 */
export const healthCheck = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path === '/health' || req.path === '/api/health') {
    const stats = logStore.getStats();
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime)}s`,
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      requests: {
        total: stats.totalRequests,
        errors: stats.errorCount,
        averageResponseTime: `${stats.averageResponseTime.toFixed(2)}ms`
      },
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version
    });
    return;
  }
  
  next();
};

/**
 * Utility functions
 */

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

function sanitizeBody(body: any): any {
  if (!body) return body;
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers };
  
  // Remove sensitive headers
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  for (const header of sensitiveHeaders) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Export log store for external access
 */
export { logStore };

/**
 * Get API usage statistics
 */
export const getApiUsageStats = (): Array<{
  userId: string;
  totalRequests: number;
  lastAccess: Date;
  topEndpoints: Array<{ endpoint: string; count: number }>;
}> => {
  const stats: Array<{
    userId: string;
    totalRequests: number;
    lastAccess: Date;
    topEndpoints: Array<{ endpoint: string; count: number }>;
  }> = [];
  
  for (const [userId, usage] of apiUsageStore.entries()) {
    const topEndpoints = Object.entries(usage.endpoints)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    stats.push({
      userId,
      totalRequests: usage.count,
      lastAccess: usage.lastAccess,
      topEndpoints
    });
  }
  
  return stats.sort((a, b) => b.totalRequests - a.totalRequests);
};

/**
 * Clear all logs and usage data
 */
export const clearAllLogs = (): void => {
  logStore.clearLogs();
  apiUsageStore.clear();
};

