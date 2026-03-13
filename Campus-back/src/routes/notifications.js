import express from 'express';
import { z } from 'zod';
import prisma from '../connection/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  unreadOnly: z.coerce.boolean().optional(),
});

const notificationIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

router.get(
  '/me',
  authenticate,
  validate(listNotificationsQuerySchema, 'query'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = Number(req.query.limit || 20);
      const unreadOnly = req.query.unreadOnly === true;

      const notifications = await prisma.notification.findMany({
        where: {
          userId,
          ...(unreadOnly ? { readAt: null } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const unreadCount = await prisma.notification.count({
        where: {
          userId,
          readAt: null,
        },
      });

      return res.json({ notifications, unreadCount });
    } catch (error) {
      console.error('Error listing notifications:', error);
      return res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  }
);

router.patch(
  '/:id/read',
  authenticate,
  validate(notificationIdParamSchema, 'params'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const id = req.params.id;

      const notification = await prisma.notification.findUnique({ where: { id } });
      if (!notification || notification.userId !== userId) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: {
          readAt: notification.readAt || new Date(),
        },
      });

      return res.json(updated);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ message: 'Failed to update notification' });
    }
  }
);

router.post('/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const updated = await prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
    return res.json({
      message: 'Notifications marked as read',
      updated: updated.count,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ message: 'Failed to update notifications' });
  }
});

export default router;
