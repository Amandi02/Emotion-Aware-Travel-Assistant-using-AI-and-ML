import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-change-in-production';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export async function attachUser(req, res, next) {
  if (!req.userId) return next();
  try {
    const user = await User.findById(req.userId).select('-password');
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'User not found' });
  }
}

export function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}
