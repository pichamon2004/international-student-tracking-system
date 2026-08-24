import prisma from '../utils/prisma';

const STUDENT_SELECT = {
  id: true, studentId: true,
  firstNameEn: true, lastNameEn: true, titleEn: true,
  faculty: true, program: true,
} as const;

// ── Queries ───────────────────────────────────────────────────────

export const findMany = (where: Record<string, unknown>) =>
  prisma.visaRenewal.findMany({
    where,
    include: { student: { select: STUDENT_SELECT } },
    orderBy: { daysRemaining: 'asc' },
  });

export const findById = (id: number) =>
  prisma.visaRenewal.findUnique({ where: { id } });

export const findByStudentId = (studentId: number) =>
  prisma.visaRenewal.findMany({
    where:   { studentId },
    orderBy: { notifiedAt: 'desc' },
  });

// ── Mutations ─────────────────────────────────────────────────────

export const resolveById = (id: number) =>
  prisma.visaRenewal.update({
    where: { id },
    data:  { isResolved: true, resolvedAt: new Date() },
  });
