import prisma from '../utils/prisma';
import type { Gender, Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient | typeof prisma;

export interface CreateDependentDto {
  studentId:    number;
  relationship: string;
  firstName:    string;
  lastName:     string;
  dateOfBirth:  Date;
  gender:       Gender;
  nationality:  string;
  title?:       string;
  middleName?:  string;
  email?:       string;
  phone?:       string;
}

export interface UpdateDependentDto {
  relationship?: string;
  title?:        string;
  firstName?:    string;
  middleName?:   string;
  lastName?:     string;
  email?:        string;
  phone?:        string;
  dateOfBirth?:  Date;
  gender?:       Gender;
  nationality?:  string;
}

const FILE = { select: { id: true, storageKey: true } } as const;

// A dependent's passport and visa live in passports / visas (dependentId = the
// dependent); the current one of each is what the dependent API shows.
export const WITH_TRAVEL_DOCS = {
  passports: {
    where:   { isCurrent: true },
    orderBy: { createdAt: 'desc' as const },
    take:    1,
    include: { imageFile: FILE },
  },
  visas: {
    where:   { isCurrent: true },
    orderBy: { createdAt: 'desc' as const },
    take:    1,
    include: { imageFile: FILE, arrivalStampFile: FILE, departureStampFile: FILE },
  },
} satisfies Prisma.DependentInclude;

// ── Queries ───────────────────────────────────────────────────────

export const findByStudentId = (studentId: number) =>
  prisma.dependent.findMany({
    where:   { studentId },
    orderBy: { createdAt: 'desc' },
    include: WITH_TRAVEL_DOCS,
  });

export const findByIdAndStudentId = (id: number, studentId: number, db: Db = prisma) =>
  db.dependent.findFirst({ where: { id, studentId }, include: WITH_TRAVEL_DOCS });

/** Lock the row for the rest of the transaction; false if it isn't this student's. */
export const lockByIdAndStudentId = async (id: number, studentId: number, db: Prisma.TransactionClient) =>
  (await db.$queryRaw<{ id: number }[]>`SELECT id FROM dependents WHERE id = ${id} AND studentId = ${studentId} FOR UPDATE`).length > 0;

export const findStudentUserId = (studentId: number) =>
  prisma.student.findUnique({ where: { id: studentId }, select: { userId: true } });

// ── Mutations ─────────────────────────────────────────────────────

export const create = (dto: CreateDependentDto, db: Db = prisma) =>
  db.dependent.create({
    data: {
      studentId:    dto.studentId,
      relationship: dto.relationship,
      firstName:    dto.firstName,
      lastName:     dto.lastName,
      dateOfBirth:  dto.dateOfBirth,
      gender:       dto.gender,
      nationality:  dto.nationality,
      title:        dto.title,
      middleName:   dto.middleName,
      email:        dto.email,
      phone:        dto.phone,
    },
  });

export const updateById = (id: number, dto: UpdateDependentDto, db: Db = prisma) =>
  db.dependent.update({
    where: { id },
    data: {
      relationship: dto.relationship,
      title:        dto.title,
      firstName:    dto.firstName,
      middleName:   dto.middleName,
      lastName:     dto.lastName,
      email:        dto.email,
      phone:        dto.phone,
      dateOfBirth:  dto.dateOfBirth,
      gender:       dto.gender,
      nationality:  dto.nationality,
    },
  });

export const findWithTravelDocs = (id: number, db: Db = prisma) =>
  db.dependent.findUniqueOrThrow({ where: { id }, include: WITH_TRAVEL_DOCS });

// Visas first: a visa's passport can't be removed while the visa points at it
export const removeById = async (id: number, db: Db = prisma) => {
  await db.visa.deleteMany({ where: { dependentId: id } });
  await db.passport.deleteMany({ where: { dependentId: id } });
  await db.dependent.delete({ where: { id } });
};
