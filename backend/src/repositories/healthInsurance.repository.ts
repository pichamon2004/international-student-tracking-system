import type { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';

type Db = Prisma.TransactionClient | typeof prisma;

export interface CreateHealthInsuranceDto {
  studentId:        number;
  provider:         string;
  startDate:        Date;
  expiryDate:       Date;
  policyNumber?:    string;
  coverageType?:    string;
  cardFrontFileId?: number | null;
  cardBackFileId?:  number | null;
}

export interface UpdateHealthInsuranceDto {
  provider?:        string;
  policyNumber?:    string;
  coverageType?:    string;
  cardFrontFileId?: number | null;
  cardBackFileId?:  number | null;
  isCurrent?:       boolean;
  startDate?:       Date;
  expiryDate?:      Date;
}

const FILE = { select: { id: true, storageKey: true } } as const;
// The card images; presented as fileUrl/backFileUrl by the service
export const WITH_FILES = { cardFrontFile: FILE, cardBackFile: FILE } as const;

// ── Queries ───────────────────────────────────────────────────────

export const findByStudentId = (studentId: number) =>
  prisma.healthInsurance.findMany({
    where:   { studentId },
    orderBy: { expiryDate: 'asc' },
    include: WITH_FILES,
  });

export const findByIdAndStudentId = (id: number, studentId: number, db: Db = prisma) =>
  db.healthInsurance.findFirst({ where: { id, studentId }, include: WITH_FILES });

/** Lock the row for the rest of the transaction; false if it isn't this student's. */
export const lockByIdAndStudentId = async (id: number, studentId: number, db: Prisma.TransactionClient) =>
  (await db.$queryRaw<{ id: number }[]>`SELECT id FROM health_insurances WHERE id = ${id} AND studentId = ${studentId} FOR UPDATE`).length > 0;

export const findStudentUserId = (studentId: number) =>
  prisma.student.findUnique({ where: { id: studentId }, select: { userId: true } });

// ── Mutations ─────────────────────────────────────────────────────

export const clearCurrentByStudentId = (studentId: number, db: Db = prisma) =>
  db.healthInsurance.updateMany({
    where: { studentId, isCurrent: true },
    data:  { isCurrent: false },
  });

export const create = (dto: CreateHealthInsuranceDto, db: Db = prisma) =>
  db.healthInsurance.create({
    data: {
      studentId:       dto.studentId,
      provider:        dto.provider,
      startDate:       dto.startDate,
      expiryDate:      dto.expiryDate,
      policyNumber:    dto.policyNumber,
      coverageType:    dto.coverageType,
      cardFrontFileId: dto.cardFrontFileId,
      cardBackFileId:  dto.cardBackFileId,
      isCurrent:       true,
    },
    include: WITH_FILES,
  });

export const updateById = (id: number, dto: UpdateHealthInsuranceDto, db: Db = prisma) =>
  db.healthInsurance.update({
    where: { id },
    data: {
      provider:        dto.provider,
      policyNumber:    dto.policyNumber,
      coverageType:    dto.coverageType,
      cardFrontFileId: dto.cardFrontFileId,
      cardBackFileId:  dto.cardBackFileId,
      isCurrent:       dto.isCurrent,
      startDate:       dto.startDate,
      expiryDate:      dto.expiryDate,
    },
    include: WITH_FILES,
  });

export const removeById = (id: number, db: Db = prisma) =>
  db.healthInsurance.delete({ where: { id } });
