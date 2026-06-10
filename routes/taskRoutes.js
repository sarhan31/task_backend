import express from 'express';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  uploadAttachment,
  deleteAttachment,
  startTask,
  submitProgressUpdate,
  requestTaskReview,
  approveTask,
  rejectTask,
  getTaskUpdates,
  acceptTaskAssignment,
  denyTaskAssignment,
  requestStatusChange,
  approveStatusChange,
  rejectStatusChange,
  getPendingApprovals
} from '../controllers/taskController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Apply protection to all task operations
router.use(protect);
router.use((req, res, next) => {
  if (req.user?.status === 'fired') {
    return res.status(403).json({ message: 'Your account has been fired. Task access is revoked.' });
  }
  next();
});

router.route('/')
  .get(getTasks)
  .post(createTask);

// ── Static named routes must come before /:id to avoid Express treating
//    "pending-approvals" as a task ID ─────────────────────────────────────
router.get('/pending-approvals', getPendingApprovals);

router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

router.patch('/:id/status', updateTaskStatus);

// Task Assignment Accept/Deny
router.post('/:id/accept', acceptTaskAssignment);
router.post('/:id/deny', denyTaskAssignment);

// Status Change Request and Approval
router.post('/:id/request-status-change', requestStatusChange);
router.post('/:id/approve-status-change', approveStatusChange);
router.post('/:id/reject-status-change', rejectStatusChange);

// Progress, Review, and Approval System routes
router.post('/:id/start', startTask);
router.post('/:id/progress', upload.single('file'), submitProgressUpdate);
router.post('/:id/request-review', requestTaskReview);
router.post('/:id/approve', approveTask);
router.post('/:id/reject', rejectTask);
router.get('/:id/updates', getTaskUpdates);

// Attachments operations
router.post('/:id/attachments', upload.single('file'), uploadAttachment);
router.delete('/:id/attachments/:attachmentId', deleteAttachment);

export default router;
