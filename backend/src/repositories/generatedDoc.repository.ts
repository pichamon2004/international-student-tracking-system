import prisma from '../utils/prisma';

export interface CreateGeneratedDocDto {
  templateId:  number;
  studentId:   number;
  generatedBy: number;
  fileUrl:     string;
}

// ── Queries ───────────────────────────────────────────────────────

export const findByStudentId = (studentId: number) =>
  prisma.generatedDocument.findMany({
    where:   { studentId },
    include: { template: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

export const findById = (id: number) =>
  prisma.generatedDocument.findUnique({
    where:   { id },
    include: { template: { select: { id: true, name: true } } },
  });

// ── Mutations ─────────────────────────────────────────────────────

export const create = (dto: CreateGeneratedDocDto) =>
  prisma.generatedDocument.create({
    data: {
      templateId:  dto.templateId,
      studentId:   dto.studentId,
      generatedBy: dto.generatedBy,
      fileUrl:     dto.fileUrl,
    },
  });

export const updateSignedFile = (id: number, signedFileUrl: string, signedBy: string) =>
  prisma.generatedDocument.update({
    where: { id },
    data:  { signedFileUrl, signedBy, signedAt: new Date() },
  });
