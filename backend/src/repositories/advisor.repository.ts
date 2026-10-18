import prisma from '../utils/prisma';

export interface CreateAdvisorDto {
  email:        string;
  titleEn?:     string;
  firstNameEn:  string;
  lastNameEn:   string;
  phone?:       string;
  nationality?: string;
  position?:    string | null;
}

export interface UpdateAdvisorDto {
  titleEn?:           string;
  firstNameEn?:       string;
  lastNameEn?:        string;
  phone?:             string;
  nationality?:       string;
  position?:          string | null;
  isActive?:          boolean;
  workPermitNumber?:  string;
  workPermitIssue?:   Date;
  workPermitExpiry?:  Date;
  workPermitFileId?:  number | null;
}

const FILE_REF = { select: { id: true, storageKey: true } } as const;

const STUDENT_SELECT = {
  id: true, studentId: true, titleEn: true,
  firstNameEn: true, lastNameEn: true,
  faculty: true, program: true, level: true,
  registrationStatus: true,
} as const;

// ── Queries ───────────────────────────────────────────────────────

export const findAll = () =>
  prisma.advisor.findMany({
    include: { _count: { select: { students: true } }, user: { select: { email: true } } },
    orderBy: { firstNameEn: 'asc' },
  });

export const findById = (id: number) =>
  prisma.advisor.findUnique({
    where:   { id },
    include: {
      students:       { select: { ...STUDENT_SELECT, email: true } },
      user:           { select: { email: true, image: true, imageFile: FILE_REF } },
      workPermitFile: FILE_REF,
    },
  });

// returns advisor + flat student list (no visa/passport — service handles enrichment separately)
export const findByUserId = (userId: number) =>
  prisma.advisor.findUnique({
    where:   { userId },
    include: {
      user:     { select: { email: true, image: true, imageFile: FILE_REF } },
      workPermitFile: FILE_REF,
      students: { select: { ...STUDENT_SELECT, homeCountry: true } },
    },
  });

export const findStudentIdsByUserId = (userId: number) =>
  prisma.advisor.findUnique({
    where:  { userId },
    select: { students: { select: { id: true } } },
  });

export const findUserEmailById = (advisorId: number) =>
  prisma.advisor.findUnique({
    where:  { id: advisorId },
    select: { user: { select: { email: true } } },
  });

// ── Mutations ─────────────────────────────────────────────────────

export const createWithUser = (dto: CreateAdvisorDto) =>
  prisma.$transaction(async (tx) => {
    const name = [dto.titleEn, dto.firstNameEn, dto.lastNameEn].filter(Boolean).join(' ');
    const user = await tx.user.create({
      data: { email: dto.email, name, isActive: true },
    });
    const role = await tx.role.findUnique({ where: { code: 'ADVISOR' } });
    if (role) await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });
    return tx.advisor.create({
      data: {
        userId:      user.id,
        titleEn:     dto.titleEn     ?? null,
        firstNameEn: dto.firstNameEn,
        lastNameEn:  dto.lastNameEn,
        phone:       dto.phone       ?? null,
        nationality: dto.nationality ?? null,
        position:    dto.position    ?? null,
      },
      include: { _count: { select: { students: true } }, user: { select: { email: true } } },
    });
  });

export const updateByUserId = (userId: number, dto: UpdateAdvisorDto) =>
  prisma.advisor.update({
    where: { userId },
    data: {
      titleEn:           dto.titleEn,
      firstNameEn:       dto.firstNameEn,
      lastNameEn:        dto.lastNameEn,
      phone:             dto.phone,
      nationality:       dto.nationality,
      workPermitNumber:  dto.workPermitNumber,
      workPermitIssue:   dto.workPermitIssue,
      workPermitExpiry:  dto.workPermitExpiry,
      workPermitFileId:  dto.workPermitFileId,
    },
  });

export const updateById = (id: number, dto: UpdateAdvisorDto) =>
  prisma.advisor.update({
    where: { id },
    data: {
      titleEn:           dto.titleEn,
      firstNameEn:       dto.firstNameEn,
      lastNameEn:        dto.lastNameEn,
      phone:             dto.phone,
      nationality:       dto.nationality,
      position:          dto.position,
      isActive:          dto.isActive,
      workPermitNumber:  dto.workPermitNumber,
      workPermitIssue:   dto.workPermitIssue,
      workPermitExpiry:  dto.workPermitExpiry,
      workPermitFileId:  dto.workPermitFileId,
    },
  });

// Advisors with an administrative position — the people staff can pick to sign for the dean
export const findExecutives = () =>
  prisma.advisor.findMany({
    where:   { isActive: true, position: { not: null }, NOT: { position: '' }, user: { isActive: true } },
    select:  { userId: true, position: true, user: { select: { name: true } } },
    orderBy: { firstNameEn: 'asc' },
  });

export const findExecutiveByUserId = (userId: number) =>
  prisma.advisor.findFirst({
    where:  { userId, isActive: true, position: { not: null }, NOT: { position: '' } },
    select: { userId: true, position: true },
  });
