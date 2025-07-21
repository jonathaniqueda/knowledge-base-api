# Dynamic Knowledge Base API

A comprehensive RESTful API for managing hierarchical knowledge bases with version control, advanced algorithms, and enterprise-grade features.

## 🚀 Features

- **Hierarchical Topic Management**: Create and manage topics in tree structures with parent-child relationships
- **Version Control**: Full version history tracking for all topics with rollback capabilities
- **Advanced Algorithms**: Custom shortest path finding, tree traversal, and search algorithms
- **User Management**: Role-based access control with Admin, Editor, and Viewer roles
- **Resource Management**: Associate external resources (links, documents, videos) with topics
- **RESTful API**: Complete REST API with comprehensive error handling and validation
- **Enterprise Security**: Authentication, authorization, rate limiting, and security headers
- **Docker Support**: Full containerization with development and production configurations
- **Comprehensive Testing**: Unit tests, integration tests, and API endpoint testing
- **Advanced OOP**: Design patterns including Repository, Observer, Strategy, and Composite patterns




## 📋 Table of Contents

- [Features](#-features)
- [Architecture Overview](#-architecture-overview)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [API Documentation](#-api-documentation)
- [Docker Deployment](#-docker-deployment)
- [Development](#-development)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [Design Patterns](#-design-patterns)
- [Algorithms](#-algorithms)
- [Configuration](#-configuration)
- [Contributing](#-contributing)
- [License](#-license)

## 🏗️ Architecture Overview

The Knowledge Base API follows a clean architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Controllers │  │ Middleware  │  │   Routes    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Services   │  │ Algorithms  │  │ Validators  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Data Access Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │Repositories │  │   Models    │  │  Database   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

- **Controllers**: Handle HTTP requests and responses, input validation, and error handling
- **Services**: Implement business logic, orchestrate operations, and enforce business rules
- **Repositories**: Abstract data access layer with in-memory storage and JSON persistence
- **Models**: Domain entities with validation, business logic, and relationships
- **Algorithms**: Custom implementations for path finding, tree traversal, and search
- **Middleware**: Cross-cutting concerns like authentication, logging, and error handling

## 🛠️ Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5+
- **Framework**: Express.js
- **Testing**: Jest with Supertest
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (optional)
- **Caching**: Redis (optional)
- **Code Quality**: ESLint, Prettier
- **Documentation**: Comprehensive README and inline documentation


## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd knowledge-base-api

# Start with Docker Compose
./docker-scripts.sh start-prod

# API will be available at http://localhost:3000
# Health check: http://localhost:3000/health
```

### Manual Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start

# For development with hot reload
npm run dev
```

### First API Call

```bash
# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin"
  }'

# Create a topic (use the user ID from previous response)
curl -X POST http://localhost:3000/api/topics \
  -H "Content-Type: application/json" \
  -H "x-user-id: <user-id>" \
  -d '{
    "name": "Getting Started",
    "content": "This is my first topic in the knowledge base"
  }'
```

## 📦 Installation

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- Docker (optional, for containerized deployment)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd knowledge-base-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Run tests**
   ```bash
   npm test
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

### Production Deployment

1. **Using Docker (Recommended)**
   ```bash
   # Build and start production services
   ./docker-scripts.sh build-prod
   ./docker-scripts.sh start-prod
   ```

2. **Manual deployment**
   ```bash
   # Install production dependencies
   npm ci --only=production
   
   # Build the application
   npm run build
   
   # Start the server
   NODE_ENV=production npm start
   ```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Data Storage
DATA_DIR=./data

# Security
JWT_SECRET=your-jwt-secret-here
API_KEY=your-api-key-here

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```


## 📚 API Documentation

### Authentication

All API requests require a user ID header:
```
x-user-id: <user-id>
```

For external integrations, use API key authentication:
```
x-api-key: <api-key>
```

### Topics API

#### Create Topic
```http
POST /api/topics
Content-Type: application/json
x-user-id: <user-id>

{
  "name": "Topic Name",
  "content": "Topic content",
  "parentId": "optional-parent-id"
}
```

#### Get All Topics
```http
GET /api/topics?page=1&limit=10&sortBy=name&sortOrder=asc
x-user-id: <user-id>
```

#### Get Topic by ID
```http
GET /api/topics/{id}
x-user-id: <user-id>
```

#### Update Topic (Creates New Version)
```http
PUT /api/topics/{id}
Content-Type: application/json
x-user-id: <user-id>

{
  "name": "Updated Name",
  "content": "Updated content"
}
```

#### Delete Topic
```http
DELETE /api/topics/{id}
x-user-id: <user-id>
```

#### Version Control
```http
# Get version history
GET /api/topics/{id}/versions
x-user-id: <user-id>

# Get specific version
GET /api/topics/{id}/versions/{version}
x-user-id: <user-id>
```

#### Hierarchy Operations
```http
# Get topic hierarchy
GET /api/topics/{id}/hierarchy
x-user-id: <user-id>

# Get root topics
GET /api/topics/roots
x-user-id: <user-id>

# Get children
GET /api/topics/{id}/children
x-user-id: <user-id>

# Move topic to new parent
POST /api/topics/{id}/move
Content-Type: application/json
x-user-id: <user-id>

{
  "parentId": "new-parent-id"
}
```

#### Search and Algorithms
```http
# Search topics
GET /api/topics/search?q=search-term
x-user-id: <user-id>

# Find shortest path between topics
GET /api/topics/{id1}/path/{id2}
x-user-id: <user-id>

# Find all paths between topics
GET /api/topics/{id1}/paths/{id2}
x-user-id: <user-id>

# Tree traversal
GET /api/topics/{id}/traverse/{method}
# Methods: dfs, bfs, preorder, postorder
x-user-id: <user-id>

# Get relationship between topics
GET /api/topics/{id1}/relationship/{id2}
x-user-id: <user-id>

# Find topics within distance
GET /api/topics/{id}/nearby/{distance}
x-user-id: <user-id>
```

### Resources API

#### Create Resource
```http
POST /api/resources
Content-Type: application/json
x-user-id: <user-id>

{
  "topicId": "topic-id",
  "url": "https://example.com",
  "description": "Resource description",
  "type": "link"
}
```

#### Get Resources
```http
GET /api/resources?page=1&limit=10
x-user-id: <user-id>

# Filter by topic
GET /api/resources/topic/{topicId}
x-user-id: <user-id>

# Filter by type
GET /api/resources/type/{type}
x-user-id: <user-id>
```

#### Resource Types
- `link` - Web links
- `document` - Documents
- `video` - Video content
- `image` - Images
- `audio` - Audio content

### Users API

#### Create User
```http
POST /api/users
Content-Type: application/json

{
  "name": "User Name",
  "email": "user@example.com",
  "role": "editor"
}
```

#### Authenticate User
```http
POST /api/users/auth
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

#### User Roles
- `admin` - Full access including user management
- `editor` - Can create, read, and update content
- `viewer` - Read-only access

### Response Format

All API responses follow this format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2023-12-01T12:00:00.000Z"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400,
  "timestamp": "2023-12-01T12:00:00.000Z",
  "path": "/api/topics",
  "method": "POST"
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error


## 🐳 Docker Deployment

### Quick Start with Docker

```bash
# Build and start production services
./docker-scripts.sh build-prod
./docker-scripts.sh start-prod

# Check health
./docker-scripts.sh health

# View logs
./docker-scripts.sh logs

# Stop services
./docker-scripts.sh stop
```

### Docker Compose Profiles

#### Production Profile (Default)
```bash
docker-compose up -d
```
- Runs optimized production build
- Persistent data volumes
- Health checks enabled

#### Development Profile
```bash
./docker-scripts.sh start-dev
# or
docker-compose --profile dev up -d
```
- Hot reload enabled
- Source code mounted as volume
- Development dependencies included

#### Production with Nginx Proxy
```bash
./docker-scripts.sh start-proxy
# or
docker-compose --profile production up -d
```
- Nginx reverse proxy
- Rate limiting
- SSL termination ready
- CORS headers

#### With Redis Caching
```bash
./docker-scripts.sh start-cache
# or
docker-compose --profile cache up -d
```
- Redis cache for improved performance
- Session storage
- Rate limiting storage

### Docker Management Commands

```bash
# Build images
./docker-scripts.sh build-prod    # Production image
./docker-scripts.sh build-dev     # Development image

# Start services
./docker-scripts.sh start-prod    # Production
./docker-scripts.sh start-dev     # Development
./docker-scripts.sh start-proxy   # With Nginx
./docker-scripts.sh start-cache   # With Redis

# Monitoring
./docker-scripts.sh health        # Health check
./docker-scripts.sh stats         # Container stats
./docker-scripts.sh logs [service] # View logs

# Maintenance
./docker-scripts.sh backup        # Backup data
./docker-scripts.sh restore [file] # Restore data
./docker-scripts.sh cleanup       # Clean up resources

# Testing
./docker-scripts.sh test          # Run tests in container
```

### Data Persistence

Docker volumes are used for data persistence:

- `knowledge_base_data` - Production data
- `knowledge_base_data_dev` - Development data
- `redis_data` - Redis cache data

### Environment Configuration

Create `docker-compose.override.yml` for custom configuration:

```yaml
version: '3.8'
services:
  knowledge-base-api:
    environment:
      - NODE_ENV=production
      - PORT=3000
      - LOG_LEVEL=info
    volumes:
      - ./custom-config:/app/config
```

## 💻 Development

### Development Setup

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd knowledge-base-api
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Run tests in watch mode**
   ```bash
   npm run test:watch
   ```

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run dev:debug    # Start with debugging enabled

# Building
npm run build        # Build for production
npm run build:watch  # Build in watch mode

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:unit    # Run unit tests only
npm run test:integration # Run integration tests only

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run type-check   # TypeScript type checking

# Production
npm start            # Start production server
npm run start:prod   # Start with production environment
```

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes and test**
   ```bash
   npm run dev          # Start development server
   npm run test:watch   # Run tests in watch mode
   ```

3. **Ensure code quality**
   ```bash
   npm run lint         # Check for linting issues
   npm run format       # Format code
   npm run type-check   # Check TypeScript types
   npm test             # Run all tests
   ```

4. **Build and test production**
   ```bash
   npm run build        # Build for production
   npm start            # Test production build
   ```

### Hot Reload

The development server supports hot reload for:
- TypeScript source files
- Configuration changes
- Test files

### Debugging

#### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/index.js",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "runtimeArgs": ["--inspect"]
    }
  ]
}
```

#### Debug with Node.js Inspector

```bash
npm run dev:debug
# Open chrome://inspect in Chrome
```


## 🧪 Testing

### Test Structure

The project includes comprehensive testing at multiple levels:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test API endpoints and component interactions
- **Algorithm Tests**: Test custom algorithms and complex logic

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only

# Run tests in watch mode
npm run test:watch

# Run tests in Docker
./docker-scripts.sh test
```

### Test Coverage

The project maintains high test coverage:

- **Models**: 95%+ coverage
- **Services**: 90%+ coverage
- **Controllers**: 85%+ coverage
- **Algorithms**: 95%+ coverage
- **Overall**: 90%+ coverage

### Writing Tests

#### Unit Test Example

```typescript
// tests/unit/models/Topic.test.ts
import { Topic } from '../../../src/models/Topic';

describe('Topic Model', () => {
  it('should create a topic with required fields', () => {
    const topic = new Topic('Test Topic', 'Test content');
    
    expect(topic.name).toBe('Test Topic');
    expect(topic.content).toBe('Test content');
    expect(topic.version).toBe(1);
  });
});
```

#### Integration Test Example

```typescript
// tests/integration/topics.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('Topic API', () => {
  it('should create a new topic', async () => {
    const response = await request(app)
      .post('/api/topics')
      .set('x-user-id', testUser.id)
      .send({
        name: 'Test Topic',
        content: 'Test content'
      })
      .expect(201);

    expect(response.body.success).toBe(true);
  });
});
```

## 📁 Project Structure

```
knowledge-base-api/
├── src/                          # Source code
│   ├── algorithms/               # Custom algorithms
│   │   ├── TopicPathFinder.ts   # Shortest path algorithm
│   │   ├── TopicTreeTraversal.ts # Tree traversal algorithms
│   │   ├── TopicHierarchyAlgorithm.ts # Hierarchy operations
│   │   └── TopicSearchAlgorithm.ts # Search with relevance
│   ├── controllers/              # HTTP request handlers
│   │   ├── BaseController.ts     # Base controller with common functionality
│   │   ├── TopicController.ts    # Topic management endpoints
│   │   ├── ResourceController.ts # Resource management endpoints
│   │   └── UserController.ts     # User management endpoints
│   ├── middleware/               # Express middleware
│   │   ├── auth.ts              # Authentication & authorization
│   │   ├── errorHandler.ts      # Global error handling
│   │   ├── logging.ts           # Request/response logging
│   │   ├── notFoundHandler.ts   # 404 handler
│   │   └── validation.ts        # Input validation
│   ├── models/                   # Domain entities
│   │   ├── BaseEntity.ts        # Abstract base entity
│   │   ├── Topic.ts             # Topic entity with hierarchy
│   │   ├── Resource.ts          # Resource entity
│   │   └── User.ts              # User entity with roles
│   ├── repositories/             # Data access layer
│   │   ├── BaseRepository.ts    # Generic repository pattern
│   │   ├── TopicRepository.ts   # Topic data access
│   │   ├── ResourceRepository.ts # Resource data access
│   │   ├── UserRepository.ts    # User data access
│   │   └── DatabaseManager.ts   # Database coordination
│   ├── routes/                   # API route definitions
│   │   ├── topicRoutes.ts       # Topic API routes
│   │   ├── resourceRoutes.ts    # Resource API routes
│   │   └── userRoutes.ts        # User API routes
│   ├── services/                 # Business logic layer
│   │   ├── TopicService.ts      # Topic business logic
│   │   ├── ResourceService.ts   # Resource business logic
│   │   ├── UserService.ts       # User business logic
│   │   └── EventPublisher.ts    # Event handling (Observer pattern)
│   ├── types/                    # TypeScript type definitions
│   │   └── common.ts            # Common types and enums
│   ├── utils/                    # Utility functions
│   └── index.ts                 # Application entry point
├── tests/                        # Test files
│   ├── unit/                    # Unit tests
│   │   ├── models/              # Model tests
│   │   ├── services/            # Service tests
│   │   └── algorithms/          # Algorithm tests
│   ├── integration/             # Integration tests
│   │   └── topics.test.ts       # API endpoint tests
│   └── setup.ts                 # Test configuration
├── docker/                       # Docker configuration
│   ├── Dockerfile               # Production Docker image
│   ├── Dockerfile.dev           # Development Docker image
│   ├── docker-compose.yml       # Multi-service setup
│   └── nginx.conf               # Nginx configuration
├── docs/                         # Additional documentation
├── data/                         # JSON data storage (created at runtime)
├── logs/                         # Application logs (created at runtime)
├── package.json                  # Node.js dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── jest.config.js               # Jest testing configuration
├── docker-scripts.sh            # Docker management scripts
└── README.md                    # This file
```

## 🎨 Design Patterns

The project implements several advanced design patterns:

### Repository Pattern
```typescript
// Abstract repository interface
interface IRepository<T> {
  create(entity: T): Promise<T>;
  findById(id: string): Promise<T | null>;
  update(id: string, entity: T): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

// Concrete implementation
class TopicRepository extends BaseRepository<Topic> {
  // Topic-specific methods
  async findByParentId(parentId: string): Promise<Topic[]> {
    // Implementation
  }
}
```

### Observer Pattern
```typescript
// Event publisher for service events
class EventPublisher {
  private subscribers: Map<string, IEventSubscriber[]> = new Map();
  
  subscribe(event: string, subscriber: IEventSubscriber): void {
    // Implementation
  }
  
  publish(event: ServiceEvent): void {
    // Notify all subscribers
  }
}
```

### Strategy Pattern
```typescript
// User role-based permissions
class User {
  private permissionStrategy: IPermissionStrategy;
  
  constructor(role: UserRole) {
    this.permissionStrategy = PermissionStrategyFactory.create(role);
  }
  
  hasPermission(permission: string): boolean {
    return this.permissionStrategy.hasPermission(permission);
  }
}
```

### Composite Pattern
```typescript
// Hierarchical topic structure
class Topic {
  private children: string[] = [];
  
  addChild(child: Topic): void {
    this.children.push(child.id);
    child.parentId = this.id;
  }
  
  getAllDescendants(): Topic[] {
    // Recursive traversal of hierarchy
  }
}
```

### Factory Pattern
```typescript
// Service factory for dependency injection
class ServiceFactory {
  static createTopicService(): TopicService {
    const repository = new TopicRepository();
    const userRepository = new UserRepository();
    return new TopicService(repository, userRepository);
  }
}
```

## 🔍 Algorithms

### Custom Shortest Path Algorithm

Implements a custom shortest path finding algorithm for topic hierarchies:

```typescript
class TopicPathFinder {
  async findShortestPath(sourceId: string, targetId: string): Promise<string[] | null> {
    // Custom BFS-based algorithm for hierarchical structures
    // Handles bidirectional search and parent-child relationships
  }
}
```

**Features:**
- Bidirectional search for optimization
- Handles hierarchical relationships
- Returns detailed path information
- Supports distance calculations

### Tree Traversal Algorithms

Multiple traversal methods for topic hierarchies:

```typescript
class TopicTreeTraversal {
  async traverseDepthFirst(rootId: string): Promise<Topic[]>
  async traverseBreadthFirst(rootId: string): Promise<Topic[]>
  async traversePreOrder(rootId: string): Promise<Topic[]>
  async traversePostOrder(rootId: string): Promise<Topic[]>
}
```

### Advanced Search Algorithm

Relevance-based search with fuzzy matching:

```typescript
class TopicSearchAlgorithm {
  async searchWithRelevance(query: string, topics: Topic[]): Promise<SearchResult[]> {
    // Implements TF-IDF-like scoring
    // Supports fuzzy matching with Levenshtein distance
    // Returns ranked results with snippets
  }
}
```

**Features:**
- Relevance scoring based on content and title matches
- Fuzzy search with typo tolerance
- Search result highlighting
- Configurable search filters

### Hierarchy Analysis

Advanced hierarchy operations:

```typescript
class TopicHierarchyAlgorithm {
  async getRelationship(id1: string, id2: string): Promise<RelationshipInfo>
  async getHierarchyStatistics(rootId: string): Promise<HierarchyStats>
  async getCommonAncestor(id1: string, id2: string): Promise<Topic | null>
}
```

## ⚙️ Configuration

### Environment Variables

```env
# Server Configuration
NODE_ENV=development|production|test
PORT=3000
HOST=0.0.0.0

# Data Storage
DATA_DIR=./data
BACKUP_DIR=./backups

# Security
JWT_SECRET=your-jwt-secret
API_KEY=your-api-key
CORS_ORIGIN=*

# Logging
LOG_LEVEL=debug|info|warn|error
LOG_FILE=./logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Performance
CACHE_TTL=3600
MAX_PAYLOAD_SIZE=10mb

# Health Check
HEALTH_CHECK_INTERVAL=30000
```

### TypeScript Configuration

The project uses strict TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```


## 🤝 Contributing

We welcome contributions to the Knowledge Base API! Please follow these guidelines:

### Development Process

1. **Fork the repository**
   ```bash
   git fork <repository-url>
   git clone <your-fork-url>
   cd knowledge-base-api
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Set up development environment**
   ```bash
   npm install
   npm run dev
   ```

4. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed
   - Ensure all tests pass

5. **Test your changes**
   ```bash
   npm run lint          # Check code style
   npm run type-check    # Check TypeScript types
   npm test              # Run all tests
   npm run test:coverage # Check test coverage
   ```

6. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

7. **Push and create pull request**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

### Code Style Guidelines

- **TypeScript**: Use strict TypeScript with proper type annotations
- **Naming**: Use camelCase for variables/functions, PascalCase for classes
- **Comments**: Document complex logic and public APIs
- **Testing**: Maintain 90%+ test coverage
- **Commits**: Use conventional commit messages

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

Examples:
```
feat(topics): add version control for topics
fix(auth): resolve JWT token validation issue
docs(readme): update API documentation
test(algorithms): add tests for path finding algorithm
```

### Pull Request Guidelines

- **Title**: Clear and descriptive
- **Description**: Explain what changes were made and why
- **Tests**: Include tests for new functionality
- **Documentation**: Update relevant documentation
- **Breaking Changes**: Clearly mark any breaking changes

### Issue Reporting

When reporting issues, please include:

1. **Environment details**
   - Node.js version
   - Operating system
   - Docker version (if applicable)

2. **Steps to reproduce**
   - Clear step-by-step instructions
   - Sample code or API calls
   - Expected vs actual behavior

3. **Error messages**
   - Full error messages and stack traces
   - Log files (if relevant)

4. **Additional context**
   - Screenshots (if applicable)
   - Related issues or pull requests

### Feature Requests

For new features, please:

1. **Check existing issues** to avoid duplicates
2. **Describe the use case** and problem being solved
3. **Propose a solution** with implementation details
4. **Consider backwards compatibility**
5. **Discuss API design** for new endpoints

### Code Review Process

All contributions go through code review:

1. **Automated checks** must pass (tests, linting, type checking)
2. **Manual review** by maintainers
3. **Feedback incorporation** and iteration
4. **Final approval** and merge

### Development Setup for Contributors

```bash
# Clone your fork
git clone <your-fork-url>
cd knowledge-base-api

# Add upstream remote
git remote add upstream <original-repository-url>

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev

# Run tests in watch mode
npm run test:watch
```

### Architecture Decisions

When making significant changes:

1. **Discuss architecture** in issues before implementation
2. **Follow existing patterns** and design principles
3. **Consider performance** implications
4. **Maintain backwards compatibility** when possible
5. **Document design decisions** in code comments

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### MIT License

```
MIT License

Copyright (c) 2023 Knowledge Base API

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- **Node.js Community** for the excellent runtime and ecosystem
- **TypeScript Team** for bringing type safety to JavaScript
- **Express.js** for the robust web framework
- **Jest** for the comprehensive testing framework
- **Docker** for containerization technology
- **Open Source Community** for inspiration and best practices

## 📞 Support

If you need help or have questions:

1. **Check the documentation** in this README
2. **Search existing issues** on GitHub
3. **Create a new issue** with detailed information
4. **Join our community** discussions

## 🚀 What's Next?

Future enhancements planned:

- **GraphQL API** for flexible data querying
- **Real-time updates** with WebSocket support
- **Advanced caching** with Redis integration
- **Full-text search** with Elasticsearch
- **API versioning** for backwards compatibility
- **Microservices architecture** for scalability
- **Machine learning** for content recommendations
- **Multi-tenant support** for SaaS deployment

---

**Built with ❤️ by the Knowledge Base API Team**

*Happy coding! 🎉*

