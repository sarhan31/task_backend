import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserRole,
  fireUser,
  getUserStats
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

// Admin-restricted general routes
router.route('/')
  .get(getUsers)
  .post(adminOnly, createUser);

router.route('/:id')
  .get(getUserById)
  .put(adminOnly, updateUser)
  .delete(adminOnly, deleteUser);

router.patch('/:id/role', adminOnly, updateUserRole);
router.patch('/:id/fire', adminOnly, fireUser);

// Individual stats route
router.get('/:id/stats', getUserStats);

export default router;
