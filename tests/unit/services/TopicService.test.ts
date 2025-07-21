import { TopicService } from '../../../src/services/TopicService';
import { TopicRepository } from '../../../src/repositories/TopicRepository';
import { UserRepository } from '../../../src/repositories/UserRepository';
import { Topic } from '../../../src/models/Topic';
import { User } from '../../../src/models/User';
import { UserRole } from '../../../src/types/common';

// Mock repositories
jest.mock('../../../src/repositories/TopicRepository');
jest.mock('../../../src/repositories/UserRepository');

describe('TopicService', () => {
  let topicService: TopicService;
  let mockTopicRepository: jest.Mocked<TopicRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockTopicRepository = new TopicRepository() as jest.Mocked<TopicRepository>;
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    topicService = new TopicService(mockTopicRepository, mockUserRepository);
  });

  describe('create', () => {
    it('should create a new topic successfully', async () => {
      const topicData = {
        name: 'Test Topic',
        content: 'Test content'
      };

      const expectedTopic = new Topic(topicData.name, topicData.content);
      mockTopicRepository.create.mockResolvedValue(expectedTopic);

      const result = await topicService.create(topicData);

      expect(mockTopicRepository.create).toHaveBeenCalledWith(expect.any(Topic));
      expect(result).toEqual(expectedTopic);
    });

    it('should create a topic with parent', async () => {
      const parentTopic = new Topic('Parent Topic', 'Parent content');
      const topicData = {
        name: 'Child Topic',
        content: 'Child content',
        parentId: parentTopic.id
      };

      mockTopicRepository.findById.mockResolvedValue(parentTopic);
      mockTopicRepository.create.mockResolvedValue(expect.any(Topic));

      await topicService.create(topicData);

      expect(mockTopicRepository.findById).toHaveBeenCalledWith(parentTopic.id);
      expect(mockTopicRepository.create).toHaveBeenCalled();
    });

    it('should throw error if parent topic does not exist', async () => {
      const topicData = {
        name: 'Child Topic',
        content: 'Child content',
        parentId: 'non-existent-id'
      };

      mockTopicRepository.findById.mockResolvedValue(null);

      await expect(topicService.create(topicData)).rejects.toThrow('Parent topic not found');
    });

    it('should validate topic data before creation', async () => {
      const invalidTopicData = {
        name: '',
        content: 'Test content'
      };

      await expect(topicService.create(invalidTopicData)).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should return topic by id for authorized user', async () => {
      const topic = new Topic('Test Topic', 'Test content');
      const user = new User('Test User', 'test@example.com', UserRole.VIEWER);

      mockTopicRepository.findById.mockResolvedValue(topic);
      mockUserRepository.findById.mockResolvedValue(user);

      const result = await topicService.getById(topic.id, user.id);

      expect(result).toEqual(topic);
      expect(mockTopicRepository.findById).toHaveBeenCalledWith(topic.id);
    });

    it('should return null if topic not found', async () => {
      const user = new User('Test User', 'test@example.com', UserRole.VIEWER);

      mockTopicRepository.findById.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue(user);

      const result = await topicService.getById('non-existent-id', user.id);

      expect(result).toBeNull();
    });

    it('should throw error if user not found', async () => {
      const topic = new Topic('Test Topic', 'Test content');

      mockTopicRepository.findById.mockResolvedValue(topic);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(topicService.getById(topic.id, 'non-existent-user')).rejects.toThrow('User not found');
    });
  });

  describe('update', () => {
    it('should update topic and create new version', async () => {
      const originalTopic = new Topic('Original Topic', 'Original content');
      const user = new User('Test User', 'test@example.com', UserRole.EDITOR);
      const updateData = {
        name: 'Updated Topic',
        content: 'Updated content'
      };

      mockTopicRepository.findById.mockResolvedValue(originalTopic);
      mockUserRepository.findById.mockResolvedValue(user);
      mockTopicRepository.update.mockResolvedValue(expect.any(Topic));

      const result = await topicService.update(originalTopic.id, updateData, user.id);

      expect(mockTopicRepository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error if user lacks permission', async () => {
      const topic = new Topic('Test Topic', 'Test content');
      const user = new User('Test User', 'test@example.com', UserRole.VIEWER);
      const updateData = { name: 'Updated Topic' };

      mockTopicRepository.findById.mockResolvedValue(topic);
      mockUserRepository.findById.mockResolvedValue(user);

      await expect(topicService.update(topic.id, updateData, user.id)).rejects.toThrow('Insufficient permissions');
    });

    it('should return null if topic not found', async () => {
      const user = new User('Test User', 'test@example.com', UserRole.EDITOR);
      const updateData = { name: 'Updated Topic' };

      mockTopicRepository.findById.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue(user);

      const result = await topicService.update('non-existent-id', updateData, user.id);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete topic for authorized user', async () => {
      const topic = new Topic('Test Topic', 'Test content');
      const user = new User('Test User', 'test@example.com', UserRole.ADMIN);

      mockTopicRepository.findById.mockResolvedValue(topic);
      mockUserRepository.findById.mockResolvedValue(user);
      mockTopicRepository.delete.mockResolvedValue(true);

      const result = await topicService.delete(topic.id, user.id);

      expect(result).toBe(true);
      expect(mockTopicRepository.delete).toHaveBeenCalledWith(topic.id);
    });

    it('should throw error if user lacks permission', async () => {
      const topic = new Topic('Test Topic', 'Test content');
      const user = new User('Test User', 'test@example.com', UserRole.VIEWER);

      mockTopicRepository.findById.mockResolvedValue(topic);
      mockUserRepository.findById.mockResolvedValue(user);

      await expect(topicService.delete(topic.id, user.id)).rejects.toThrow('Insufficient permissions');
    });

    it('should return false if topic not found', async () => {
      const user = new User('Test User', 'test@example.com', UserRole.ADMIN);

      mockTopicRepository.findById.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue(user);

      const result = await topicService.delete('non-existent-id', user.id);

      expect(result).toBe(false);
    });
  });

  describe('getVersionHistory', () => {
    it('should return version history for authorized user', async () => {
      const topic = new Topic('Test Topic', 'Test content');
      const user = new User('Test User', 'test@example.com', UserRole.VIEWER);
      const versions = [topic];

      mockTopicRepository.findById.mockResolvedValue(topic);
      mockUserRepository.findById.mockResolvedValue(user);
      mockTopicRepository.getVersionHistory.mockResolvedValue(versions);

      const result = await topicService.getVersionHistory(topic.id, user.id);

      expect(result).toEqual(versions);
      expect(mockTopicRepository.getVersionHistory).toHaveBeenCalledWith(topic.id);
    });

    it('should return empty array if topic not found', async () => {
      const user = new User('Test User', 'test@example.com', UserRole.VIEWER);

      mockTopicRepository.findById.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue(user);

      const result = await topicService.getVersionHistory('non-existent-id', user.id);

      expect(result).toEqual([]);
    });
  });

  describe('getVersion', () => {
    it('should return specific version for authorized user', async () => {
      const topic = new Topic('Test Topic', 'Test content');
      const user = new User('Test User', 'test@example.com', UserRole.VIEWER);

      mockTopicRepository.findById.mockResolvedValue(topic);
      mockUserRepository.findById.mockResolvedValue(user);
      mockTopicRepository.getVersion.mockResolvedValue(topic);

      const result = await topicService.getVersion(topic.id, 1, user.id);

      expect(result).toEqual(topic);
      expect(mockTopicRepository.getVersion).toHaveBeenCalledWith(topic.id, 1);
    });

    it('should return null if version not found', async () => {
      const topic = new Topic('Test Topic', 'Test content');
      const user = new User('Test User', 'test@example.com', UserRole.VIEWER);

      mockTopicRepository.findById.mockResolvedValue(topic);
      mockUserRepository.findById.mockResolvedValue(user);
      mockTopicRepository.getVersion.mockResolvedValue(null);

      const result = await topicService.getVersion(topic.id, 999, user.id);

      expect(result).toBeNull();
    });
  });

  describe('searchByContent', () => {
    it('should search topics by content', async () => {
      const topics = [
        new Topic('Topic 1', 'Content with search term'),
        new Topic('Topic 2', 'Another content with search term')
      ];
      const user = new User('Test User', 'test@example.com', UserRole.VIEWER);

      mockUserRepository.findById.mockResolvedValue(user);
      mockTopicRepository.searchByContent.mockResolvedValue(topics);

      const result = await topicService.searchByContent('search term', user.id);

      expect(result).toEqual(topics);
      expect(mockTopicRepository.searchByContent).toHaveBeenCalledWith('search term');
    });

    it('should return empty array for empty query', async () => {
      const user = new User('Test User', 'test@example.com', UserRole.VIEWER);

      mockUserRepository.findById.mockResolvedValue(user);

      const result = await topicService.searchByContent('', user.id);

      expect(result).toEqual([]);
    });
  });

  describe('getRootTopics', () => {
    it('should return root topics for authorized user', async () => {
      const rootTopics = [
        new Topic('Root Topic 1', 'Root content 1'),
        new Topic('Root Topic 2', 'Root content 2')
      ];
      const user = new User('Test User', 'test@example.com', UserRole.VIEWER);

      mockUserRepository.findById.mockResolvedValue(user);
      mockTopicRepository.findRootTopics.mockResolvedValue(rootTopics);

      const result = await topicService.getRootTopics(user.id);

      expect(result).toEqual(rootTopics);
      expect(mockTopicRepository.findRootTopics).toHaveBeenCalled();
    });
  });

  describe('getChildren', () => {
    it('should return children topics for authorized user', async () => {
      const parentTopic = new Topic('Parent Topic', 'Parent content');
      const childTopics = [
        new Topic('Child Topic 1', 'Child content 1'),
        new Topic('Child Topic 2', 'Child content 2')
      ];
      const user = new User('Test User', 'test@example.com', UserRole.VIEWER);

      mockTopicRepository.findById.mockResolvedValue(parentTopic);
      mockUserRepository.findById.mockResolvedValue(user);
      mockTopicRepository.findByParentId.mockResolvedValue(childTopics);

      const result = await topicService.getChildren(parentTopic.id, user.id);

      expect(result).toEqual(childTopics);
      expect(mockTopicRepository.findByParentId).toHaveBeenCalledWith(parentTopic.id);
    });

    it('should return empty array if parent not found', async () => {
      const user = new User('Test User', 'test@example.com', UserRole.VIEWER);

      mockTopicRepository.findById.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue(user);

      const result = await topicService.getChildren('non-existent-id', user.id);

      expect(result).toEqual([]);
    });
  });

  describe('moveToParent', () => {
    it('should move topic to new parent for authorized user', async () => {
      const topic = new Topic('Test Topic', 'Test content');
      const newParent = new Topic('New Parent', 'New parent content');
      const user = new User('Test User', 'test@example.com', UserRole.EDITOR);

      mockTopicRepository.findById
        .mockResolvedValueOnce(topic)
        .mockResolvedValueOnce(newParent);
      mockUserRepository.findById.mockResolvedValue(user);
      mockTopicRepository.update.mockResolvedValue(topic);

      const result = await topicService.moveToParent(topic.id, newParent.id, user.id);

      expect(result).toBeDefined();
      expect(mockTopicRepository.update).toHaveBeenCalled();
    });

    it('should throw error if user lacks permission', async () => {
      const topic = new Topic('Test Topic', 'Test content');
      const newParent = new Topic('New Parent', 'New parent content');
      const user = new User('Test User', 'test@example.com', UserRole.VIEWER);

      mockTopicRepository.findById
        .mockResolvedValueOnce(topic)
        .mockResolvedValueOnce(newParent);
      mockUserRepository.findById.mockResolvedValue(user);

      await expect(topicService.moveToParent(topic.id, newParent.id, user.id))
        .rejects.toThrow('Insufficient permissions');
    });

    it('should return null if topic not found', async () => {
      const user = new User('Test User', 'test@example.com', UserRole.EDITOR);

      mockTopicRepository.findById.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue(user);

      const result = await topicService.moveToParent('non-existent-id', 'parent-id', user.id);

      expect(result).toBeNull();
    });

    it('should throw error if new parent not found', async () => {
      const topic = new Topic('Test Topic', 'Test content');
      const user = new User('Test User', 'test@example.com', UserRole.EDITOR);

      mockTopicRepository.findById
        .mockResolvedValueOnce(topic)
        .mockResolvedValueOnce(null);
      mockUserRepository.findById.mockResolvedValue(user);

      await expect(topicService.moveToParent(topic.id, 'non-existent-parent', user.id))
        .rejects.toThrow('New parent topic not found');
    });
  });

  describe('getStatistics', () => {
    it('should return topic statistics for authorized user', async () => {
      const user = new User('Test User', 'test@example.com', UserRole.VIEWER);
      const expectedStats = {
        totalTopics: 10,
        rootTopics: 3,
        averageDepth: 2.5,
        totalVersions: 25
      };

      mockUserRepository.findById.mockResolvedValue(user);
      mockTopicRepository.getStatistics.mockResolvedValue(expectedStats);

      const result = await topicService.getStatistics(user.id);

      expect(result).toEqual(expectedStats);
      expect(mockTopicRepository.getStatistics).toHaveBeenCalled();
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple topics for authorized user', async () => {
      const topicIds = ['id1', 'id2', 'id3'];
      const user = new User('Test User', 'test@example.com', UserRole.ADMIN);

      mockUserRepository.findById.mockResolvedValue(user);
      mockTopicRepository.bulkDelete.mockResolvedValue({
        deletedCount: 3,
        failedIds: []
      });

      const result = await topicService.bulkDelete(topicIds, user.id);

      expect(result.deletedCount).toBe(3);
      expect(result.failedIds).toEqual([]);
      expect(mockTopicRepository.bulkDelete).toHaveBeenCalledWith(topicIds);
    });

    it('should throw error if user lacks permission', async () => {
      const topicIds = ['id1', 'id2', 'id3'];
      const user = new User('Test User', 'test@example.com', UserRole.VIEWER);

      mockUserRepository.findById.mockResolvedValue(user);

      await expect(topicService.bulkDelete(topicIds, user.id))
        .rejects.toThrow('Insufficient permissions');
    });
  });
});

