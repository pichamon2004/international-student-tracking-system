import prisma from '../utils/prisma';

export interface UpsertPassportDto {
  passportNumber:  string;
  issuingCountry:  string;
  issueDate:       Date;
  expiryDate:      Date;
  placeOfIssue?:   string;
  isCurrent?:      boolean;
  imageUrl?:       string;
}

// ── Queries ───────────────────────────────────────────────────────

export const findByStudentId = (studentId: number) =>
  prisma.passport.findUnique({ where: { studentId } });

export const findCurrentByStudentIds = (studentIds: number[]) =>
  prisma.passport.findMany({
    where:  { studentId: { in: studentIds }, isCurrent: true },
    select: { studentId: true, expiryDate: true },
  });

// ── Mutations ─────────────────────────────────────────────────────

export const upsertByStudentId = (studentId: number, dto: UpsertPassportDto) =>
  prisma.passport.upsert({
    where:  { studentId },
    create: {
      studentId,
      passportNumber: dto.passportNumber,
      issuingCountry: dto.issuingCountry,
      issueDate:      dto.issueDate,
      expiryDate:     dto.expiryDate,
      placeOfIssue:   dto.placeOfIssue,
      isCurrent:      dto.isCurrent,
      imageUrl:       dto.imageUrl,
    },
    update: {
      passportNumber: dto.passportNumber,
      issuingCountry: dto.issuingCountry,
      issueDate:      dto.issueDate,
      expiryDate:     dto.expiryDate,
      placeOfIssue:   dto.placeOfIssue,
      isCurrent:      dto.isCurrent,
      imageUrl:       dto.imageUrl,
    },
  });
