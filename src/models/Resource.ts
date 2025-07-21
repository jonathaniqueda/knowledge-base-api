import { BaseEntity } from './BaseEntity';
import { ValidationResult, ResourceType } from '../types/common';

/**
 * Resource entity representing external links or documents associated with topics
 */
export class Resource extends BaseEntity {
  public topicId: string;
  public url: string;
  public description: string;
  public type: ResourceType;

  constructor(
    topicId: string,
    url: string,
    description: string,
    type: ResourceType,
    id?: string
  ) {
    super(id);
    this.topicId = topicId;
    this.url = url;
    this.description = description;
    this.type = type;
  }

  /**
   * Validates the resource data
   */
  public validate(): ValidationResult {
    const errors: string[] = [];

    if (!this.topicId || this.topicId.trim().length === 0) {
      errors.push('Topic ID is required');
    }

    if (!this.url || this.url.trim().length === 0) {
      errors.push('URL is required');
    }

    if (this.url && !this.isValidUrl(this.url)) {
      errors.push('URL must be a valid URL format');
    }

    if (!this.description || this.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (this.description && this.description.length > 500) {
      errors.push('Description must be less than 500 characters');
    }

    if (!Object.values(ResourceType).includes(this.type)) {
      errors.push('Invalid resource type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Updates resource data
   */
  public updateResource(data: {
    url?: string;
    description?: string;
    type?: ResourceType;
  }): ValidationResult {
    if (data.url !== undefined) this.url = data.url;
    if (data.description !== undefined) this.description = data.description;
    if (data.type !== undefined) this.type = data.type;

    const validation = this.validate();
    if (validation.isValid) {
      this.touch();
    }

    return validation;
  }

  /**
   * Check if resource is accessible (basic check)
   */
  public isAccessible(): boolean {
    return this.url.startsWith('http://') || this.url.startsWith('https://');
  }

  /**
   * Get file extension from URL
   */
  public getFileExtension(): string | null {
    try {
      const url = new URL(this.url);
      const pathname = url.pathname;
      const lastDot = pathname.lastIndexOf('.');
      
      if (lastDot > 0) {
        return pathname.substring(lastDot + 1).toLowerCase();
      }
    } catch {
      // Invalid URL
    }
    
    return null;
  }

  /**
   * Check if resource type matches URL
   */
  public isTypeConsistent(): boolean {
    const extension = this.getFileExtension();
    
    switch (this.type) {
      case ResourceType.PDF:
        return extension === 'pdf';
      case ResourceType.VIDEO:
        return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '');
      case ResourceType.DOCUMENT:
        return ['doc', 'docx', 'txt', 'rtf'].includes(extension || '');
      default:
        return true; // For article and link types, any URL is acceptable
    }
  }

  /**
   * Clone the resource
   */
  public clone(): Resource {
    return new Resource(
      this.topicId,
      this.url,
      this.description,
      this.type,
      this.id
    );
  }

  /**
   * Serialize to JSON
   */
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      topicId: this.topicId,
      url: this.url,
      description: this.description,
      type: this.type,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isAccessible: this.isAccessible(),
      fileExtension: this.getFileExtension(),
      isTypeConsistent: this.isTypeConsistent()
    };
  }

  /**
   * Create resource from JSON data
   */
  public static fromJSON(data: any): Resource {
    return new Resource(
      data.topicId,
      data.url,
      data.description,
      data.type,
      data.id
    );
  }
}

