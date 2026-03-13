import jwt from 'jsonwebtoken';
import prisma from '../connection/prisma.js';
import { env } from '../config/env.js';
import { logError, serializeError } from '../utils/logger.js';

const JWT_SECRET = env.JWT_SECRET;

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    prisma.user
      .findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true, name: true, isActive: true },
      })
      .then((user) => {
        if (!user) return res.status(401).json({ message: 'User not found' });
        if (!user.isActive) return res.status(403).json({ message: 'Account suspended' });
        req.user = user;
        next();
      })
      .catch((error) => {
        logError('Auth user lookup failed', {
          error: serializeError(error),
          userId: decoded?.id,
        });
        return res.status(500).json({ message: 'Server error' });
      });
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
