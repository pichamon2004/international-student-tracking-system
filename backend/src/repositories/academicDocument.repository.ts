import type { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';

type Db = Prisma.TransactionClient | typeof prisma;

export interface CreateAcademicDocumentDto {
  studentId:   number;
  docType:     string;
  institution: string;
  issueDate:   Date;
}

export interface UpdateAcademicDocumentDto {
  docType?:     string;
  institution?: string;
  issueDate?:   Date;
}

// Pages in order; presented as fileUrl (page 0) and pageUrls by the service
export const WITH_PAGES = {
  pages: {
    orderBy: { pageNo: 'asc' },
    select: { pageNo: true, file: { select: { id: true, storageKey: true } } },
  },
} as const satisfies Prisma.AcademicDocumentInclude;

// ── Queries ───────────────────────────────────────────────────────

export const findByStudentId = (studentId: number) =>
  prisma.academicDocument.findMany({
    where: { studentId },
    orderBy: { issueDate: 'desc' },
    include: WITH_PAGES,
  });

export const findByIdAndStudentId = (id: number, studentId: number, db: Db = prisma) =>
  db.academicDocument.findFirst({ where: { id, studentId }, include: WITH_PAGES });

/** Lock the row for the rest of the transaction; false if it isn't this student's. */
export const lockByIdAndStudentId = async (id: number, studentId: number, db: Prisma.TransactionClient) =>
  (await db.$queryRaw<{ id: number }[]>`SELECT id FROM academic_documents WHERE id = ${id} AND studentId = ${studentId} FOR UPDATE`).length > 0;

// ── Mutations ─────────────────────────────────────────────────────

export const createForStudent = (dto: CreateAcademicDocumentDto, db: Db = prisma) =>
  db.academicDocument.create({
    data: {
      studentId:   dto.studentId,
      docType:     dto.docType,
      institution: dto.institution,
      issueDate:   dto.issueDate,
    },
  });

export const updateById = (id: number, dto: UpdateAcademicDocumentDto, db: Db = prisma) =>
  db.academicDocument.update({
    where: { id },
    data: {
      docType:     dto.docType,
      institution: dto.institution,
      issueDate:   dto.issueDate,
    },
  });

/** Replace the document's pages with these files, in order. */
export const replacePages = async (docId: number, fileIds: number[], db: Db = prisma) => {
  await db.academicDocumentPage.deleteMany({ where: { docId } });
  if (fileIds.length) {
    await db.academicDocumentPage.createMany({ data: fileIds.map((fileId, pageNo) => ({ docId, pageNo, fileId })) });
  }
};

export const findWithPages = (id: number, db: Db = prisma) =>
  db.academicDocument.findUniqueOrThrow({ where: { id }, include: WITH_PAGES });

export const removeById = (id: number, db: Db = prisma) =>
  db.academicDocument.delete({ where: { id } });
