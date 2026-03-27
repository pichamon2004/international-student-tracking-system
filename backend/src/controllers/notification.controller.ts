import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

// GET /api/notifications
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const isRead = req.query.isRead;

    const where: Record<string, unknown> = { userId };
    if (isRead === 'false') where.isRead = false;
    if (isRead === 'true') where.isRead = true;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: notifications });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/notifications/unread-count
export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.userId, isRead: false },
    });
    res.json({ success: true, data: { count } });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /api/notifications/:id/read
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!notification || notification.userId !== req.user!.userId) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'Marked as read' });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /api/notifications/read-all
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
