import { Router } from 'express';
import { TopicController } from '../controllers/TopicController';
import { DatabaseManager } from '../repositories/DatabaseManager';
import { TopicService } from '../services/TopicService';
import { TopicPathFinder } from '../algorithms/TopicPathFinder';
import { TopicTreeTraversal } from '../algorithms/TopicTreeTraversal';
import { TopicHierarchyAlgorithm } from '../algorithms/TopicHierarchyAlgorithm';
import { TopicSearchAlgorithm } from '../algorithms/TopicSearchAlgorithm';

const router = Router();

// Initialize dependencies
const db = DatabaseManager.getInstance();
const topicService = new TopicService(db.topics, db.users);
const pathFinder = new TopicPathFinder(db.topics);
const treeTraversal = new TopicTreeTraversal(db.topics);
const hierarchyAlgorithm = new TopicHierarchyAlgorithm(db.topics);
const searchAlgorithm = new TopicSearchAlgorithm();

// Initialize controller
const topicController = new TopicController(
  topicService,
  pathFinder,
  treeTraversal,
  hierarchyAlgorithm,
  searchAlgorithm
);

// Basic CRUD routes
router.post('/', topicController.createTopic);
router.get('/', topicController.getTopics);
router.get('/roots', topicController.getRootTopics);
router.get('/statistics', topicController.getStatistics);
router.get('/search', topicController.searchTopics);
router.delete('/bulk', topicController.bulkDeleteTopics);

// Topic-specific routes
router.get('/:id', topicController.getTopicById);
router.put('/:id', topicController.updateTopic);
router.delete('/:id', topicController.deleteTopic);

// Version control routes
router.get('/:id/versions', topicController.getVersionHistory);
router.get('/:id/versions/:version', topicController.getTopicVersion);

// Hierarchy routes
router.get('/:id/hierarchy', topicController.getTopicHierarchy);
router.get('/:id/children', topicController.getChildren);
router.post('/:id/move', topicController.moveTopic);
router.get('/:id/hierarchy-stats', topicController.getHierarchyStatistics);

// Algorithm routes
router.get('/:id1/path/:id2', topicController.findShortestPath);
router.get('/:id1/paths/:id2', topicController.findAllPaths);
router.get('/:id/traverse/:method', topicController.traverseTree);
router.get('/:id1/relationship/:id2', topicController.getRelationship);
router.get('/:id/nearby/:distance', topicController.getTopicsWithinDistance);

export default router;

