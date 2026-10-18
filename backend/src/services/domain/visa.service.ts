import type { FilePurpose, Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import * as visaRepository from '../../repositories/visa.repository';
import * as fileService from './file.service';
import type { ClaimActor } from './filePolicy';
import { VISA_FILES, presentFileFields, presentOne, resolveFileFields } from './fileFields';
import { resolveVisaPassportId } from './holderPassport';

// The four images: the upload URLs the form sends (imageUrl, arrivalImageUrl,
// departedImageUrl, passportImageUrl) or the matching ...FileId fields
type VisaFileInput = Record<string, unknown>;

interface VisaFields {
  visaNumber?: string;
  visaType?: string;
  status?: string;
  issuingCountry?: string;
  issuingPlace?: string;
  entries?: string;
  remarks?: string;
  isCurrent?: boolean;
  issueDate?: string | Date;
  expiryDate?: string | Date;
  passportId?: number | string | null; // the passport the visa is in; default: the current one
}

type VisaRow = Awaited<ReturnType<typeof visaRepository.findByStudentId>>[number];

export const presentVisas = (rows: VisaRow[]) => presentFileFields(rows, VISA_FILES);

const inTx = <T>(db: Prisma.TransactionClient | undefined, fn: (tx: Prisma.TransactionClient) => Promise<T>) =>
  db ? fn(db) : prisma.$transaction(fn);

const filesFor = (studentId: number, dto: VisaFileInput, actor: ClaimActor, tx: Prisma.TransactionClient) =>
  resolveFileFields(dto, VISA_FILES, { kind: 'student', studentId }, actor, tx) as Promise<visaRepository.VisaFileColumns>;

export const getVisas = async (studentId: number) =>
  presentVisas(await visaRepository.findByStudentId(studentId));

export const createVisa = async (studentId: number, dto: VisaFields & VisaFileInput, actor: ClaimActor, db?: Prisma.TransactionClient) => {
  if (!dto.visaType || !dto.issuingCountry || !dto.issueDate || !dto.expiryDate) {
    throw Object.assign(
      new Error('visaType, issuingCountry, issueDate, and expiryDate are required'),
      { statusCode: 400 }
    );
  }
  const visa = await inTx(db, async (tx) => visaRepository.create({
    studentId,
    passportId: await resolveVisaPassportId(tx, studentId, null, dto.passportId, 'create'),
    visaNumber: dto.visaNumber,
    visaType: dto.visaType!,
    status: dto.status as never,
    issuingCountry: dto.issuingCountry!,
    issuingPlace: dto.issuingPlace,
    entries: dto.entries,
    remarks: dto.remarks,
    isCurrent: dto.isCurrent,
    issueDate: new Date(dto.issueDate!),
    expiryDate: new Date(dto.expiryDate!),
  }, await filesFor(studentId, dto, actor, tx), tx));
  return presentOne(visa, VISA_FILES);
};

export const updateVisa = async (visaId: number, studentId: number, dto: VisaFields & VisaFileInput, actor: ClaimActor, db?: Prisma.TransactionClient) => {
  const visa = await inTx(db, async (tx) => {
    // Lock the row and confirm it is this student's before attaching files to it
    if (!(await visaRepository.lockByIdAndStudentId(visaId, studentId, tx))) {
      throw Object.assign(new Error('Visa not found'), { statusCode: 404 });
    }
    return visaRepository.updateById(visaId, {
      passportId: await resolveVisaPassportId(tx, studentId, null, dto.passportId, 'update'),
      visaNumber: dto.visaNumber,
      visaType: dto.visaType,
      status: dto.status as never,
      issuingCountry: dto.issuingCountry,
      issuingPlace: dto.issuingPlace,
      entries: dto.entries,
      remarks: dto.remarks,
      isCurrent: dto.isCurrent,
      ...(dto.issueDate && { issueDate: new Date(dto.issueDate) }),
      ...(dto.expiryDate && { expiryDate: new Date(dto.expiryDate) }),
    }, await filesFor(studentId, dto, actor, tx), tx);
  });
  return presentOne(visa, VISA_FILES);
};

export const deleteVisa = async (visaId: number, studentId: number, db?: Prisma.TransactionClient) =>
  inTx(db, async (tx) => {
    if (!(await visaRepository.lockByIdAndStudentId(visaId, studentId, tx))) {
      throw Object.assign(new Error('Visa not found'), { statusCode: 404 });
    }
    await visaRepository.removeById(visaId, tx);
  });

// The visa form uploads all four images through one endpoint; `slot` is the
// field the file is for, which fixes the file's purpose.
const VISA_SLOT_PURPOSE: Record<string, FilePurpose> = {
  imageUrl:         'VISA_IMAGE',
  arrivalImageUrl:  'VISA_ARRIVAL_STAMP',
  departedImageUrl: 'VISA_DEPARTURE_STAMP',
  passportImageUrl: 'VISA_PASSPORT_PAGE',
};

export const uploadVisaImage = async (
  file: Express.Multer.File, studentId: number, uploadedById: number, slot: unknown
): Promise<{ url: string; fileId: number }> => {
  const purpose = typeof slot === 'string' ? VISA_SLOT_PURPOSE[slot] : undefined;
  if (!purpose) {
    throw Object.assign(new Error(`slot must be one of: ${Object.keys(VISA_SLOT_PURPOSE).join(', ')}`), { statusCode: 400 });
  }
  const stored = await fileService.store(file.buffer, {
    originalName: file.originalname, purpose, uploadedById, ownerStudentId: studentId,
  });
  return { url: stored.url, fileId: stored.file.id };
};
