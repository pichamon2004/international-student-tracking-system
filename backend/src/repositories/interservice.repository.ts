import prisma from '../utils/prisma';
import { InterserviceStatus } from '@prisma/client';

export interface CreateInterserviceCheckDto {
  studentId:    number;
  status:       InterserviceStatus;
  checkedAt:    Date;
  renewalId?:   number | null;
  referenceId?: string;
  notes?:       string;
}

export interface UpdateInterserviceCheckDto {
  status?:      InterserviceStatus;
  referenceId?: string;
  notes?:       string;
}

const RENEWAL_SELECT = {
  id: true, daysRemaining: true, notifiedAt: true, isResolved: true,
} as const;

// ── Queries ───────────────────────────────────────────────────────

export const findByStudentId = (studentId: number) =>
  prisma.interserviceCheck.findMany({
    where:   { studentId },
    include: { renewal: { select: RENEWAL_SELECT } },
    orderBy: { checkedAt: 'desc' },
  });

export const findByIdAndStudentId = (id: number, studentId: number) =>
  prisma.interserviceCheck.findFirst({ where: { id, studentId } });

// ── Mutations ─────────────────────────────────────────────────────

export const create = (dto: CreateInterserviceCheckDto) =>
  prisma.interserviceCheck.create({
    data: {
      studentId:   dto.studentId,
      status:      dto.status,
      checkedAt:   dto.checkedAt,
      renewalId:   dto.renewalId ?? null,
      referenceId: dto.referenceId,
      notes:       dto.notes,
    },
    include: { renewal: { select: { id: true, daysRemaining: true, isResolved: true } } },
  });

export const updateById = (id: number, dto: UpdateInterserviceCheckDto) =>
  prisma.interserviceCheck.update({
    where: { id },
    data: {
      status:      dto.status,
      referenceId: dto.referenceId,
      notes:       dto.notes,
    },
  });
