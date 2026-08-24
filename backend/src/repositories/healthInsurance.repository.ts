import prisma from '../utils/prisma';

export interface CreateHealthInsuranceDto {
  studentId:    number;
  provider:     string;
  startDate:    Date;
  expiryDate:   Date;
  policyNumber?: string;
  coverageType?: string;
  fileUrl?:      string;
}

export interface UpdateHealthInsuranceDto {
  provider?:     string;
  policyNumber?: string;
  coverageType?: string;
  fileUrl?:      string;
  isCurrent?:    boolean;
  startDate?:    Date;
  expiryDate?:   Date;
}

// ── Queries ───────────────────────────────────────────────────────

export const findByStudentId = (studentId: number) =>
  prisma.healthInsurance.findMany({
    where:   { studentId },
    orderBy: { expiryDate: 'asc' },
  });

export const findByIdAndStudentId = (id: number, studentId: number) =>
  prisma.healthInsurance.findFirst({ where: { id, studentId } });

export const findStudentUserId = (studentId: number) =>
  prisma.student.findUnique({ where: { id: studentId }, select: { userId: true } });

// ── Mutations ─────────────────────────────────────────────────────

export const create = (dto: CreateHealthInsuranceDto) =>
  prisma.healthInsurance.create({
    data: {
      studentId:    dto.studentId,
      provider:     dto.provider,
      startDate:    dto.startDate,
      expiryDate:   dto.expiryDate,
      policyNumber: dto.policyNumber,
      coverageType: dto.coverageType,
      fileUrl:      dto.fileUrl,
    },
  });

export const updateById = (id: number, dto: UpdateHealthInsuranceDto) =>
  prisma.healthInsurance.update({
    where: { id },
    data: {
      provider:     dto.provider,
      policyNumber: dto.policyNumber,
      coverageType: dto.coverageType,
      fileUrl:      dto.fileUrl,
      isCurrent:    dto.isCurrent,
      startDate:    dto.startDate,
      expiryDate:   dto.expiryDate,
    },
  });

export const removeById = (id: number) =>
  prisma.healthInsurance.delete({ where: { id } });
