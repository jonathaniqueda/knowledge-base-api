import { BaseEntity } from './BaseEntity';
import { ValidationResult, Versioned, Hierarchical } from '../types/common';

/**
 * Interface for Topic-specific operations
 */
export interface ITopicComponent {
  addChild(child: Topic): void;
  removeChild(childId: string): boolean;
  getChildren(): Topic[];
  hasChildren(): boolean;
  getDepth(): number;
}

/**
 * Topic entity implementing Composite pattern for hierarchical structure
 * and version control for content management
 */
export class Topic extends BaseEntity implements Versioned, Hierarchical, ITopicComponent {
  public name: string;
  public content: string;
  public version: number;
  public parentId?: string;
  public children: string[];
  private childTopics: Map<string, Topic>;

  constructor(
    name: string,
    content: string,
    parentId?: string,
    id?: string,
    version: number = 1
  ) {
    super(id);
    this.name = name;
    this.content = content;
    this.version = version;
    this.parentId = parentId;
    this.children = [];
    this.childTopics = new Map();
  }

  /**
   * Validates the topic data
   */
  public validate(): ValidationResult {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Topic name is required');
    }

    if (this.name && this.name.length > 200) {
      errors.push('Topic name must be less than 200 characters');
    }

    if (!this.content || this.content.trim().length === 0) {
      errors.push('Topic content is required');
    }

    if (this.version < 1) {
      errors.push('Version must be a positive number');
    }

    // Check for circular reference
    if (this.parentId === this.id) {
      errors.push('Topic cannot be its own parent');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Creates a new version of the topic
   */
  public createNewVersion(newContent?: string, newName?: string): Topic {
    const newTopic = new Topic(
      newName || this.name,
      newContent || this.content,
      this.parentId,
      this.id,
      this.version + 1
    );
    
    // Copy children references
    newTopic.children = [...this.children];
    newTopic.childTopics = new Map(this.childTopics);
    
    return newTopic;
  }

  /**
   * Composite pattern: Add child topic
   */
  public addChild(child: Topic): void {
    if (!this.children.includes(child.id)) {
      this.children.push(child.id);
      this.childTopics.set(child.id, child);
      child.parentId = this.id;
      this.touch();
    }
  }

  /**
   * Composite pattern: Remove child topic
   */
  public removeChild(childId: string): boolean {
    const index = this.children.indexOf(childId);
    if (index > -1) {
      this.children.splice(index, 1);
      const child = this.childTopics.get(childId);
      if (child) {
        child.parentId = undefined;
        this.childTopics.delete(childId);
      }
      this.touch();
      return true;
    }
    return false;
  }

  /**
   * Composite pattern: Get all child topics
   */
  public getChildren(): Topic[] {
    return Array.from(this.childTopics.values());
  }

  /**
   * Composite pattern: Check if has children
   */
  public hasChildren(): boolean {
    return this.children.length > 0;
  }

  /**
   * Calculate depth in hierarchy
   */
  public getDepth(): number {
    if (!this.hasChildren()) {
      return 0;
    }
    
    let maxChildDepth = 0;
    for (const child of this.getChildren()) {
      maxChildDepth = Math.max(maxChildDepth, child.getDepth());
    }
    
    return maxChildDepth + 1;
  }

  /**
   * Get all descendants recursively
   */
  public getAllDescendants(): Topic[] {
    const descendants: Topic[] = [];
    
    for (const child of this.getChildren()) {
      descendants.push(child);
      descendants.push(...child.getAllDescendants());
    }
    
    return descendants;
  }

  /**
   * Check if this topic is an ancestor of another topic
   */
  public isAncestorOf(topic: Topic): boolean {
    return this.getAllDescendants().some(descendant => descendant.id === topic.id);
  }

  /**
   * Clone the topic
   */
  public clone(): Topic {
    const cloned = new Topic(
      this.name,
      this.content,
      this.parentId,
      this.id,
      this.version
    );
    
    cloned.children = [...this.children];
    cloned.childTopics = new Map(this.childTopics);
    
    return cloned;
  }

  /**
   * Serialize to JSON
   */
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      content: this.content,
      version: this.version,
      parentId: this.parentId,
      children: this.children,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      hasChildren: this.hasChildren(),
      depth: this.getDepth()
    };
  }

  /**
   * Create topic from JSON data
   */
  public static fromJSON(data: any): Topic {
    const topic = new Topic(
      data.name,
      data.content,
      data.parentId,
      data.id,
      data.version
    );
    
    if (data.children) {
      topic.children = data.children;
    }
    
    return topic;
  }
}

