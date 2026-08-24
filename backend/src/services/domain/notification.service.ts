import * as notificationRepository from '../../repositories/notification.repository';

export const getNotifications = (userId: number, isRead?: boolean) =>
  notificationRepository.findByUserId(userId, isRead);

export const getUnreadCount = (userId: number) =>
  notificationRepository.countUnread(userId);

export const markAsRead = async (notificationId: number, userId: number): Promise<void> => {
  const notification = await notificationRepository.findById(notificationId);
  if (!notification || notification.userId !== userId) {
    throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
  }
  await notificationRepository.markRead(notification.id);
};

export const markAllAsRead = (userId: number) =>
  notificationRepository.markAllRead(userId);
