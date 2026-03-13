import prisma from '../connection/prisma.js';

export async function createNotification({ userId, type, title, message, metadata }) {
  if (!userId || !title || !message) return null;

  try {
    return await prisma.notification.create({
      data: {
        userId,
        type: String(type || 'GENERAL'),
        title: String(title),
        message: String(message),
        metadata: metadata || undefined,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}
