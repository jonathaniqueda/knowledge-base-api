import { Topic } from '../../../src/models/Topic';

describe('Topic Model', () => {
  describe('Constructor', () => {
    it('should create a topic with required fields', () => {
      const topic = new Topic('Test Topic', 'Test content');
      
      expect(topic.name).toBe('Test Topic');
      expect(topic.content).toBe('Test content');
      expect(topic.version).toBe(1);
      expect(topic.parentId).toBeUndefined();
      expect(topic.children).toEqual([]);
      expect(topic.id).toBeDefined();
      expect(topic.createdAt).toBeInstanceOf(Date);
      expect(topic.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a topic with parent', () => {
      const parentId = 'parent-id';
      const topic = new Topic('Child Topic', 'Child content', parentId);
      
      expect(topic.parentId).toBe(parentId);
    });

    it('should create a topic with custom version', () => {
      const topic = new Topic('Test Topic', 'Test content', undefined, undefined, 5);
      
      expect(topic.version).toBe(5);
    });
  });

  describe('Validation', () => {
    it('should validate a valid topic', () => {
      const topic = new Topic('Valid Topic', 'Valid content');
      const validation = topic.validate();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should fail validation for empty name', () => {
      const topic = new Topic('', 'Valid content');
      const validation = topic.validate();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Topic name is required');
    });

    it('should fail validation for empty content', () => {
      const topic = new Topic('Valid name', '');
      const validation = topic.validate();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Topic content is required');
    });

    it('should fail validation for name too long', () => {
      const longName = 'a'.repeat(201);
      const topic = new Topic(longName, 'Valid content');
      const validation = topic.validate();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Topic name must be less than 200 characters');
    });

    it('should fail validation for circular reference', () => {
      const topic = new Topic('Test Topic', 'Test content');
      topic.parentId = topic.id; // Self-reference
      const validation = topic.validate();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Topic cannot be its own parent');
    });

    it('should fail validation for invalid version', () => {
      const topic = new Topic('Test Topic', 'Test content', undefined, undefined, 0);
      const validation = topic.validate();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Version must be a positive number');
    });
  });

  describe('Version Control', () => {
    it('should create a new version with incremented version number', () => {
      const originalTopic = new Topic('Original Topic', 'Original content');
      const newVersion = originalTopic.createNewVersion('Updated content', 'Updated Topic');
      
      expect(newVersion.version).toBe(originalTopic.version + 1);
      expect(newVersion.name).toBe('Updated Topic');
      expect(newVersion.content).toBe('Updated content');
      expect(newVersion.id).toBe(originalTopic.id);
      expect(newVersion.parentId).toBe(originalTopic.parentId);
    });

    it('should preserve original content when not provided', () => {
      const originalTopic = new Topic('Original Topic', 'Original content');
      const newVersion = originalTopic.createNewVersion();
      
      expect(newVersion.name).toBe(originalTopic.name);
      expect(newVersion.content).toBe(originalTopic.content);
    });

    it('should copy children references', () => {
      const parentTopic = new Topic('Parent Topic', 'Parent content');
      const childTopic = new Topic('Child Topic', 'Child content');
      
      parentTopic.addChild(childTopic);
      const newVersion = parentTopic.createNewVersion();
      
      expect(newVersion.children).toEqual(parentTopic.children);
    });
  });

  describe('Hierarchy Management', () => {
    it('should add a child topic', () => {
      const parentTopic = new Topic('Parent Topic', 'Parent content');
      const childTopic = new Topic('Child Topic', 'Child content');
      
      parentTopic.addChild(childTopic);
      
      expect(parentTopic.children).toContain(childTopic.id);
      expect(childTopic.parentId).toBe(parentTopic.id);
      expect(parentTopic.hasChildren()).toBe(true);
    });

    it('should not add duplicate children', () => {
      const parentTopic = new Topic('Parent Topic', 'Parent content');
      const childTopic = new Topic('Child Topic', 'Child content');
      
      parentTopic.addChild(childTopic);
      parentTopic.addChild(childTopic); // Add again
      
      expect(parentTopic.children.length).toBe(1);
    });

    it('should remove a child topic', () => {
      const parentTopic = new Topic('Parent Topic', 'Parent content');
      const childTopic = new Topic('Child Topic', 'Child content');
      
      parentTopic.addChild(childTopic);
      const removed = parentTopic.removeChild(childTopic.id);
      
      expect(removed).toBe(true);
      expect(parentTopic.children).not.toContain(childTopic.id);
      expect(childTopic.parentId).toBeUndefined();
      expect(parentTopic.hasChildren()).toBe(false);
    });

    it('should return false when removing non-existent child', () => {
      const parentTopic = new Topic('Parent Topic', 'Parent content');
      const removed = parentTopic.removeChild('non-existent-id');
      
      expect(removed).toBe(false);
    });

    it('should get all children', () => {
      const parentTopic = new Topic('Parent Topic', 'Parent content');
      const child1 = new Topic('Child 1', 'Child 1 content');
      const child2 = new Topic('Child 2', 'Child 2 content');
      
      parentTopic.addChild(child1);
      parentTopic.addChild(child2);
      
      const children = parentTopic.getChildren();
      expect(children).toHaveLength(2);
      expect(children).toContain(child1);
      expect(children).toContain(child2);
    });

    it('should calculate depth correctly', () => {
      const parentTopic = new Topic('Parent Topic', 'Parent content');
      const childTopic = new Topic('Child Topic', 'Child content');
      const grandchildTopic = new Topic('Grandchild Topic', 'Grandchild content');
      
      parentTopic.addChild(childTopic);
      childTopic.addChild(grandchildTopic);
      
      expect(grandchildTopic.getDepth()).toBe(0); // Leaf node
      expect(childTopic.getDepth()).toBe(1);
      expect(parentTopic.getDepth()).toBe(2);
    });

    it('should get all descendants', () => {
      const parentTopic = new Topic('Parent Topic', 'Parent content');
      const child1 = new Topic('Child 1', 'Child 1 content');
      const child2 = new Topic('Child 2', 'Child 2 content');
      const grandchild = new Topic('Grandchild', 'Grandchild content');
      
      parentTopic.addChild(child1);
      parentTopic.addChild(child2);
      child1.addChild(grandchild);
      
      const descendants = parentTopic.getAllDescendants();
      expect(descendants).toHaveLength(3);
      expect(descendants).toContain(child1);
      expect(descendants).toContain(child2);
      expect(descendants).toContain(grandchild);
    });

    it('should check if topic is ancestor of another', () => {
      const parentTopic = new Topic('Parent Topic', 'Parent content');
      const childTopic = new Topic('Child Topic', 'Child content');
      const grandchildTopic = new Topic('Grandchild Topic', 'Grandchild content');
      
      parentTopic.addChild(childTopic);
      childTopic.addChild(grandchildTopic);
      
      expect(parentTopic.isAncestorOf(grandchildTopic)).toBe(true);
      expect(childTopic.isAncestorOf(grandchildTopic)).toBe(true);
      expect(grandchildTopic.isAncestorOf(parentTopic)).toBe(false);
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const topic = new Topic('Test Topic', 'Test content');
      const json = topic.toJSON();
      
      expect(json).toHaveProperty('id', topic.id);
      expect(json).toHaveProperty('name', 'Test Topic');
      expect(json).toHaveProperty('content', 'Test content');
      expect(json).toHaveProperty('version', 1);
      expect(json).toHaveProperty('parentId', undefined);
      expect(json).toHaveProperty('children', []);
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
      expect(json).toHaveProperty('hasChildren', false);
      expect(json).toHaveProperty('depth', 0);
    });

    it('should create topic from JSON correctly', () => {
      const data = {
        id: 'test-id',
        name: 'Test Topic',
        content: 'Test content',
        version: 2,
        parentId: 'parent-id',
        children: ['child-id-1', 'child-id-2']
      };
      
      const topic = Topic.fromJSON(data);
      
      expect(topic.id).toBe('test-id');
      expect(topic.name).toBe('Test Topic');
      expect(topic.content).toBe('Test content');
      expect(topic.version).toBe(2);
      expect(topic.parentId).toBe('parent-id');
      expect(topic.children).toEqual(['child-id-1', 'child-id-2']);
    });
  });

  describe('Cloning', () => {
    it('should clone topic correctly', () => {
      const originalTopic = new Topic('Original Topic', 'Original content', 'parent-id');
      const childTopic = new Topic('Child Topic', 'Child content');
      originalTopic.addChild(childTopic);
      
      const clonedTopic = originalTopic.clone();
      
      expect(clonedTopic.id).toBe(originalTopic.id);
      expect(clonedTopic.name).toBe(originalTopic.name);
      expect(clonedTopic.content).toBe(originalTopic.content);
      expect(clonedTopic.version).toBe(originalTopic.version);
      expect(clonedTopic.parentId).toBe(originalTopic.parentId);
      expect(clonedTopic.children).toEqual(originalTopic.children);
      
      // Ensure it's a deep clone
      expect(clonedTopic).not.toBe(originalTopic);
      expect(clonedTopic.children).not.toBe(originalTopic.children);
    });
  });

  describe('Equality and String Representation', () => {
    it('should check equality correctly', () => {
      const topic1 = new Topic('Topic 1', 'Content 1');
      const topic2 = new Topic('Topic 2', 'Content 2');
      const topic3 = Topic.fromJSON({ ...topic1.toJSON() });
      
      expect(topic1.equals(topic1)).toBe(true);
      expect(topic1.equals(topic2)).toBe(false);
      expect(topic1.equals(topic3)).toBe(true);
    });

    it('should generate string representation correctly', () => {
      const topic = new Topic('Test Topic', 'Test content');
      const str = topic.toString();
      
      expect(str).toBe(`Topic(id=${topic.id})`);
    });
  });
});

