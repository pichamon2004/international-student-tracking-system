import prisma from '../utils/prisma';

export interface CreateGeneratedDocDto {
  templateId:  number;
  studentId:   number;
  generatedBy: number;
  fileUrl:     string;
  requestId?:  number;
  sigCoords?:  string;
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

export const findByIdWithSignatures = (id: number) =>
  prisma.generatedDocument.findUnique({
    where:   { id },
    include: {
      template:   { select: { id: true, name: true } },
      signatures: true,
    },
  });

export const findSignaturesByDocId = (docId: number) =>
  prisma.docSignature.findMany({ where: { docId } });

// ── Mutations ─────────────────────────────────────────────────────

export const create = (dto: CreateGeneratedDocDto) =>
  prisma.generatedDocument.create({
    data: {
      templateId:  dto.templateId,
      studentId:   dto.studentId,
      generatedBy: dto.generatedBy,
      fileUrl:     dto.fileUrl,
      requestId:   dto.requestId,
      sigCoords:   dto.sigCoords,
    },
  });

export const updateSignedFile = (id: number, signedFileUrl: string, signedBy: string) =>
  prisma.generatedDocument.update({
    where: { id },
    data:  { signedFileUrl, signedBy, signedAt: new Date() },
  });

export const updateFinalizedPdf = (id: number, signedFileUrl: string, signingMode: string) =>
  prisma.generatedDocument.update({
    where: { id },
    data:  { signedFileUrl, signedAt: new Date(), signingMode },
  });

export const upsertSignature = (data: {
  docId:        number;
  role:         string;
  signerUserId: number;
  imageUrl:     string;
}) =>
  prisma.docSignature.upsert({
    where:  { docId_role: { docId: data.docId, role: data.role } },
    create: data,
    update: { imageUrl: data.imageUrl, signerUserId: data.signerUserId, signedAt: new Date() },
  });
