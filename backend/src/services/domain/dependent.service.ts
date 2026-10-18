import * as dependentRepository from '../../repositories/dependent.repository';
import * as documentRepository from '../../repositories/document.repository';
import { createNotification } from '../notification.service';
import type { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import * as fileService from './file.service';
import type { ClaimActor } from './filePolicy';
import { DEPENDENT_DOCUMENT_FILES, DEPENDENT_FILES, presentFileFields, presentOne, resolveFileFields } from './fileFields';
import { assertHolderPassport, currentHolderPassportId } from './holderPassport';

const EXPIRY_WARN_DAYS = 90;

async function _checkDependentExpiry(
  studentId: number,
  passportExpiry: Date | null,
  visaExpiry: Date | null,
  name: string
): Promise<void> {
  const student = await dependentRepository.findStudentUserId(studentId);
  if (!student) return;

  const now = Date.now();
  const check = (expiry: Date | null, docType: string) => {
    if (!expiry) return;
    const days = Math.ceil((expiry.getTime() - now) / 86_400_000);
    if (days <= EXPIRY_WARN_DAYS) {
      createNotification({
        userId: student.userId,
        type: 'VISA_ALERT',
        title: `Dependent ${docType} Expiring Soon`,
        message: `${name}'s ${docType} expires in ${days} day(s). Please take action.`,
        link: '/student/profile',
      }).catch(console.error);
    }
  };

  check(passportExpiry, 'Passport');
  check(visaExpiry, 'Visa');
}

type DependentRow = Awaited<ReturnType<typeof dependentRepository.findByStudentId>>[number];

/**
 * A dependent as the API has always returned it: their current passport and visa
 * flattened onto the dependent (passportNumber, visaExpiry, visaImageUrl, …).
 */
export async function presentDependent({ passports, visas, ...dep }: DependentRow) {
  const passport = passports[0];
  const visa = visas[0];
  return {
    ...dep,
    passportId:       passport?.id ?? null,
    passportNumber:   passport?.passportNumber || null,
    passportExpiry:   passport?.expiryDate ?? null,
    passportImageUrl: await fileService.urlFor(passport?.imageFile),
    visaId:           visa?.id ?? null,
    visaType:         visa?.visaType || null,
    visaExpiry:       visa?.expiryDate ?? null,
    visaStatus:       visa?.status ?? 'ACTIVE',
    visaImageUrl:     await fileService.urlFor(visa?.imageFile),
    arrivalImageUrl:  await fileService.urlFor(visa?.arrivalStampFile),
    departedImageUrl: await fileService.urlFor(visa?.departureStampFile),
  };
}

export const presentDependents = (rows: DependentRow[]) => Promise.all(rows.map(presentDependent));

const inTx = <T>(db: Prisma.TransactionClient | undefined, fn: (tx: Prisma.TransactionClient) => Promise<T>) =>
  db ? fn(db) : prisma.$transaction(fn);

// The four images: upload URLs (passportImageUrl, visaImageUrl, arrivalImageUrl, departedImageUrl) or ...FileId fields
type DependentFileIds = { passportImageFileId?: number | null; visaImageFileId?: number | null; arrivalStampFileId?: number | null; departureStampFileId?: number | null };
const filesFor = (studentId: number, dto: Record<string, unknown>, actor: ClaimActor, tx: Prisma.TransactionClient) =>
  resolveFileFields(dto, DEPENDENT_FILES, { kind: 'student', studentId }, actor, tx) as Promise<DependentFileIds>;

interface DependentFields {
  relationship?: string;
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string | Date;
  gender?: string;
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string | Date;
  visaType?: string;
  visaExpiry?: string | Date;
  visaStatus?: string;
}

const bad = (message: string) => Object.assign(new Error(message), { statusCode: 400 });
// Forms send '' for an untouched field: treat it as "not given"
const given = <T>(v: T | '' | null | undefined): v is T => v !== undefined && v !== null && v !== '';

/**
 * Write the dependent's current passport and visa from the dependent form's
 * fields — creating them the first time they are filled in. The visa is put in
 * the dependent's current passport (checked under lock: same holder, same account).
 */
async function saveTravelDocs(tx: Prisma.TransactionClient, studentId: number, dependentId: number, dto: DependentFields, files: DependentFileIds) {
  const holder = { studentId, dependentId };

  // Passport
  const passport = await tx.passport.findFirst({ where: { ...holder, isCurrent: true }, orderBy: { createdAt: 'desc' } });
  const passportData = {
    ...(given(dto.passportNumber) && { passportNumber: dto.passportNumber }),
    ...(given(dto.passportExpiry) && { expiryDate: new Date(dto.passportExpiry) }),
    ...(files.passportImageFileId !== undefined && { imageFileId: files.passportImageFileId }),
  };
  if (passport) {
    if (Object.keys(passportData).length) await tx.passport.update({ where: { id: passport.id }, data: passportData });
  } else if (Object.keys(passportData).length) {
    if (!given(dto.passportExpiry)) throw bad('passportExpiry is required when adding a passport');
    await tx.passport.create({ data: { ...holder, passportNumber: dto.passportNumber ?? '', expiryDate: new Date(dto.passportExpiry), imageFileId: files.passportImageFileId ?? null, isCurrent: true } });
  }

  // Visa — in the dependent's current passport
  const visa = await tx.visa.findFirst({ where: { ...holder, isCurrent: true }, orderBy: { createdAt: 'desc' } });
  const visaData = {
    ...(given(dto.visaType) && { visaType: dto.visaType }),
    ...(given(dto.visaExpiry) && { expiryDate: new Date(dto.visaExpiry) }),
    ...(given(dto.visaStatus) && { status: dto.visaStatus as never }),
    ...(files.visaImageFileId !== undefined && { imageFileId: files.visaImageFileId }),
    ...(files.arrivalStampFileId !== undefined && { arrivalStampFileId: files.arrivalStampFileId }),
    ...(files.departureStampFileId !== undefined && { departureStampFileId: files.departureStampFileId }),
  };
  const passportId = await currentHolderPassportId(tx, studentId, dependentId);
  if (visa) {
    // Also links a visa recorded before the passport, once there is one
    const link = visa.passportId === null && passportId !== null ? { passportId } : {};
    if (visa.passportId !== null) await assertHolderPassport(tx, visa.passportId, studentId, dependentId);
    if (Object.keys(visaData).length || 'passportId' in link) await tx.visa.update({ where: { id: visa.id }, data: { ...visaData, ...link } });
  } else if (Object.keys(visaData).length) {
    if (!given(dto.visaType) || !given(dto.visaExpiry)) throw bad('visaType and visaExpiry are required when adding a visa');
    await tx.visa.create({
      data: {
        ...holder, passportId,
        visaType: dto.visaType, expiryDate: new Date(dto.visaExpiry), status: (dto.visaStatus as never) || 'ACTIVE',
        imageFileId: files.visaImageFileId ?? null, arrivalStampFileId: files.arrivalStampFileId ?? null,
        departureStampFileId: files.departureStampFileId ?? null, isCurrent: true,
      },
    });
  }
}

export const getDependents = async (studentId: number) =>
  presentDependents(await dependentRepository.findByStudentId(studentId));

export const getDependentById = async (depId: number, studentId: number) => {
  const dep = await dependentRepository.findByIdAndStudentId(depId, studentId);
  if (!dep) {
    throw Object.assign(new Error('Dependent not found'), { statusCode: 404 });
  }
  return presentDependent(dep);
};

export const createDependent = async (
  studentId: number,
  dto: DependentFields & Record<string, unknown>,
  actor: ClaimActor,
  db?: Prisma.TransactionClient
) => {
  if (!dto.relationship || !dto.firstName || !dto.lastName || !dto.dateOfBirth || !dto.gender || !dto.nationality) {
    throw Object.assign(
      new Error('relationship, firstName, lastName, dateOfBirth, gender, nationality are required'),
      { statusCode: 400 }
    );
  }

  const dep = await inTx(db, async (tx) => {
    const files = await filesFor(studentId, dto, actor, tx);
    const created = await dependentRepository.create({
      studentId,
      relationship: dto.relationship!,
      title: dto.title,
      firstName: dto.firstName!,
      middleName: dto.middleName,
      lastName: dto.lastName!,
      email: dto.email,
      phone: dto.phone,
      dateOfBirth: new Date(dto.dateOfBirth!),
      gender: dto.gender as never,
      nationality: dto.nationality!,
    }, tx);
    await saveTravelDocs(tx, studentId, created.id, dto, files);
    return dependentRepository.findWithTravelDocs(created.id, tx);
  });

  const out = await presentDependent(dep);
  _checkDependentExpiry(studentId, out.passportExpiry, out.visaExpiry, out.firstName).catch(console.error);
  return out;
};

export const updateDependent = async (
  depId: number,
  studentId: number,
  dto: DependentFields & Record<string, unknown>,
  actor: ClaimActor,
  db?: Prisma.TransactionClient
) => {
  const updated = await inTx(db, async (tx) => {
    if (!(await dependentRepository.lockByIdAndStudentId(depId, studentId, tx))) {
      throw Object.assign(new Error('Dependent not found'), { statusCode: 404 });
    }
    const files = await filesFor(studentId, dto, actor, tx);
    await dependentRepository.updateById(depId, {
      relationship: dto.relationship,
      title: dto.title,
      firstName: dto.firstName,
      middleName: dto.middleName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      gender: dto.gender as never,
      nationality: dto.nationality,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
    }, tx);
    await saveTravelDocs(tx, studentId, depId, dto, files);
    return dependentRepository.findWithTravelDocs(depId, tx);
  });

  const out = await presentDependent(updated);
  _checkDependentExpiry(studentId, out.passportExpiry, out.visaExpiry, out.firstName).catch(console.error);
  return out;
};

export const deleteDependent = async (depId: number, studentId: number, db?: Prisma.TransactionClient): Promise<void> => {
  await inTx(db, async (tx) => {
    if (!(await dependentRepository.lockByIdAndStudentId(depId, studentId, tx))) {
      throw Object.assign(new Error('Dependent not found'), { statusCode: 404 });
    }
    await dependentRepository.removeById(depId, tx);
  });
};

// Dependent documents are always reached through the student's own dependent
async function requireDependent(depId: number, studentId: number) {
  const dep = await dependentRepository.findByIdAndStudentId(depId, studentId);
  if (!dep) throw Object.assign(new Error('Dependent not found'), { statusCode: 404 });
  return dep;
}

export const getDependentDocuments = async (depId: number, studentId: number) => {
  await requireDependent(depId, studentId);
  return presentFileFields(await documentRepository.findByDependentId(depId), DEPENDENT_DOCUMENT_FILES);
};

export const uploadDependentDocument = async (
  depId: number,
  studentId: number,
  file: Express.Multer.File,
  name?: string,
  description?: string,
  uploadedBy?: number
) => {
  await requireDependent(depId, studentId);
  const { file: stored } = await fileService.store(file.buffer, {
    originalName: file.originalname, purpose: 'DEPENDENT_DOCUMENT', uploadedById: uploadedBy!, ownerStudentId: studentId,
  });
  const doc = await documentRepository.create({
    dependentId: depId,
    name: name || file.originalname,
    description,
    fileId: stored.id,
    fileType: stored.mimeType,
    fileSize: stored.sizeBytes,
    uploadedBy: uploadedBy!,
  });
  return presentOne(doc, DEPENDENT_DOCUMENT_FILES);
};

export const deleteDependentDocument = async (docId: number, depId: number, studentId: number): Promise<void> => {
  await requireDependent(depId, studentId);
  const doc = await documentRepository.findById(docId);
  if (!doc || doc.dependentId !== depId) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }
  // Keep the object — the file row is soft-deleted and the cleanup job decides later
  if (doc.fileId) await fileService.softDelete(doc.fileId);
  await documentRepository.removeById(doc.id);
};
