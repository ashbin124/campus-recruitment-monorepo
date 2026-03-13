import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../connection/prisma.js';
import { signToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(6).max(128),
  role: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.enum(['STUDENT', 'COMPANY'])),
  companyName: z.string().trim().max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

const updateSchema = z
  .object({
    targetUserId: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email().max(254).optional(),
    currentPassword: z.string().min(1).max(128).optional(),
    newPassword: z.string().min(6).max(128).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.name && !value.email && !value.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No changes provided',
        path: ['root'],
      });
    }
  });

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { name, email, password, role, companyName } = req.body;
    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);
    const cleanRole = String(role).trim().toUpperCase();
    const cleanCompanyName = typeof companyName === 'string' ? companyName.trim() : '';

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const hash = await bcrypt.hash(cleanPassword, 10);

    const user = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        password: hash,
        role: cleanRole,
        student: cleanRole === 'STUDENT' ? { create: {} } : undefined,
        company:
          cleanRole === 'COMPANY' ? { create: { name: cleanCompanyName || cleanName } } : undefined,
      },
    });

    const token = signToken({ id: user.id, role: user.role, name: user.name });
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const cleanEmail = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const cleanPassword = String(req.body?.password || '');

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isActive)
      return res.status(403).json({ message: 'Account suspended. Contact admin.' });
    const ok = await bcrypt.compare(cleanPassword, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = signToken({ id: user.id, role: user.role, name: user.name });
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get current authenticated user
router.get('/me', authenticate, async (req, res) => {
  try {
    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!u) return res.status(404).json({ message: 'User not found' });
    return res.json({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// All-in-one account update for Admin/User/Company
// - Self updates: can change name/email/password; password change requires currentPassword
// - Admin can target another user via targetUserId without providing currentPassword
router.put('/update', authenticate, validate(updateSchema), async (req, res) => {
  try {
    const { targetUserId, name, email: newEmail, currentPassword, newPassword } = req.body;

    const isAdmin = req.user.role === 'ADMIN';
    const targetId = targetUserId && isAdmin ? targetUserId : req.user.id;

    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const data = {};

    // Name update (any role, self or admin targeting)
    if (typeof name === 'string' && name.trim() && name.trim() !== user.name) {
      data.name = name.trim();
    }

    // Email update (self or admin targeting) with uniqueness check
    const normalizedEmail = typeof newEmail === 'string' ? newEmail.trim().toLowerCase() : '';
    if (normalizedEmail && normalizedEmail !== user.email) {
      const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (exists && exists.id !== user.id)
        return res.status(409).json({ message: 'Email already in use' });
      data.email = normalizedEmail;
    }

    // Password update
    if (typeof newPassword === 'string' && newPassword.length) {
      const isSelf = targetId === req.user.id;
      if (!isAdmin || isSelf) {
        if (!currentPassword)
          return res.status(400).json({ message: 'Current password is required' });
        const ok = await bcrypt.compare(currentPassword, user.password);
        if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });
      }
      const hash = await bcrypt.hash(newPassword, 10);
      data.password = hash;
    }

    if (!Object.keys(data).length) {
      return res.status(400).json({ message: 'No changes provided' });
    }

    const updated = await prisma.user.update({ where: { id: targetId }, data });
    return res.status(200).json({
      message: 'User updated successfully',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
