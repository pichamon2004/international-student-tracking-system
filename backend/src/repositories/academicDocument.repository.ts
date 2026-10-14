import prisma from '../utils/prisma';

export interface CreateAcademicDocumentDto {
  studentId:   number;
  docType:     string;
  institution: string;
  issueDate:   Date;
  fileUrl?:    string;
  pageUrls?:   string;
}

export interface UpdateAcademicDocumentDto {
  docType?:     string;
  institution?: string;
  issueDate?:   Date;
  fileUrl?:     string | null;
  pageUrls?:    string | null;
}

// ── Queries ───────────────────────────────────────────────────────

export const findByStudentId = (studentId: number) =>
  prisma.academicDocument.findMany({
    where: { studentId },
    orderBy: { issueDate: 'desc' },
  });

export const findByIdAndStudentId = (id: number, studentId: number) =>
  prisma.academicDocument.findFirst({ where: { id, studentId } });

// ── Mutations ─────────────────────────────────────────────────────

export const createForStudent = (dto: CreateAcademicDocumentDto) =>
  prisma.academicDocument.create({
    data: {
      studentId:   dto.studentId,
      docType:     dto.docType,
      institution: dto.institution,
      issueDate:   dto.issueDate,
      fileUrl:     dto.fileUrl,
      pageUrls:    dto.pageUrls,
    },
  });

export const updateById = (id: number, dto: UpdateAcademicDocumentDto) =>
  prisma.academicDocument.update({
    where: { id },
    data: {
      docType:     dto.docType,
      institution: dto.institution,
      issueDate:   dto.issueDate,
      fileUrl:     dto.fileUrl,
      pageUrls:    dto.pageUrls,
    },
  });

export const removeById = (id: number) =>
  prisma.academicDocument.delete({ where: { id } });

