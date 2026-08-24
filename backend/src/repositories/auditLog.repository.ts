import prisma from '../utils/prisma';

const USER_SELECT = { id: true, name: true, email: true, role: true } as const;

// ── Queries ───────────────────────────────────────────────────────

export const findMany = (where: Record<string, unknown>, skip: number, take: number) =>
  prisma.auditLog.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: USER_SELECT } },
  });

export const countMany = (where: Record<string, unknown>) =>
  prisma.auditLog.count({ where });

export const findById = (id: number) =>
  prisma.auditLog.findUnique({
    where: { id },
    include: { user: { select: USER_SELECT } },
  });
