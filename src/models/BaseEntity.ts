import { v4 as uuidv4 } from 'uuid';
import { BaseEntity as IBaseEntity, ValidationResult, Timestamped, Identifiable } from '../types/common';

/**
 * Abstract base class for all entities in the system
 * Implements common functionality and enforces consistent behavior
 */
export abstract class BaseEntity implements IBaseEntity, Timestamped, Identifiable {
  public readonly id: string;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(id?: string) {
    this.id = id || uuidv4();
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Updates the updatedAt timestamp
   */
  protected touch(): void {
    this.updatedAt = new Date();
  }

  /**
   * Abstract method for validation - must be implemented by subclasses
   */
  public abstract validate(): ValidationResult;

  /**
   * Abstract method for creating a copy - must be implemented by subclasses
   */
  public abstract clone(): BaseEntity;

  /**
   * Abstract method for serialization - must be implemented by subclasses
   */
  public abstract toJSON(): Record<string, any>;

  /**
   * Compares two entities by ID
   */
  public equals(other: BaseEntity): boolean {
    return this.id === other.id;
  }

  /**
   * Returns a string representation of the entity
   */
  public toString(): string {
    return `${this.constructor.name}(id=${this.id})`;
  }

  /**
   * Template method for updating entity - calls validation before update
   */
  public update(data: Partial<this>): ValidationResult {
    const validation = this.validate();
    if (!validation.isValid) {
      return validation;
    }

    Object.assign(this, data);
    this.touch();
    
    return { isValid: true, errors: [] };
  }
}

