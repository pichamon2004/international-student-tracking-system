import prisma from '../utils/prisma';

export const findPending = (studentId: number, entityType: string, entityId: number | null) =>
  prisma.changeRequest.findFirst({
    where: { studentId, entityType, entityId: entityId ?? null, status: 'PENDING' },
  });

export const create = (data: {
  studentId: number;
  entityType: string;
  entityId: number | null;
  action: string;
  payload: object;
}) => prisma.changeRequest.create({ data });

export const findById = (id: number) =>
  prisma.changeRequest.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, firstNameEn: true, lastNameEn: true, studentId: true } },
    },
  });

export const findAllPending = () =>
  prisma.changeRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      student: { select: { id: true, firstNameEn: true, lastNameEn: true, studentId: true } },
    },
  });

export const findByStudent = (studentId: number) =>
  prisma.changeRequest.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
  });

export const updateStatus = (
  id: number,
  status: string,
  reviewedBy?: number,
  reviewNote?: string,
) =>
  prisma.changeRequest.update({
    where: { id },
    data: { status, reviewedBy, reviewNote, reviewedAt: new Date() },
  });
