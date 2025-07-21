import { TopicRepository } from './TopicRepository';
import { ResourceRepository } from './ResourceRepository';
import { UserRepository } from './UserRepository';

/**
 * Database manager for coordinating all repositories
 * Implements Singleton pattern for global access
 */
export class DatabaseManager {
  private static instance: DatabaseManager;
  
  public readonly topics: TopicRepository;
  public readonly resources: ResourceRepository;
  public readonly users: UserRepository;
  
  private isInitialized: boolean = false;

  private constructor() {
    this.topics = new TopicRepository();
    this.resources = new ResourceRepository();
    this.users = new UserRepository();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize all repositories
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('Initializing database...');
      
      // Load data from persistent storage
      await Promise.all([
        this.topics.load(),
        this.resources.load(),
        this.users.load()
      ]);

      // Ensure at least one admin user exists
      await this.users.ensureAdminExists();

      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error('Database initialization failed');
    }
  }

  /**
   * Save all repositories
   */
  public async saveAll(): Promise<void> {
    try {
      await Promise.all([
        this.topics.save(),
        this.resources.save(),
        this.users.save()
      ]);
    } catch (error) {
      console.error('Failed to save database:', error);
      throw new Error('Database save failed');
    }
  }

  /**
   * Clear all data
   */
  public async clearAll(): Promise<void> {
    try {
      await Promise.all([
        this.topics.clear(),
        this.resources.clear(),
        this.users.clear()
      ]);
      
      // Recreate default admin
      await this.users.ensureAdminExists();
    } catch (error) {
      console.error('Failed to clear database:', error);
      throw new Error('Database clear failed');
    }
  }

  /**
   * Get database statistics
   */
  public async getStatistics(): Promise<{
    topics: {
      total: number;
      rootTopics: number;
      totalVersions: number;
    };
    resources: {
      total: number;
      byType: Record<string, number>;
    };
    users: {
      total: number;
      byRole: Record<string, number>;
    };
  }> {
    const [
      totalTopics,
      rootTopics,
      totalResources,
      resourceStats,
      totalUsers,
      userStats
    ] = await Promise.all([
      this.topics.count(),
      this.topics.findRootTopics().then(topics => topics.length),
      this.resources.count(),
      this.resources.getResourceStatsByType(),
      this.users.count(),
      this.users.getUserStatsByRole()
    ]);

    // Calculate total versions across all topics
    const allTopics = await this.topics.findAll();
    let totalVersions = 0;
    for (const topic of allTopics) {
      const versions = await this.topics.getAllVersions(topic.id);
      totalVersions += versions.length;
    }

    return {
      topics: {
        total: totalTopics,
        rootTopics,
        totalVersions
      },
      resources: {
        total: totalResources,
        byType: resourceStats
      },
      users: {
        total: totalUsers,
        byRole: userStats
      }
    };
  }

  /**
   * Health check for database
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      initialized: boolean;
      repositories: {
        topics: boolean;
        resources: boolean;
        users: boolean;
      };
      adminExists: boolean;
    };
  }> {
    try {
      const adminUsers = await this.users.getAdmins();
      const repositoriesHealthy = {
        topics: await this.topics.count() >= 0,
        resources: await this.resources.count() >= 0,
        users: await this.users.count() >= 0
      };

      const allHealthy = Object.values(repositoriesHealthy).every(healthy => healthy);
      
      return {
        status: allHealthy && adminUsers.length > 0 ? 'healthy' : 'unhealthy',
        details: {
          initialized: this.isInitialized,
          repositories: repositoriesHealthy,
          adminExists: adminUsers.length > 0
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          initialized: false,
          repositories: {
            topics: false,
            resources: false,
            users: false
          },
          adminExists: false
        }
      };
    }
  }

  /**
   * Backup all data
   */
  public async backup(): Promise<{
    timestamp: string;
    data: {
      topics: any[];
      resources: any[];
      users: any[];
    };
  }> {
    const [topics, resources, users] = await Promise.all([
      this.topics.findAll(),
      this.resources.findAll(),
      this.users.findAll()
    ]);

    return {
      timestamp: new Date().toISOString(),
      data: {
        topics: topics.map(topic => topic.toJSON()),
        resources: resources.map(resource => resource.toJSON()),
        users: users.map(user => user.toJSON())
      }
    };
  }

  /**
   * Restore from backup
   */
  public async restore(backup: {
    data: {
      topics: any[];
      resources: any[];
      users: any[];
    };
  }): Promise<void> {
    try {
      // Clear existing data
      await this.clearAll();

      // Restore users first (to ensure admin exists)
      for (const userData of backup.data.users) {
        const user = this.users['fromJSON'](userData);
        await this.users.create(user);
      }

      // Restore topics
      for (const topicData of backup.data.topics) {
        const topic = this.topics['fromJSON'](topicData);
        await this.topics.create(topic);
      }

      // Restore resources
      for (const resourceData of backup.data.resources) {
        const resource = this.resources['fromJSON'](resourceData);
        await this.resources.create(resource);
      }

      console.log('Database restored from backup successfully');
    } catch (error) {
      console.error('Failed to restore database from backup:', error);
      throw new Error('Database restore failed');
    }
  }

  /**
   * Check if database is initialized
   */
  public get initialized(): boolean {
    return this.isInitialized;
  }
}

