import request from 'supertest';
import express from 'express';
import { DatabaseManager } from '../../src/repositories/DatabaseManager';
import { Topic } from '../../src/models/Topic';
import { User } from '../../src/models/User';
import { UserRole } from '../../src/types/common';
import topicRoutes from '../../src/routes/topicRoutes';
import { errorHandler } from '../../src/middleware/errorHandler';

describe('Topic API Integration Tests', () => {
  let app: express.Application;
  let db: DatabaseManager;
  let testUser: User;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/topics', topicRoutes);
    app.use(errorHandler);

    // Initialize database
    db = DatabaseManager.getInstance();
    await db.initialize();

    // Create test user
    testUser = new User('Test User', 'test@example.com', UserRole.ADMIN);
    await db.users.create(testUser);
  });

  beforeEach(async () => {
    // Clear topics before each test
    await db.topics.clear();
  });

  afterAll(async () => {
    await db.clearAll();
  });

  describe('POST /api/topics', () => {
    it('should create a new topic', async () => {
      const topicData = {
        name: 'Test Topic',
        content: 'Test content'
      };

      const response = await request(app)
        .post('/api/topics')
        .set('x-user-id', testUser.id)
        .send(topicData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(topicData.name);
      expect(response.body.data.content).toBe(topicData.content);
      expect(response.body.data.version).toBe(1);
    });

    it('should create a topic with parent', async () => {
      // Create parent topic first
      const parentTopic = new Topic('Parent Topic', 'Parent content');
      await db.topics.create(parentTopic);

      const topicData = {
        name: 'Child Topic',
        content: 'Child content',
        parentId: parentTopic.id
      };

      const response = await request(app)
        .post('/api/topics')
        .set('x-user-id', testUser.id)
        .send(topicData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.parentId).toBe(parentTopic.id);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        name: '', // Empty name
        content: 'Test content'
      };

      const response = await request(app)
        .post('/api/topics')
        .set('x-user-id', testUser.id)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should return 404 for non-existent parent', async () => {
      const topicData = {
        name: 'Child Topic',
        content: 'Child content',
        parentId: 'non-existent-id'
      };

      const response = await request(app)
        .post('/api/topics')
        .set('x-user-id', testUser.id)
        .send(topicData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Parent topic not found');
    });
  });

  describe('GET /api/topics', () => {
    it('should return all topics with pagination', async () => {
      // Create test topics
      const topics = [
        new Topic('Topic 1', 'Content 1'),
        new Topic('Topic 2', 'Content 2'),
        new Topic('Topic 3', 'Content 3')
      ];

      for (const topic of topics) {
        await db.topics.create(topic);
      }

      const response = await request(app)
        .get('/api/topics')
        .set('x-user-id', testUser.id)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(3);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should filter topics by name', async () => {
      const topics = [
        new Topic('JavaScript Topic', 'JS content'),
        new Topic('Python Topic', 'Python content'),
        new Topic('Java Topic', 'Java content')
      ];

      for (const topic of topics) {
        await db.topics.create(topic);
      }

      const response = await request(app)
        .get('/api/topics')
        .set('x-user-id', testUser.id)
        .query({ name: 'JavaScript' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].name).toBe('JavaScript Topic');
    });
  });

  describe('GET /api/topics/:id', () => {
    it('should return topic by id', async () => {
      const topic = new Topic('Test Topic', 'Test content');
      await db.topics.create(topic);

      const response = await request(app)
        .get(`/api/topics/${topic.id}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(topic.id);
      expect(response.body.data.name).toBe(topic.name);
    });

    it('should return 404 for non-existent topic', async () => {
      const response = await request(app)
        .get('/api/topics/non-existent-id')
        .set('x-user-id', testUser.id)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Topic not found');
    });
  });

  describe('PUT /api/topics/:id', () => {
    it('should update topic and create new version', async () => {
      const topic = new Topic('Original Topic', 'Original content');
      await db.topics.create(topic);

      const updateData = {
        name: 'Updated Topic',
        content: 'Updated content'
      };

      const response = await request(app)
        .put(`/api/topics/${topic.id}`)
        .set('x-user-id', testUser.id)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.content).toBe(updateData.content);
      expect(response.body.data.version).toBe(2);
    });

    it('should return 404 for non-existent topic', async () => {
      const updateData = {
        name: 'Updated Topic'
      };

      const response = await request(app)
        .put('/api/topics/non-existent-id')
        .set('x-user-id', testUser.id)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/topics/:id', () => {
    it('should delete topic', async () => {
      const topic = new Topic('Test Topic', 'Test content');
      await db.topics.create(topic);

      const response = await request(app)
        .delete(`/api/topics/${topic.id}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify topic is deleted
      const deletedTopic = await db.topics.findById(topic.id);
      expect(deletedTopic).toBeNull();
    });

    it('should return 404 for non-existent topic', async () => {
      const response = await request(app)
        .delete('/api/topics/non-existent-id')
        .set('x-user-id', testUser.id)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/topics/:id/versions', () => {
    it('should return version history', async () => {
      const topic = new Topic('Test Topic', 'Test content');
      await db.topics.create(topic);

      // Create a new version
      const updatedTopic = topic.createNewVersion('Updated content', 'Updated Topic');
      await db.topics.update(topic.id, updatedTopic);

      const response = await request(app)
        .get(`/api/topics/${topic.id}/versions`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/topics/:id/versions/:version', () => {
    it('should return specific version', async () => {
      const topic = new Topic('Test Topic', 'Test content');
      await db.topics.create(topic);

      const response = await request(app)
        .get(`/api/topics/${topic.id}/versions/1`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe(1);
    });

    it('should return 404 for non-existent version', async () => {
      const topic = new Topic('Test Topic', 'Test content');
      await db.topics.create(topic);

      const response = await request(app)
        .get(`/api/topics/${topic.id}/versions/999`)
        .set('x-user-id', testUser.id)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/topics/:id/hierarchy', () => {
    it('should return topic hierarchy', async () => {
      const parentTopic = new Topic('Parent Topic', 'Parent content');
      const childTopic = new Topic('Child Topic', 'Child content', parentTopic.id);
      
      await db.topics.create(parentTopic);
      await db.topics.create(childTopic);

      const response = await request(app)
        .get(`/api/topics/${parentTopic.id}/hierarchy`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(parentTopic.id);
      expect(response.body.data.children).toHaveLength(1);
    });
  });

  describe('GET /api/topics/search', () => {
    it('should search topics by content', async () => {
      const topics = [
        new Topic('JavaScript Guide', 'Learn JavaScript programming'),
        new Topic('Python Tutorial', 'Learn Python programming'),
        new Topic('Java Basics', 'Java programming fundamentals')
      ];

      for (const topic of topics) {
        await db.topics.create(topic);
      }

      const response = await request(app)
        .get('/api/topics/search')
        .set('x-user-id', testUser.id)
        .query({ q: 'JavaScript' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].topic.name).toBe('JavaScript Guide');
    });

    it('should return 400 for empty query', async () => {
      const response = await request(app)
        .get('/api/topics/search')
        .set('x-user-id', testUser.id)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Search query is required');
    });
  });

  describe('GET /api/topics/:id1/path/:id2', () => {
    it('should find shortest path between topics', async () => {
      const parentTopic = new Topic('Parent Topic', 'Parent content');
      const childTopic = new Topic('Child Topic', 'Child content', parentTopic.id);
      
      await db.topics.create(parentTopic);
      await db.topics.create(childTopic);

      const response = await request(app)
        .get(`/api/topics/${parentTopic.id}/path/${childTopic.id}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.path).toEqual([parentTopic.id, childTopic.id]);
      expect(response.body.data.distance).toBe(1);
    });

    it('should return null for no path', async () => {
      const topic1 = new Topic('Topic 1', 'Content 1');
      const topic2 = new Topic('Topic 2', 'Content 2');
      
      await db.topics.create(topic1);
      await db.topics.create(topic2);

      const response = await request(app)
        .get(`/api/topics/${topic1.id}/path/${topic2.id}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });
  });

  describe('POST /api/topics/:id/move', () => {
    it('should move topic to new parent', async () => {
      const oldParent = new Topic('Old Parent', 'Old parent content');
      const newParent = new Topic('New Parent', 'New parent content');
      const childTopic = new Topic('Child Topic', 'Child content', oldParent.id);
      
      await db.topics.create(oldParent);
      await db.topics.create(newParent);
      await db.topics.create(childTopic);

      const response = await request(app)
        .post(`/api/topics/${childTopic.id}/move`)
        .set('x-user-id', testUser.id)
        .send({ parentId: newParent.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.parentId).toBe(newParent.id);
    });
  });

  describe('GET /api/topics/statistics', () => {
    it('should return topic statistics', async () => {
      const topics = [
        new Topic('Topic 1', 'Content 1'),
        new Topic('Topic 2', 'Content 2'),
        new Topic('Topic 3', 'Content 3')
      ];

      for (const topic of topics) {
        await db.topics.create(topic);
      }

      const response = await request(app)
        .get('/api/topics/statistics')
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalTopics).toBe(3);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without user ID header', async () => {
      const response = await request(app)
        .get('/api/topics')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('User ID header is required');
    });

    it('should return 401 for invalid user ID', async () => {
      const response = await request(app)
        .get('/api/topics')
        .set('x-user-id', 'invalid-user-id')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid user ID');
    });

    it('should return 403 for insufficient permissions', async () => {
      // Create a viewer user
      const viewerUser = new User('Viewer User', 'viewer@example.com', UserRole.VIEWER);
      await db.users.create(viewerUser);

      const topicData = {
        name: 'Test Topic',
        content: 'Test content'
      };

      const response = await request(app)
        .post('/api/topics')
        .set('x-user-id', viewerUser.id)
        .send(topicData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });
});

