import { Request, Response, NextFunction } from 'express';

/**
 * 404 Not Found handler middleware
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    availableRoutes: {
      topics: [
        'GET /api/topics',
        'POST /api/topics',
        'GET /api/topics/:id',
        'PUT /api/topics/:id',
        'DELETE /api/topics/:id',
        'GET /api/topics/:id/versions',
        'GET /api/topics/:id/hierarchy',
        'GET /api/topics/search'
      ],
      resources: [
        'GET /api/resources',
        'POST /api/resources',
        'GET /api/resources/:id',
        'PUT /api/resources/:id',
        'DELETE /api/resources/:id',
        'GET /api/resources/topic/:topicId'
      ],
      users: [
        'GET /api/users',
        'POST /api/users',
        'GET /api/users/:id',
        'PUT /api/users/:id',
        'DELETE /api/users/:id',
        'POST /api/users/auth'
      ]
    }
  });
};

