import prisma from '../utils/prisma';
import { DocumentType } from '@prisma/client';

export interface CreateDocumentDto {
  studentId?:   number;
  dependentId?: number;
  name:         string;
  description?: string;
  fileUrl:      string;
  fileType:     string;
  fileSize:     number;
  uploadedBy:   number;
  documentType?: DocumentType;
}

// ── Queries ───────────────────────────────────────────────────────

export const findByStudentId = (studentId: number) =>
  prisma.document.findMany({
    where:   { studentId },
    orderBy: { uploadedAt: 'desc' },
  });

export const findByDependentId = (dependentId: number) =>
  prisma.document.findMany({
    where:   { dependentId },
    orderBy: { uploadedAt: 'desc' },
  });

export const findById = (id: number) =>
  prisma.document.findUnique({ where: { id } });

// ── Mutations ─────────────────────────────────────────────────────

export const create = (dto: CreateDocumentDto) =>
  prisma.document.create({
    data: {
      studentId:    dto.studentId,
      dependentId:  dto.dependentId,
      name:         dto.name,
      description:  dto.description,
      fileUrl:      dto.fileUrl,
      fileType:     dto.fileType,
      fileSize:     dto.fileSize,
      uploadedBy:   dto.uploadedBy,
      documentType: dto.documentType,
    },
  });

export const removeById = (id: number) =>
  prisma.document.delete({ where: { id } });
