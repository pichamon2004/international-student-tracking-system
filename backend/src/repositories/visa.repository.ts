import prisma from '../utils/prisma';
import type { Prisma, VisaStatus } from '@prisma/client';
import { VISA_FILES, includeFiles } from '../services/domain/fileFields';

type Db = Prisma.TransactionClient | typeof prisma;
export const WITH_FILES = includeFiles(VISA_FILES);
// The student's own visas — a dependent's are reached through the dependent
export const OWN = { dependentId: null } as const;

// File columns as resolved by fileFields.resolveFileFields
export interface VisaFileColumns {
  imageFileId?: number | null;
  arrivalStampFileId?: number | null;
  departureStampFileId?: number | null;
  passportPageFileId?: number | null;
}

export interface CreateVisaDto {
  studentId:        number;
  visaType:         string;
  issuingCountry:   string;
  issueDate:        Date;
  expiryDate:       Date;
  visaNumber?:      string;
  status?:          VisaStatus;
  issuingPlace?:    string;
  entries?:         string;
  remarks?:         string;
  isCurrent?:       boolean;
  passportId?:      number | null;
}

export interface UpdateVisaDto {
  visaNumber?:      string;
  visaType?:        string;
  status?:          VisaStatus;
  issuingCountry?:  string;
  issuingPlace?:    string;
  entries?:         string;
  remarks?:         string;
  isCurrent?:       boolean;
  issueDate?:       Date;
  expiryDate?:      Date;
  passportId?:      number | null;
}

// ── Queries ───────────────────────────────────────────────────────

export const findByStudentId = (studentId: number) =>
  prisma.visa.findMany({
    where:   { studentId, ...OWN },
    orderBy: { createdAt: 'desc' },
    include: WITH_FILES,
  });

/** Lock the row for the rest of the transaction; false if it isn't this student's. */
export const lockByIdAndStudentId = async (id: number, studentId: number, db: Prisma.TransactionClient) =>
  (await db.$queryRaw<{ id: number }[]>`SELECT id FROM visas WHERE id = ${id} AND studentId = ${studentId} AND dependentId IS NULL FOR UPDATE`).length > 0;

export const findActiveByStudentIds = (studentIds: number[]) =>
  prisma.visa.findMany({
    where:  { studentId: { in: studentIds }, ...OWN, status: 'ACTIVE' },
    select: { studentId: true, visaType: true, expiryDate: true },
  });

// ── Mutations ─────────────────────────────────────────────────────

export const create = (dto: CreateVisaDto, files: VisaFileColumns, db: Db = prisma) =>
  db.visa.create({
    data: {
      studentId:        dto.studentId,
      visaType:         dto.visaType,
      issuingCountry:   dto.issuingCountry,
      issueDate:        dto.issueDate,
      expiryDate:       dto.expiryDate,
      visaNumber:       dto.visaNumber,
      status:           dto.status,
      issuingPlace:     dto.issuingPlace,
      entries:          dto.entries,
      remarks:          dto.remarks,
      ...files,
      isCurrent:        dto.isCurrent,
      passportId:       dto.passportId,
    },
    include: WITH_FILES,
  });

export const updateById = (id: number, dto: UpdateVisaDto, files: VisaFileColumns, db: Db = prisma) =>
  db.visa.update({
    where: { id },
    data: {
      visaNumber:       dto.visaNumber,
      visaType:         dto.visaType,
      status:           dto.status,
      issuingCountry:   dto.issuingCountry,
      issuingPlace:     dto.issuingPlace,
      entries:          dto.entries,
      remarks:          dto.remarks,
      ...files,
      isCurrent:        dto.isCurrent,
      passportId:       dto.passportId,
      issueDate:        dto.issueDate,
      expiryDate:       dto.expiryDate,
    },
    include: WITH_FILES,
  });

export const removeById = (id: number, db: Db = prisma) =>
  db.visa.delete({ where: { id } });
