import type { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { PASSPORT_FILES, includeFiles } from '../services/domain/fileFields';

type Db = Prisma.TransactionClient | typeof prisma;
export const WITH_FILES = includeFiles(PASSPORT_FILES);

export interface CreatePassportDto {
  studentId:       number;
  passportNumber:  string;
  issuingCountry:  string;
  issueDate:       Date;
  expiryDate:      Date;
  placeOfIssue?:   string;
  imageFileId?:    number | null;
}

export interface UpdatePassportDto {
  passportNumber?: string;
  issuingCountry?: string;
  issueDate?:      Date;
  expiryDate?:     Date;
  placeOfIssue?:   string;
  imageFileId?:    number | null;
  isCurrent?:      boolean;
}

// ── Queries ───────────────────────────────────────────────────────

// The student's own passports — a dependent's are reached through the dependent
export const OWN = { dependentId: null } as const;

// Current passport first, then newest — so [0] is always the current one
export const findByStudentId = (studentId: number) =>
  prisma.passport.findMany({
    where:   { studentId, ...OWN },
    orderBy: [{ isCurrent: 'desc' }, { createdAt: 'desc' }],
    include: WITH_FILES,
  });

export const findByIdAndStudentId = (id: number, studentId: number, db: Db = prisma) =>
  db.passport.findFirst({ where: { id, studentId, ...OWN }, include: WITH_FILES });

/** Lock the row for the rest of the transaction; false if it isn't this student's. */
export const lockByIdAndStudentId = async (id: number, studentId: number, db: Prisma.TransactionClient) =>
  (await db.$queryRaw<{ id: number }[]>`SELECT id FROM passports WHERE id = ${id} AND studentId = ${studentId} AND dependentId IS NULL FOR UPDATE`).length > 0;

export const findCurrentByStudentId = (studentId: number, db: Db = prisma) =>
  db.passport.findFirst({
    where:   { studentId, ...OWN, isCurrent: true },
    orderBy: { createdAt: 'desc' },
  });

export const findCurrentByStudentIds = (studentIds: number[]) =>
  prisma.passport.findMany({
    where:  { studentId: { in: studentIds }, ...OWN, isCurrent: true },
    select: { studentId: true, expiryDate: true },
  });

// ── Mutations ─────────────────────────────────────────────────────

export const clearCurrentByStudentId = (studentId: number, db: Db = prisma) =>
  db.passport.updateMany({
    where: { studentId, ...OWN, isCurrent: true },
    data:  { isCurrent: false },
  });

export const create = (dto: CreatePassportDto, db: Db = prisma) =>
  db.passport.create({
    data: {
      studentId:      dto.studentId,
      passportNumber: dto.passportNumber,
      issuingCountry: dto.issuingCountry,
      issueDate:      dto.issueDate,
      expiryDate:     dto.expiryDate,
      placeOfIssue:   dto.placeOfIssue,
      imageFileId:    dto.imageFileId,
      isCurrent:      true,
    },
    include: WITH_FILES,
  });

export const updateById = (id: number, dto: UpdatePassportDto, db: Db = prisma) =>
  db.passport.update({
    where: { id },
    data: {
      passportNumber: dto.passportNumber,
      issuingCountry: dto.issuingCountry,
      issueDate:      dto.issueDate,
      expiryDate:     dto.expiryDate,
      placeOfIssue:   dto.placeOfIssue,
      imageFileId:    dto.imageFileId,
      isCurrent:      dto.isCurrent,
    },
    include: WITH_FILES,
  });
