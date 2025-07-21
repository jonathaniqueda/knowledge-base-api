import { DatabaseManager } from '../src/repositories/DatabaseManager';

/**
 * Test setup and teardown
 */
beforeAll(async () => {
  // Initialize database for testing
  const db = DatabaseManager.getInstance();
  await db.initialize();
});

beforeEach(async () => {
  // Clear database before each test
  const db = DatabaseManager.getInstance();
  await db.clearAll();
});

afterAll(async () => {
  // Clean up after all tests
  const db = DatabaseManager.getInstance();
  await db.clearAll();
});

/**
 * Global test utilities
 */
// Add any global test utilities here if needed

