import prisma from '../utils/prisma';
import { WITH_FILES as INSURANCE_FILES } from './healthInsurance.repository';
import { WITH_PAGES as ACADEMIC_PAGES } from './academicDocument.repository';
import { WITH_FILES as PASSPORT_FILES } from './passport.repository';
import { WITH_FILES as VISA_FILES } from './visa.repository';
import { WITH_FILES as DOCUMENT_FILES } from './document.repository';

const PHOTO_FILE = { select: { id: true, storageKey: true } } as const;
import { AcademicLevel, RegistrationStatus } from '@prisma/client';

export interface UpdateStudentDto {
  titleEn?: string;
  firstNameEn?: string;
  middleNameEn?: string;
  lastNameEn?: string;
  studentId?: string;
  gender?: string;
  nationality?: string;
  religion?: string;
  homeCountry?: string;
  email?: string;
  phone?: string;
  addressInThailand?: string;
  homeAddress?: string;
  emergencyContact?: string;
  emergencyEmail?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  faculty?: string;
  program?: string;
  level?: AcademicLevel;
  academicStatus?: string;
  scholarship?: string;
  advisorId?: number;
  registrationStatus?: RegistrationStatus;
  registrationStep?: number;
  rejectionReason?: string | null;
  photoFileId?: number | null;
  dateOfBirth?: Date;
  enrollmentDate?: Date;
  expectedGraduation?: Date;
}

export interface CreateStudentDto {
  email: string;
  name: string;
  studentId?: string;
  titleEn?: string;
  firstNameEn: string;
  middleNameEn?: string;
  lastNameEn: string;
  nationality?: string;
  program?: string;
  level?: AcademicLevel;
  dateOfBirth?: Date;
}

// ── Queries ───────────────────────────────────────────────────────

export const findMany = (
  where: Record<string, unknown>,
  skip: number,
  take: number
) =>
  prisma.student.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' },
    include: {
      passports: { where: { isCurrent: true, dependentId: null }, select: { passportNumber: true, expiryDate: true }, take: 1 },
      visas: { where: { status: 'ACTIVE', dependentId: null }, select: { visaType: true, expiryDate: true }, take: 1 },
      healthInsurances: { where: { isCurrent: true }, select: { provider: true, expiryDate: true }, take: 1 },
      advisor: { select: { titleEn: true, firstNameEn: true, lastNameEn: true } },
    },
  });

export const countMany = (where: Record<string, unknown>) =>
  prisma.student.count({ where });

export const findById = (id: number) =>
  prisma.student.findUnique({
    where: { id },
    include: {
      // All passports, current first — [0] is the current one
      passports: { where: { dependentId: null }, orderBy: [{ isCurrent: 'desc' }, { createdAt: 'desc' }], include: PASSPORT_FILES },
      visas: { where: { status: 'ACTIVE', dependentId: null }, take: 1, include: VISA_FILES },
      photoFile: PHOTO_FILE,
      healthInsurances: { where: { isCurrent: true }, take: 1, include: INSURANCE_FILES },
      documents: { include: DOCUMENT_FILES },
      advisor: { select: { id: true, titleEn: true, firstNameEn: true, lastNameEn: true } },
    },
  });

export const findByUserId = (userId: number) =>
  prisma.student.findUnique({ where: { userId } });

export const findByUserIdWithProfile = (userId: number) =>
  prisma.student.findUnique({
    where: { userId },
    include: {
      // All passports, current first — [0] is the current one
      passports: { where: { dependentId: null }, orderBy: [{ isCurrent: 'desc' }, { createdAt: 'desc' }], include: PASSPORT_FILES },
      visas: { where: { status: 'ACTIVE', dependentId: null }, take: 1, include: VISA_FILES },
      photoFile: PHOTO_FILE,
      healthInsurances: { where: { isCurrent: true }, take: 1, include: INSURANCE_FILES },
      academicDocuments: { orderBy: { issueDate: 'desc' }, include: ACADEMIC_PAGES },
      dependents: { select: { id: true }, take: 1 },
      advisor: {
        select: {
          id: true, titleEn: true, firstNameEn: true, lastNameEn: true,
          phone: true,
        },
      },
      user: { select: { email: true } },
    },
  });

export const findByIdForEmail = (id: number) =>
  prisma.student.findUnique({
    where: { id },
    select: {
      firstNameEn: true, lastNameEn: true,
      studentId: true, email: true,
      program: true, faculty: true,
      user: { select: { email: true } },
      visas: {
        where: { status: 'ACTIVE', isCurrent: true, dependentId: null },
        orderBy: { expiryDate: 'asc' },
        take: 1,
        select: { visaType: true, expiryDate: true },
      },
      passports: {
        where: { isCurrent: true, dependentId: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { passportNumber: true, expiryDate: true },
      },
      healthInsurances: {
        where: { isCurrent: true },
        orderBy: { expiryDate: 'asc' },
        take: 1,
        select: { provider: true, policyNumber: true, coverageType: true, expiryDate: true },
      },
    },
  });

export const findByIdEmailOnly = (id: number) =>
  prisma.student.findUnique({
    where: { id },
    select: {
      firstNameEn: true, lastNameEn: true,
      email: true,
      user: { select: { email: true } },
    },
  });

export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

// NOTE: staff role is looked up via the userRoles relation, not the legacy
// User.role column — accounts created through Manage Users only get a
// UserRole row, so filtering on the legacy field misses them.
export const findFirstStaff = () =>
  prisma.user.findFirst({
    where: { isActive: true, userRoles: { some: { role: { code: 'STAFF' } } } },
    select: { name: true, email: true },
    orderBy: { createdAt: 'asc' },
  });

export const findStaffIds = () =>
  prisma.user.findMany({
    where: { isActive: true, userRoles: { some: { role: { code: 'STAFF' } } } },
    select: { id: true },
  });

// ── Mutations ─────────────────────────────────────────────────────

export const createWithUser = (dto: CreateStudentDto) =>
  prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: dto.email, name: dto.name, isActive: true },
    });
    const role = await tx.role.findUnique({ where: { code: 'STUDENT' } });
    if (role) await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });
    return tx.student.create({
      data: {
        userId: user.id,
        studentId: dto.studentId || undefined,
        titleEn: dto.titleEn || undefined,
        firstNameEn: dto.firstNameEn,
        middleNameEn: dto.middleNameEn || undefined,
        lastNameEn: dto.lastNameEn,
        nationality: dto.nationality || undefined,
        program: dto.program || undefined,
        level: dto.level || undefined,
        dateOfBirth: dto.dateOfBirth || undefined,
        registrationStatus: 'ACTIVE',
        registrationStep: 1,
      },
    });
  });

export const update = (id: number, dto: UpdateStudentDto) =>
  prisma.student.update({
    where: { id },
    data: {
      titleEn: dto.titleEn,
      firstNameEn: dto.firstNameEn,
      middleNameEn: dto.middleNameEn,
      lastNameEn: dto.lastNameEn,
      studentId: dto.studentId,
      gender: dto.gender as never,
      nationality: dto.nationality,
      religion: dto.religion,
      homeCountry: dto.homeCountry,
      email: dto.email,
      phone: dto.phone,
      addressInThailand: dto.addressInThailand,
      homeAddress: dto.homeAddress,
      emergencyContact: dto.emergencyContact,
      emergencyEmail: dto.emergencyEmail,
      emergencyPhone: dto.emergencyPhone,
      emergencyRelation: dto.emergencyRelation,
      faculty: dto.faculty,
      program: dto.program,
      level: dto.level,
      academicStatus: dto.academicStatus,
      scholarship: dto.scholarship,
      advisorId: dto.advisorId,
      registrationStatus: dto.registrationStatus,
      registrationStep: dto.registrationStep,
      rejectionReason: dto.rejectionReason,
      photoFileId: dto.photoFileId,
      dateOfBirth: dto.dateOfBirth,
      enrollmentDate: dto.enrollmentDate,
      expectedGraduation: dto.expectedGraduation,
    },
    include: { photoFile: PHOTO_FILE },
  });

export const updateByUserId = (userId: number, dto: UpdateStudentDto) =>
  prisma.student.update({
    where: { userId },
    data: {
      titleEn: dto.titleEn,
      firstNameEn: dto.firstNameEn,
      middleNameEn: dto.middleNameEn,
      lastNameEn: dto.lastNameEn,
      gender: dto.gender as never,
      nationality: dto.nationality,
      religion: dto.religion,
      homeCountry: dto.homeCountry,
      email: dto.email,
      phone: dto.phone,
      addressInThailand: dto.addressInThailand,
      homeAddress: dto.homeAddress,
      emergencyContact: dto.emergencyContact,
      emergencyEmail: dto.emergencyEmail,
      emergencyPhone: dto.emergencyPhone,
      emergencyRelation: dto.emergencyRelation,
      registrationStatus: dto.registrationStatus,
      registrationStep: dto.registrationStep,
      rejectionReason: dto.rejectionReason,
      dateOfBirth: dto.dateOfBirth,
    },
  });

export const updatePhotoFile = (id: number, photoFileId: number) =>
  prisma.student.update({ where: { id }, data: { photoFileId }, include: { photoFile: PHOTO_FILE } });

export const remove = (id: number) =>
  prisma.student.delete({ where: { id } });
