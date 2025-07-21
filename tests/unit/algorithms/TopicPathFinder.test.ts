import { TopicPathFinder } from '../../../src/algorithms/TopicPathFinder';
import { TopicRepository } from '../../../src/repositories/TopicRepository';
import { Topic } from '../../../src/models/Topic';

// Mock repository
jest.mock('../../../src/repositories/TopicRepository');

describe('TopicPathFinder', () => {
  let pathFinder: TopicPathFinder;
  let mockTopicRepository: jest.Mocked<TopicRepository>;

  beforeEach(() => {
    mockTopicRepository = new TopicRepository() as jest.Mocked<TopicRepository>;
    pathFinder = new TopicPathFinder(mockTopicRepository);
  });

  describe('findShortestPath', () => {
    it('should find direct path between parent and child', async () => {
      const parentTopic = new Topic('Parent', 'Parent content');
      const childTopic = new Topic('Child', 'Child content', parentTopic.id);

      mockTopicRepository.findById
        .mockResolvedValueOnce(parentTopic)
        .mockResolvedValueOnce(childTopic);
      mockTopicRepository.findByParentId
        .mockResolvedValueOnce([childTopic])
        .mockResolvedValueOnce([]);

      const path = await pathFinder.findShortestPath(parentTopic.id, childTopic.id);

      expect(path).toEqual([parentTopic.id, childTopic.id]);
    });

    it('should find path between siblings through parent', async () => {
      const parentTopic = new Topic('Parent', 'Parent content');
      const child1 = new Topic('Child 1', 'Child 1 content', parentTopic.id);
      const child2 = new Topic('Child 2', 'Child 2 content', parentTopic.id);

      mockTopicRepository.findById
        .mockImplementation(async (id: string) => {
          if (id === parentTopic.id) return parentTopic;
          if (id === child1.id) return child1;
          if (id === child2.id) return child2;
          return null;
        });

      mockTopicRepository.findByParentId
        .mockImplementation(async (parentId: string) => {
          if (parentId === parentTopic.id) return [child1, child2];
          return [];
        });

      const path = await pathFinder.findShortestPath(child1.id, child2.id);

      expect(path).toEqual([child1.id, parentTopic.id, child2.id]);
    });

    it('should return null if no path exists', async () => {
      const topic1 = new Topic('Topic 1', 'Content 1');
      const topic2 = new Topic('Topic 2', 'Content 2');

      mockTopicRepository.findById
        .mockImplementation(async (id: string) => {
          if (id === topic1.id) return topic1;
          if (id === topic2.id) return topic2;
          return null;
        });

      mockTopicRepository.findByParentId.mockResolvedValue([]);

      const path = await pathFinder.findShortestPath(topic1.id, topic2.id);

      expect(path).toBeNull();
    });

    it('should return single topic path for same source and target', async () => {
      const topic = new Topic('Topic', 'Content');

      mockTopicRepository.findById.mockResolvedValue(topic);

      const path = await pathFinder.findShortestPath(topic.id, topic.id);

      expect(path).toEqual([topic.id]);
    });

    it('should handle complex hierarchy paths', async () => {
      // Create a hierarchy: Root -> A -> B -> C
      //                         -> D -> E
      const root = new Topic('Root', 'Root content');
      const topicA = new Topic('A', 'A content', root.id);
      const topicB = new Topic('B', 'B content', topicA.id);
      const topicC = new Topic('C', 'C content', topicB.id);
      const topicD = new Topic('D', 'D content', root.id);
      const topicE = new Topic('E', 'E content', topicD.id);

      mockTopicRepository.findById
        .mockImplementation(async (id: string) => {
          const topics = [root, topicA, topicB, topicC, topicD, topicE];
          return topics.find(t => t.id === id) || null;
        });

      mockTopicRepository.findByParentId
        .mockImplementation(async (parentId: string) => {
          if (parentId === root.id) return [topicA, topicD];
          if (parentId === topicA.id) return [topicB];
          if (parentId === topicB.id) return [topicC];
          if (parentId === topicD.id) return [topicE];
          return [];
        });

      // Find path from C to E (should go through B, A, Root, D)
      const path = await pathFinder.findShortestPath(topicC.id, topicE.id);

      expect(path).toEqual([topicC.id, topicB.id, topicA.id, root.id, topicD.id, topicE.id]);
    });
  });

  describe('getDetailedPath', () => {
    it('should return detailed path information', async () => {
      const parentTopic = new Topic('Parent', 'Parent content');
      const childTopic = new Topic('Child', 'Child content', parentTopic.id);

      mockTopicRepository.findById
        .mockImplementation(async (id: string) => {
          if (id === parentTopic.id) return parentTopic;
          if (id === childTopic.id) return childTopic;
          return null;
        });

      mockTopicRepository.findByParentId
        .mockImplementation(async (parentId: string) => {
          if (parentId === parentTopic.id) return [childTopic];
          return [];
        });

      const result = await pathFinder.getDetailedPath(parentTopic.id, childTopic.id);

      expect(result).toBeDefined();
      expect(result!.path).toEqual([parentTopic.id, childTopic.id]);
      expect(result!.distance).toBe(1);
      expect(result!.topics).toHaveLength(2);
      expect(result!.topics[0]).toEqual(parentTopic);
      expect(result!.topics[1]).toEqual(childTopic);
    });

    it('should return null if no path exists', async () => {
      const topic1 = new Topic('Topic 1', 'Content 1');
      const topic2 = new Topic('Topic 2', 'Content 2');

      mockTopicRepository.findById
        .mockImplementation(async (id: string) => {
          if (id === topic1.id) return topic1;
          if (id === topic2.id) return topic2;
          return null;
        });

      mockTopicRepository.findByParentId.mockResolvedValue([]);

      const result = await pathFinder.getDetailedPath(topic1.id, topic2.id);

      expect(result).toBeNull();
    });
  });

  describe('findAllPaths', () => {
    it('should find all possible paths between topics', async () => {
      // Create a simple diamond structure
      const root = new Topic('Root', 'Root content');
      const left = new Topic('Left', 'Left content', root.id);
      const right = new Topic('Right', 'Right content', root.id);
      const bottom = new Topic('Bottom', 'Bottom content');
      
      // Add connections to create multiple paths
      left.addChild(bottom);
      right.addChild(bottom);

      mockTopicRepository.findById
        .mockImplementation(async (id: string) => {
          const topics = [root, left, right, bottom];
          return topics.find(t => t.id === id) || null;
        });

      mockTopicRepository.findByParentId
        .mockImplementation(async (parentId: string) => {
          if (parentId === root.id) return [left, right];
          if (parentId === left.id) return [bottom];
          if (parentId === right.id) return [bottom];
          return [];
        });

      const paths = await pathFinder.findAllPaths(root.id, bottom.id);

      expect(paths).toHaveLength(2);
      expect(paths).toContainEqual([root.id, left.id, bottom.id]);
      expect(paths).toContainEqual([root.id, right.id, bottom.id]);
    });

    it('should limit number of paths found', async () => {
      const root = new Topic('Root', 'Root content');
      const child = new Topic('Child', 'Child content', root.id);

      mockTopicRepository.findById
        .mockImplementation(async (id: string) => {
          if (id === root.id) return root;
          if (id === child.id) return child;
          return null;
        });

      mockTopicRepository.findByParentId
        .mockImplementation(async (parentId: string) => {
          if (parentId === root.id) return [child];
          return [];
        });

      const paths = await pathFinder.findAllPaths(root.id, child.id, 1);

      expect(paths).toHaveLength(1);
      expect(paths[0]).toEqual([root.id, child.id]);
    });
  });

  describe('findTopicsWithinDistance', () => {
    it('should find all topics within specified distance', async () => {
      const center = new Topic('Center', 'Center content');
      const distance1 = new Topic('Distance1', 'Distance1 content', center.id);
      const distance2 = new Topic('Distance2', 'Distance2 content', distance1.id);

      mockTopicRepository.findById
        .mockImplementation(async (id: string) => {
          const topics = [center, distance1, distance2];
          return topics.find(t => t.id === id) || null;
        });

      mockTopicRepository.findByParentId
        .mockImplementation(async (parentId: string) => {
          if (parentId === center.id) return [distance1];
          if (parentId === distance1.id) return [distance2];
          return [];
        });

      mockTopicRepository.findAll.mockResolvedValue([center, distance1, distance2]);

      const nearbyTopics = await pathFinder.findTopicsWithinDistance(center.id, 2);

      expect(nearbyTopics).toHaveLength(3); // center, distance1, distance2
      expect(nearbyTopics.map(t => t.topic.id)).toContain(center.id);
      expect(nearbyTopics.map(t => t.topic.id)).toContain(distance1.id);
      expect(nearbyTopics.map(t => t.topic.id)).toContain(distance2.id);
    });

    it('should respect distance limit', async () => {
      const center = new Topic('Center', 'Center content');
      const distance1 = new Topic('Distance1', 'Distance1 content', center.id);
      const distance2 = new Topic('Distance2', 'Distance2 content', distance1.id);

      mockTopicRepository.findById
        .mockImplementation(async (id: string) => {
          const topics = [center, distance1, distance2];
          return topics.find(t => t.id === id) || null;
        });

      mockTopicRepository.findByParentId
        .mockImplementation(async (parentId: string) => {
          if (parentId === center.id) return [distance1];
          if (parentId === distance1.id) return [distance2];
          return [];
        });

      mockTopicRepository.findAll.mockResolvedValue([center, distance1, distance2]);

      const nearbyTopics = await pathFinder.findTopicsWithinDistance(center.id, 1);

      expect(nearbyTopics).toHaveLength(2); // center, distance1 only
      expect(nearbyTopics.map(t => t.topic.id)).toContain(center.id);
      expect(nearbyTopics.map(t => t.topic.id)).toContain(distance1.id);
      expect(nearbyTopics.map(t => t.topic.id)).not.toContain(distance2.id);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate correct distance between topics', async () => {
      const topic1 = new Topic('Topic 1', 'Content 1');
      const topic2 = new Topic('Topic 2', 'Content 2', topic1.id);
      const topic3 = new Topic('Topic 3', 'Content 3', topic2.id);

      mockTopicRepository.findById
        .mockImplementation(async (id: string) => {
          const topics = [topic1, topic2, topic3];
          return topics.find(t => t.id === id) || null;
        });

      mockTopicRepository.findByParentId
        .mockImplementation(async (parentId: string) => {
          if (parentId === topic1.id) return [topic2];
          if (parentId === topic2.id) return [topic3];
          return [];
        });

      const distance = await pathFinder.calculateDistance(topic1.id, topic3.id);

      expect(distance).toBe(2);
    });

    it('should return -1 if no path exists', async () => {
      const topic1 = new Topic('Topic 1', 'Content 1');
      const topic2 = new Topic('Topic 2', 'Content 2');

      mockTopicRepository.findById
        .mockImplementation(async (id: string) => {
          if (id === topic1.id) return topic1;
          if (id === topic2.id) return topic2;
          return null;
        });

      mockTopicRepository.findByParentId.mockResolvedValue([]);

      const distance = await pathFinder.calculateDistance(topic1.id, topic2.id);

      expect(distance).toBe(-1);
    });

    it('should return 0 for same topic', async () => {
      const topic = new Topic('Topic', 'Content');

      mockTopicRepository.findById.mockResolvedValue(topic);

      const distance = await pathFinder.calculateDistance(topic.id, topic.id);

      expect(distance).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockTopicRepository.findById.mockRejectedValue(new Error('Database error'));

      await expect(pathFinder.findShortestPath('id1', 'id2')).rejects.toThrow('Database error');
    });

    it('should handle non-existent topics', async () => {
      mockTopicRepository.findById.mockResolvedValue(null);

      const path = await pathFinder.findShortestPath('non-existent-1', 'non-existent-2');

      expect(path).toBeNull();
    });
  });
});

