import { Router } from 'express';
import { ResourceController } from '../controllers/ResourceController';
import { DatabaseManager } from '../repositories/DatabaseManager';
import { ResourceService } from '../services/ResourceService';

const router = Router();

// Initialize dependencies
const db = DatabaseManager.getInstance();
const resourceService = new ResourceService(db.resources, db.topics, db.users);

// Initialize controller
const resourceController = new ResourceController(resourceService);

// Basic CRUD routes
router.post('/', resourceController.createResource);
router.get('/', resourceController.getResources);
router.get('/statistics', resourceController.getStatistics);
router.get('/duplicates', resourceController.findDuplicates);
router.get('/recent', resourceController.getRecentResources);
router.get('/types', resourceController.getResourceTypes);
router.post('/bulk', resourceController.bulkCreateResources);

// Search routes
router.get('/search/url', resourceController.searchResourcesByUrl);
router.get('/search/description', resourceController.searchResourcesByDescription);

// Filter routes
router.get('/topic/:topicId', resourceController.getResourcesByTopic);
router.get('/type/:type', resourceController.getResourcesByType);

// Resource-specific routes
router.get('/:id', resourceController.getResourceById);
router.put('/:id', resourceController.updateResource);
router.delete('/:id', resourceController.deleteResource);
router.get('/:id/validate', resourceController.validateAccessibility);
router.patch('/:id/url', resourceController.updateResourceUrl);

// Bulk operations
router.delete('/topic/:topicId', resourceController.deleteResourcesByTopic);

export default router;

