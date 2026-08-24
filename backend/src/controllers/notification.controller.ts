import { Response } from 'express';
import { AuthRequest } from '../types';
import * as notificationService from '../services/domain/notification.service';

// GET /api/notifications
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { isRead } = req.query;

  const isReadFilter =
    isRead === 'false' ? false :
    isRead === 'true'  ? true  :
    undefined;

  const notifications = await notificationService.getNotifications(userId, isReadFilter);
  res.json({ success: true, data: notifications });
};

// GET /api/notifications/unread-count
export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  const count = await notificationService.getUnreadCount(req.user!.userId);
  res.json({ success: true, data: { count } });
};

// PUT /api/notifications/:id/read
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  await notificationService.markAsRead(parseInt(req.params.id), req.user!.userId);
  res.json({ success: true, message: 'Marked as read' });
};

// PUT /api/notifications/read-all
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  await notificationService.markAllAsRead(req.user!.userId);
  res.json({ success: true, message: 'All notifications marked as read' });
};
