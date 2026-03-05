import { Router } from 'express';
import User from '../models/User.js';
import { signToken, authMiddleware, attachUser } from '../middleware/auth.js';

const router = Router();

// Sign up
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const user = await User.create({ email, password, name: name || '' });
    const token = signToken(user._id);
    res.status(201).json({
      message: 'User created',
      user: { id: user._id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = signToken(user._id);
    res.json({
      message: 'Logged in',
      user: { id: user._id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user (protected)
router.get('/me', authMiddleware, attachUser, (req, res) => {
  res.json({ user: req.user });
});

export default router;
