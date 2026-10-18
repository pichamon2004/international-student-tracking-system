import prisma from '../utils/prisma';
import { DocumentType } from '@prisma/client';
import { DOCUMENT_FILES, includeFiles } from '../services/domain/fileFields';

// One file per document; the relation is the same for student and dependent documents
export const WITH_FILES = includeFiles(DOCUMENT_FILES);

export interface CreateDocumentDto {
  studentId?:   number;
  dependentId?: number;
  name:         string;
  description?: string;
  fileId:       number;
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
    include: WITH_FILES,
  });

export const findByDependentId = (dependentId: number) =>
  prisma.document.findMany({
    where:   { dependentId },
    orderBy: { uploadedAt: 'desc' },
    include: WITH_FILES,
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
      fileId:       dto.fileId,
      fileType:     dto.fileType,
      fileSize:     dto.fileSize,
      uploadedBy:   dto.uploadedBy,
      documentType: dto.documentType,
    },
    include: WITH_FILES,
  });

export const removeById = (id: number) =>
  prisma.document.delete({ where: { id } });
