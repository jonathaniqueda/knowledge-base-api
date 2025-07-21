import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { DatabaseManager } from '../repositories/DatabaseManager';
import { UserService } from '../services/UserService';

const router = Router();

// Initialize dependencies
const db = DatabaseManager.getInstance();
const userService = new UserService(db.users);

// Initialize controller
const userController = new UserController(userService);

// Authentication routes
router.post('/auth', userController.authenticateUser);

// Basic CRUD routes
router.post('/', userController.createUser);
router.get('/', userController.getUsers);
router.get('/statistics', userController.getStatistics);
router.get('/search', userController.searchUsers);
router.get('/roles', userController.getUserRoles);
router.get('/admins', userController.getAdmins);
router.get('/me', userController.getCurrentUser);

// Filter routes
router.get('/email/:email', userController.getUserByEmail);
router.get('/role/:role', userController.getUsersByRole);

// User-specific routes
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.get('/:id/profile', userController.getUserProfile);
router.get('/:id/permissions/:permission', userController.checkPermission);

// Role management routes
router.patch('/:id/role', userController.updateUserRole);
router.post('/:id/promote', userController.promoteToAdmin);
router.post('/:id/demote', userController.demoteToEditor);

// Password management routes
router.post('/:id/password', userController.changePassword);

export default router;

