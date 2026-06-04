import express from 'express';
import {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamAnalytics,
  getTeamTasks,
  getMyTeams
} from '../controllers/teamController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply protection to all team operations
router.use(protect);
router.use((req, res, next) => {
  if (req.user?.status === 'fired') {
    return res.status(403).json({ message: 'Your account has been fired.' });
  }
  next();
});

// Non-admin routes
router.get('/user/my-teams', getMyTeams);
router.get('/:id/tasks', getTeamTasks);
router.get('/:id', getTeamById); // Members can view their own team details too

// Admin only routes
router.use(adminOnly);

router.route('/')
  .get(getTeams)
  .post(createTeam);

router.get('/stats/analytics', getTeamAnalytics);

router.route('/:id')
  .put(updateTeam)
  .delete(deleteTeam);

export default router;
