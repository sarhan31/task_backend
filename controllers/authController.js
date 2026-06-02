import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user'
    });

    if (user) {
      res.status(201).json({
        token: generateToken(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          firedReason: user.firedReason,
          firedAt: user.firedAt,
          rehiredAt: user.rehiredAt,
          rehireMessage: user.rehireMessage
        }
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        token: generateToken(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          firedReason: user.firedReason,
          firedAt: user.firedAt,
          rehiredAt: user.rehiredAt,
          rehireMessage: user.rehireMessage
        }
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user / clear token (frontend handles clearing storage)
// @route   POST /api/auth/logout
// @access  Private
export const logoutUser = async (req, res) => {
  res.json({ message: 'Successfully logged out' });
};

// @desc    Verify JWT session & return profile
// @route   GET /api/auth/verify
// @access  Private
export const verifySession = async (req, res) => {
  try {
    if (req.user) {
      res.json({
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        status: req.user.status,
        firedReason: req.user.firedReason,
        firedAt: req.user.firedAt,
        rehiredAt: req.user.rehiredAt,
        rehireMessage: req.user.rehireMessage
      });
    } else {
      res.status(401).json({ message: 'Session invalid' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request forgot password token
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    // Mock reset token for demo / local purposes
    const resetToken = `reset-${user._id}-${Date.now()}`;
    res.json({
      message: 'Reset instructions dispatched successfully',
      resetToken // Returned directly for testing ease
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Please provide token and new password' });
    }

    // Extract user ID from our mock token reset-userId-timestamp
    const parts = token.split('-');
    if (parts.length < 2 || parts[0] !== 'reset') {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    const userId = parts[1];
    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({ message: 'User not found or token invalid' });
    }

    user.password = password;
    await user.save();

    res.json({ message: 'Password has been updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile details
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      firedReason: updatedUser.firedReason,
      firedAt: updatedUser.firedAt,
      rehiredAt: updatedUser.rehiredAt,
      rehireMessage: updatedUser.rehireMessage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
