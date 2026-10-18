import axios from 'axios';
import FormData from 'form-data';
import prisma from '../../utils/prisma';
import * as passportRepository from '../../repositories/passport.repository';
import type { Prisma } from '@prisma/client';
import * as fileService from './file.service';
import type { ClaimActor } from './filePolicy';
import { PASSPORT_FILES, presentFileFields, presentOne, resolveFileFields } from './fileFields';
import { assertPassportUnused } from './holderPassport';

interface PassportInput {
  passportNumber?: string;
  issuingCountry?: string;
  issueDate?: string | Date;
  expiryDate?: string | Date;
  placeOfIssue?: string;
  imageUrl?: string | null;      // the upload URL the form sends…
  imageFileId?: number | null;   // …or the fileId
  isCurrent?: boolean;           // true: this becomes the one current passport; false: none is current
}

type PassportRow = Awaited<ReturnType<typeof passportRepository.findByStudentId>>[number];

export const presentPassports = (rows: PassportRow[]) => presentFileFields(rows, PASSPORT_FILES);

const inTx = <T>(db: Prisma.TransactionClient | undefined, fn: (tx: Prisma.TransactionClient) => Promise<T>) =>
  db ? fn(db) : prisma.$transaction(fn);

const imageFor = async (studentId: number, dto: PassportInput, actor: ClaimActor, tx: Prisma.TransactionClient) =>
  resolveFileFields(dto as Record<string, unknown>, PASSPORT_FILES, { kind: 'student', studentId }, actor, tx) as
    Promise<{ imageFileId?: number | null; imageUrl?: null }>;

// Passport numbers are compared without spaces/dashes and case-insensitively ("ab 123-4" = "AB1234")
const normalizeNumber = (n: string) => n.replace(/[\s-]/g, '').toUpperCase();

/**
 * One record per real passport: a student can't add a second passport with a
 * number they already have (they should edit that one instead). Checked on
 * submit and again inside the write's transaction.
 */
export async function assertPassportNumberAvailable(
  studentId: number,
  passportNumber: string | undefined,
  excludePassportId?: number,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<void> {
  if (!passportNumber || !passportNumber.trim()) return;
  const wanted = normalizeNumber(passportNumber);
  // Editing a passport without changing its number is always fine — even for
  // duplicates recorded before this check existed
  if (excludePassportId) {
    const self = await db.passport.findUnique({ where: { id: excludePassportId }, select: { passportNumber: true } });
    if (self && normalizeNumber(self.passportNumber) === wanted) return;
  }
  const own = await db.passport.findMany({
    where: { studentId, dependentId: null, ...(excludePassportId ? { id: { not: excludePassportId } } : {}) },
    select: { passportNumber: true },
  });
  if (own.some(p => normalizeNumber(p.passportNumber) === wanted)) {
    throw Object.assign(
      new Error('You already have a passport with this number — edit that passport instead of adding it again'),
      { statusCode: 409 }
    );
  }
}

export const getPassports = async (studentId: number) =>
  presentPassports(await passportRepository.findByStudentId(studentId));

// Adds a new passport and moves the previous current one into history
export const createPassport = async (studentId: number, dto: PassportInput, actor: ClaimActor, db?: Prisma.TransactionClient) => {
  if (!dto.passportNumber || !dto.issuingCountry || !dto.issueDate || !dto.expiryDate) {
    throw Object.assign(
      new Error('passportNumber, issuingCountry, issueDate, and expiryDate are required'),
      { statusCode: 400 }
    );
  }
  const passport = await inTx(db, async (tx) => {
    await assertPassportNumberAvailable(studentId, dto.passportNumber, undefined, tx);
    const image = await imageFor(studentId, dto, actor, tx);
    await passportRepository.clearCurrentByStudentId(studentId, tx);
    return passportRepository.create({
      studentId,
      passportNumber: dto.passportNumber!,
      issuingCountry: dto.issuingCountry!,
      issueDate: new Date(dto.issueDate!),
      expiryDate: new Date(dto.expiryDate!),
      placeOfIssue: dto.placeOfIssue,
      imageFileId: image.imageFileId,
    }, tx);
  });
  return presentOne(passport, PASSPORT_FILES);
};

export const updatePassport = async (studentId: number, passportId: number, dto: PassportInput, actor: ClaimActor, db?: Prisma.TransactionClient) => {
  const passport = await inTx(db, async (tx) => {
    if (!(await passportRepository.lockByIdAndStudentId(passportId, studentId, tx))) {
      throw Object.assign(new Error('Passport not found'), { statusCode: 404 });
    }
    await assertPassportNumberAvailable(studentId, dto.passportNumber, passportId, tx);
    const image = await imageFor(studentId, dto, actor, tx);
    const isCurrent = dto.isCurrent === undefined ? undefined : dto.isCurrent === true || String(dto.isCurrent) === 'true';
    // Only one current passport: making this one current retires whichever was
    if (isCurrent) await passportRepository.clearCurrentByStudentId(studentId, tx);
    return passportRepository.updateById(passportId, {
      isCurrent,
      passportNumber: dto.passportNumber,
      issuingCountry: dto.issuingCountry,
      placeOfIssue: dto.placeOfIssue,
      ...image,
      ...(dto.issueDate && { issueDate: new Date(dto.issueDate) }),
      ...(dto.expiryDate && { expiryDate: new Date(dto.expiryDate) }),
    }, tx);
  });
  return presentOne(passport, PASSPORT_FILES);
};

// Legacy change requests (UPDATE with no entityId) target the current passport
export const updateCurrentPassport = async (studentId: number, dto: PassportInput, actor: ClaimActor, db?: Prisma.TransactionClient) => {
  const current = await passportRepository.findCurrentByStudentId(studentId, db);
  return current ? updatePassport(studentId, current.id, dto, actor, db) : createPassport(studentId, dto, actor, db);
};

export const deletePassport = async (studentId: number, passportId: number, db?: Prisma.TransactionClient) =>
  inTx(db, async (tx) => {
    if (!(await passportRepository.lockByIdAndStudentId(passportId, studentId, tx))) {
      throw Object.assign(new Error('Passport not found'), { statusCode: 404 });
    }
    await assertPassportUnused(tx, passportId);
    await tx.passport.delete({ where: { id: passportId } });
  });

export const uploadPassportImage = async (
  file: Express.Multer.File, studentId: number, uploadedById: number
): Promise<{ url: string; fileId: number }> => {
  const stored = await fileService.store(file.buffer, {
    originalName: file.originalname, purpose: 'PASSPORT_IMAGE', uploadedById, ownerStudentId: studentId,
  });
  return { url: stored.url, fileId: stored.file.id };
};

export const scanPassport = async (file: Express.Multer.File): Promise<unknown> => {
  const form = new FormData();
  form.append('image', file.buffer, { filename: file.originalname, contentType: file.mimetype });

  const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
  const response = await axios.post(`${pythonUrl}/scan-passport`, form, {
    headers: form.getHeaders(),
    timeout: 30000,
  });

  return response.data?.data ?? response.data;
};
