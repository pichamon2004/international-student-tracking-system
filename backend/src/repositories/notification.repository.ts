import prisma from '../utils/prisma';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationDto {
  userId:  number;
  type:    NotificationType;
  title:   string;
  message: string;
  link?:   string;
}

// ── Queries ───────────────────────────────────────────────────────

export const findByUserId = (userId: number, isRead?: boolean) =>
  prisma.notification.findMany({
    where:   { userId, ...(isRead !== undefined ? { isRead } : {}) },
    orderBy: { createdAt: 'desc' },
    take:    50,
  });

export const countUnread = (userId: number) =>
  prisma.notification.count({ where: { userId, isRead: false } });

export const findById = (id: number) =>
  prisma.notification.findUnique({ where: { id } });

// ── Mutations ─────────────────────────────────────────────────────

export const create = (dto: CreateNotificationDto) =>
  prisma.notification.create({
    data: {
      userId:  dto.userId,
      type:    dto.type,
      title:   dto.title,
      message: dto.message,
      link:    dto.link,
    },
  });

export const markRead = (id: number) =>
  prisma.notification.update({ where: { id }, data: { isRead: true } });

export const markAllRead = (userId: number) =>
  prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
