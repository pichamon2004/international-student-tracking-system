import prisma from '../utils/prisma';
import { GENERATED_DOC_FILES, includeFiles } from '../services/domain/fileFields';

export interface CreateGeneratedDocDto {
  templateId:  number;
  studentId:   number;
  generatedBy: number;
  fileId:      number;
  requestId?:  number;
  formData?:   string;
}

const FILE_REF = { select: { id: true, storageKey: true, mimeType: true } } as const;
// The PDFs; presented as fileUrl / signedFileUrl by the service
export const WITH_FILES = includeFiles(GENERATED_DOC_FILES);
// A signature's image (digital) or evidence PDF (manual); presented as imageUrl
export const SIGNATURE_FILES = { imageFile: FILE_REF, evidenceFile: FILE_REF } as const;

// ── Queries ───────────────────────────────────────────────────────

export const findByStudentId = (studentId: number) =>
  prisma.generatedDocument.findMany({
    where:   { studentId },
    include: { template: { select: { id: true, name: true } }, ...WITH_FILES },
    orderBy: { createdAt: 'desc' },
  });

export const countByTemplateId = (templateId: number) =>
  prisma.generatedDocument.count({ where: { templateId } });

export const findByRequestId = (requestId: number) =>
  prisma.generatedDocument.findMany({
    where:   { requestId },
    include: { template: { select: { id: true, name: true } }, ...WITH_FILES },
    orderBy: { createdAt: 'desc' },
  });

/** The request's documents with what decides who still has to sign: the template's method + boxes, and who signed. */
export const findSigningStateByRequestId = (requestId: number) =>
  prisma.generatedDocument.findMany({
    where:   { requestId },
    select:  {
      id: true, templateId: true,
      template:   { select: { name: true, variables: true, signingMethod: true } },
      signatures: { select: { role: true } },
    },
  });

export const findById = (id: number) =>
  prisma.generatedDocument.findUnique({
    where:   { id },
    include: { template: { select: { id: true, name: true, body: true, variables: true, signingMethod: true } }, ...WITH_FILES },
  });

export const findByIdWithSignatures = (id: number) =>
  prisma.generatedDocument.findUnique({
    where:   { id },
    include: {
      template:   { select: { id: true, name: true, body: true, variables: true, signingMethod: true } },
      signatures: { include: SIGNATURE_FILES },
      ...WITH_FILES,
    },
  });

export const findSignaturesByDocId = (docId: number) =>
  prisma.docSignature.findMany({ where: { docId }, include: SIGNATURE_FILES });

/** Whether some signer's manual turn is evidenced by this file — such a file must never be retired. */
export const isSignatureEvidence = async (fileId: number) =>
  (await prisma.docSignature.count({ where: { evidenceFileId: fileId } })) > 0;

// ── Mutations ─────────────────────────────────────────────────────

export const create = (dto: CreateGeneratedDocDto) =>
  prisma.generatedDocument.create({
    data: {
      templateId:  dto.templateId,
      studentId:   dto.studentId,
      generatedBy: dto.generatedBy,
      fileId:      dto.fileId,
      requestId:   dto.requestId,
      formData:    dto.formData,
    },
    include: WITH_FILES,
  });

export const updateSignedFile = (id: number, signedFileId: number, signedBy: string) =>
  prisma.generatedDocument.update({
    where: { id },
    data:  { signedFileId, signedBy, signedAt: new Date(), signingMode: 'manual' },
    include: WITH_FILES,
  });

/** A re-rendered unsigned PDF replaces the original (e.g. once staff fill in the document number) */
export const updateFile = (id: number, fileId: number) =>
  prisma.generatedDocument.update({
    where: { id },
    data:  { fileId },
    include: WITH_FILES,
  });

export const updateFinalizedPdf = (id: number, signedFileId: number, signingMode: string) =>
  prisma.generatedDocument.update({
    where: { id },
    data:  { signedFileId, signedAt: new Date(), signingMode },
    include: WITH_FILES,
  });

// One row per role; signing again replaces the previous mark. "approval" rows carry no file.
export const upsertSignature = (data: {
  docId:           number;
  role:            string;
  signerUserId:    number;
  imageFileId?:    number | null;
  evidenceFileId?: number | null;
}) => {
  const files = { imageFileId: data.imageFileId ?? null, evidenceFileId: data.evidenceFileId ?? null };
  return prisma.docSignature.upsert({
    where:  { docId_role: { docId: data.docId, role: data.role } },
    create: { docId: data.docId, role: data.role, signerUserId: data.signerUserId, ...files },
    update: { signerUserId: data.signerUserId, signedAt: new Date(), ...files },
  });
};

// Signatures go with their document (onDelete: Cascade on DocSignature).
export const deleteByRequestId = (requestId: number) =>
  prisma.generatedDocument.deleteMany({ where: { requestId } });
