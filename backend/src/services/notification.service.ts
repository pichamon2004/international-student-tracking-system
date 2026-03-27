import prisma from '../utils/prisma';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationInput {
  userId: number;
  type?: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export const createNotification = async (input: CreateNotificationInput) => {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type ?? 'GENERAL',
      title: input.title,
      message: input.message,
      link: input.link,
    },
  });
};

/* Notify everyone listed in userIds in a single DB call */
export const createNotifications = async (
  userIds: number[],
  payload: Omit<CreateNotificationInput, 'userId'>
) => {
  if (userIds.length === 0) return;
  return prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: payload.type ?? 'GENERAL',
      title: payload.title,
      message: payload.message,
      link: payload.link,
    })),
    skipDuplicates: true,
  });
};
