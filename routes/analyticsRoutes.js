import express from 'express';
import {
  getDashboardStats,
  getTaskAnalytics,
  getUserAnalytics,
  getReports,
  exportReport
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply protection to all analytics routes
router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/tasks', getTaskAnalytics);
router.get('/users', getUserAnalytics);

// Admin-only report compiling & exports
router.get('/reports', adminOnly, getReports);
router.get('/export', adminOnly, exportReport);

export default router;
