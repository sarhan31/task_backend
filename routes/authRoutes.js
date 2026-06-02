import express from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  verifySession,
  forgotPassword,
  resetPassword,
  updateProfile
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/logout', protect, logoutUser);
router.get('/verify', protect, verifySession);
router.put('/profile', protect, updateProfile);

export default router;
