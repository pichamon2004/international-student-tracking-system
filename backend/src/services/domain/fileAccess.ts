/**
 * Whether a caller may open a file, decided by the business records that point
 * at it — never by the file's owner fields alone. A file is openable if at least
 * one record referencing it is visible to the caller under that record's own
 * rule. Every refusal (no such file, deleted, unreferenced, not allowed) is the
 * same 404, so ids can't be probed.
 */
import type { File } from '@prisma/client';
import prisma from '../../utils/prisma';
import type { AuthPayload } from '../../types';
import { canViewStudentProfile, canViewStudentRequests } from './requestAccess';

const notFound = () => Object.assign(new Error('File not found'), { statusCode: 404 });

type Ref =
  | { kind: 'studentProfile'; studentId: number }      // passport, visa (the student's or a dependent's), insurance, academic, photo, document
  | { kind: 'studentRequest'; studentId: number }      // generated PDF, signature, request attachment
  | { kind: 'pendingChange'; studentId: number }       // a file inside a change request awaiting review
  | { kind: 'userPhoto' }                              // profile photos are shown wherever the person appears
  | { kind: 'workPermit'; userId: number };
// Files mentioned only in audit snapshots are opened through GET /audit-logs/:id/file instead

// Payload fields of change requests that hold fileIds (see fileFields.ts / changeRequestFiles.ts)
const PAYLOAD_ID_FIELDS = [
  'imageFileId', 'arrivalStampFileId', 'departureStampFileId', 'passportPageFileId',
  'passportImageFileId', 'visaImageFileId', 'photoFileId', 'cardFrontFileId', 'cardBackFileId',
];

async function referencesOf(file: File): Promise<Ref[]> {
  const id = file.id;
  const or = (...cols: string[]) => cols.map(c => ({ [c]: id }));
  const [passports, visas, insurances, pages, students, documents, generated, signatures, attachments, users, advisors] =
    await Promise.all([
      prisma.passport.findMany({ where: { imageFileId: id }, select: { studentId: true } }),
      prisma.visa.findMany({ where: { OR: or('imageFileId', 'arrivalStampFileId', 'departureStampFileId', 'passportPageFileId') }, select: { studentId: true } }),
      prisma.healthInsurance.findMany({ where: { OR: or('cardFrontFileId', 'cardBackFileId') }, select: { studentId: true } }),
      prisma.academicDocumentPage.findMany({ where: { fileId: id }, select: { doc: { select: { studentId: true } } } }),
      prisma.student.findMany({ where: { photoFileId: id }, select: { id: true } }),
      prisma.document.findMany({ where: { fileId: id }, select: { studentId: true, dependent: { select: { studentId: true } } } }),
      prisma.generatedDocument.findMany({ where: { OR: or('fileId', 'signedFileId') }, select: { studentId: true } }),
      prisma.docSignature.findMany({ where: { OR: or('imageFileId', 'evidenceFileId') }, select: { doc: { select: { studentId: true } } } }),
      prisma.requestAttachment.findMany({ where: { fileId: id }, select: { request: { select: { studentId: true } } } }),
      prisma.user.count({ where: { imageFileId: id } }),
      prisma.advisor.findMany({ where: { workPermitFileId: id }, select: { userId: true } }),
    ]);

  const refs: Ref[] = [];
  const profile = (studentId: number | null | undefined) => { if (studentId) refs.push({ kind: 'studentProfile', studentId }); };
  const request = (studentId: number) => refs.push({ kind: 'studentRequest', studentId });

  passports.forEach(r => profile(r.studentId));
  visas.forEach(r => profile(r.studentId));
  insurances.forEach(r => profile(r.studentId));
  pages.forEach(r => profile(r.doc.studentId));
  students.forEach(r => profile(r.id));
  documents.forEach(r => profile(r.studentId ?? r.dependent?.studentId));
  generated.forEach(r => request(r.studentId));
  signatures.forEach(r => request(r.doc.studentId));
  attachments.forEach(r => request(r.request.studentId));
  if (users > 0) refs.push({ kind: 'userPhoto' });
  advisors.forEach(r => refs.push({ kind: 'workPermit', userId: r.userId }));

  // A student's file attached to a change request still awaiting review
  if (file.ownerStudentId) {
    const pending = await prisma.changeRequest.findMany({
      where: { studentId: file.ownerStudentId, status: 'PENDING' },
      select: { studentId: true, payload: true },
    });
    for (const cr of pending) {
      const p = (cr.payload ?? {}) as Record<string, unknown>;
      const ids = [...PAYLOAD_ID_FIELDS.map(f => p[f]), ...(Array.isArray(p.pageFileIds) ? p.pageFileIds : [])];
      if (ids.includes(id)) refs.push({ kind: 'pendingChange', studentId: cr.studentId });
    }
  }
  return refs;
}

async function allows(ref: Ref, actor: AuthPayload): Promise<boolean> {
  switch (ref.kind) {
    case 'studentProfile': return canViewStudentProfile(ref.studentId, actor.activeRole, actor.userId);
    case 'studentRequest': return canViewStudentRequests(ref.studentId, actor.activeRole, actor.userId);
    case 'pendingChange':  // the reviewer, or the student who submitted it
      return actor.activeRole === 'STAFF' || (actor.activeRole === 'STUDENT' && await canViewStudentProfile(ref.studentId, 'STUDENT', actor.userId));
    case 'userPhoto':      return true;
    case 'workPermit':     return actor.activeRole === 'STAFF' || actor.userId === ref.userId;
  }
}

/** The file, if the caller may open it; otherwise a 404 that reveals nothing. */
export async function assertCanAccessFile(fileId: number, actor: AuthPayload): Promise<File> {
  if (!Number.isInteger(fileId)) throw notFound();
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.deletedAt) throw notFound();
  for (const ref of await referencesOf(file)) {
    if (await allows(ref, actor)) return file;
  }
  throw notFound();
}
