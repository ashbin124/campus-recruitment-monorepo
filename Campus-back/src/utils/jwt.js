import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN || '7d';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
