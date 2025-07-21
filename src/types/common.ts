export enum UserRole {
  ADMIN = 'Admin',
  EDITOR = 'Editor',
  VIEWER = 'Viewer'
}

export enum ResourceType {
  VIDEO = 'video',
  ARTICLE = 'article',
  PDF = 'pdf',
  DOCUMENT = 'document',
  LINK = 'link'
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Versioned {
  version: number;
}

export interface Hierarchical {
  parentId?: string;
  children?: string[];
}

export interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

export interface Identifiable {
  id: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SearchCriteria {
  [key: string]: any;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

