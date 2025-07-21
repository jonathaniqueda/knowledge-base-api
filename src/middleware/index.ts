export {
  errorHandler,
  ApiError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  asyncHandler,
  createValidationError,
  createApiError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createConflictError,
  handleDatabaseError,
  handleFileSystemError,
  setupGlobalErrorHandlers
} from './errorHandler';

export { notFoundHandler } from './notFoundHandler';

export {
  validateBody,
  validateQuery,
  validateParams,
  sanitizeInput,
  createTopicSchema,
  updateTopicSchema,
  createResourceSchema,
  updateResourceSchema,
  createUserSchema,
  updateUserSchema,
  authSchema,
  paginationSchema,
  searchSchema,
  idParamSchema,
  versionParamSchema
} from './validation';

export {
  authenticate,
  optionalAuth,
  authorize,
  requireRole,
  requireAdmin,
  requireEditor,
  requireSelfOrAdmin,
  requirePermission,
  requireAllPermissions,
  requireAnyPermission,
  rateLimit,
  authenticateApiKey,
  handleCors,
  securityHeaders,
  AuthenticatedRequest
} from './auth';

export {
  requestLogger,
  errorLogger,
  performanceMonitor,
  apiUsageTracker,
  healthCheck,
  logStore,
  getApiUsageStats,
  clearAllLogs
} from './logging';

