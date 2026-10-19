import prisma from '../utils/prisma';
import { Prisma, RequestStatus } from '@prisma/client';
import { ACTOR_SELECT } from './requestEvent.repository';

type Db = Prisma.TransactionClient | typeof prisma;

export interface CreateRequestDto {
  studentId:     number;
  title:         string;
  requestTypeId?: number | null;
  description?:  string;
  formData?:     string | null;
}

export interface UpdateRequestStatusDto {
  status: RequestStatus;
  staffData?: string;
}

const STUDENT_SELECT = {
  id: true, studentId: true,
  firstNameEn: true, lastNameEn: true, titleEn: true,
  email: true, program: true, faculty: true,
} as const;

const REQUEST_TYPE_SELECT = { id: true, name: true, icon: true } as const;

// Full history, oldest first
const EVENTS_INCLUDE = {
  orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
  include: { actor: ACTOR_SELECT },
};

// Attached files in the order they were added; presented as the `attachments` JSON by the service
export const ATTACHMENT_FILES = {
  orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
  select:  { fileId: true, file: { select: { id: true, storageKey: true } } },
};

// ── Queries ───────────────────────────────────────────────────────

export const findMany = (where: Record<string, unknown>) =>
  prisma.request.findMany({
    where,
    include: {
      student:     { select: STUDENT_SELECT },
      requestType: { select: REQUEST_TYPE_SELECT },
      // Latest comment only — list pages show it as a one-line note
      events: {
        where:   { comment: { not: null } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take:    1,
        include: { actor: ACTOR_SELECT },
      },
      attachmentFiles: ATTACHMENT_FILES,
    },
    orderBy: { createdAt: 'desc' },
  });

export const findById = (id: number) =>
  prisma.request.findUnique({
    where:   { id },
    include: {
      student: {
        include: {
          passports: { where: { isCurrent: true, dependentId: null }, take: 1, select: { passportNumber: true, expiryDate: true } },
          advisor: {
            select: { titleEn: true, firstNameEn: true, middleNameEn: true, lastNameEn: true, phone: true, user: { select: { email: true } } },
          },
        },
      },
      requestType: { select: REQUEST_TYPE_SELECT },
      events: EVENTS_INCLUDE,
      attachmentFiles: ATTACHMENT_FILES,
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

export const create = (dto: CreateRequestDto, db: Db = prisma) =>
  db.request.create({
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

export const updateStatus = (id: number, dto: UpdateRequestStatusDto, db: Db = prisma) =>
  db.request.update({
    where: { id },
    data: {
      status: dto.status,
      ...(dto.staffData !== undefined && { staffData: dto.staffData }),
    },
    include: { attachmentFiles: ATTACHMENT_FILES },
  });

/** Files attached with one status change; existing attachments are kept (they accumulate). */
export const addAttachments = (requestId: number, eventId: number, fileIds: number[], uploadedById: number, db: Db = prisma) =>
  db.requestAttachment.createMany({
    data: fileIds.map(fileId => ({ requestId, eventId, fileId, uploadedById })),
  });

export const updateContent = (id: number, dto: { description?: string; formData?: string | null }, db: Db = prisma) =>
  db.request.update({
    where: { id },
    data: {
      description: dto.description,
      formData:    dto.formData,
    },
    include: { requestType: { select: REQUEST_TYPE_SELECT } },
  });
