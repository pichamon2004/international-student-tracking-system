import prisma from '../utils/prisma';
import { RequestStatus } from '@prisma/client';

export interface CreateRequestDto {
  studentId:     number;
  title:         string;
  requestTypeId?: number | null;
  description?:  string;
  formData?:     string | null;
}

export interface UpdateRequestStatusDto {
  status:          RequestStatus;
  advisorComment?: string;
  advisorAt?:      Date;
  advisorId?:      number;
  staffComment?:   string;
  staffAt?:        Date;
  staffId?:        number;
  attachments?:    string;
}

const STUDENT_SELECT = {
  id: true, studentId: true,
  firstNameEn: true, lastNameEn: true, titleEn: true,
  email: true, program: true, faculty: true,
} as const;

const REQUEST_TYPE_SELECT = { id: true, name: true, icon: true } as const;

// ── Queries ───────────────────────────────────────────────────────

export const findMany = (where: Record<string, unknown>) =>
  prisma.request.findMany({
    where,
    include: {
      student:     { select: STUDENT_SELECT },
      requestType: { select: REQUEST_TYPE_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

export const findById = (id: number) =>
  prisma.request.findUnique({
    where:   { id },
    include: {
      student: {
        include: {
          passports: { where: { isCurrent: true }, take: 1, select: { passportNumber: true, expiryDate: true } },
        },
      },
      requestType: { select: REQUEST_TYPE_SELECT },
    },
  });

export const findByIdWithStudent = (id: number) =>
  prisma.request.findUnique({
    where:   { id },
    include: {
      student: { select: { userId: true, email: true, firstNameEn: true, lastNameEn: true } },
    },
  });

// ── Mutations ─────────────────────────────────────────────────────

export const create = (dto: CreateRequestDto) =>
  prisma.request.create({
    data: {
      studentId:     dto.studentId,
      title:         dto.title,
      requestTypeId: dto.requestTypeId ?? null,
      description:   dto.description,
      formData:      dto.formData ?? null,
      status:        'PENDING',
    },
    include: { requestType: { select: REQUEST_TYPE_SELECT } },
  });

export const updateStatus = (id: number, dto: UpdateRequestStatusDto) =>
  prisma.request.update({
    where: { id },
    data: {
      status:          dto.status,
      advisorComment:  dto.advisorComment,
      advisorAt:       dto.advisorAt,
      advisorId:       dto.advisorId,
      staffComment:    dto.staffComment,
      staffAt:         dto.staffAt,
      staffId:         dto.staffId,
      attachments:     dto.attachments,
    },
  });
