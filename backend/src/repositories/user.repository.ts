import prisma from '../utils/prisma';

export interface UpdateUserDto {
  name?: string;
  role?: string;
  isActive?: boolean;
}

// ── Queries ───────────────────────────────────────────────────────

export const findAll = () =>
  prisma.user.findMany({
    select: {
      id: true, email: true, name: true, isActive: true, createdAt: true,
      userRoles: { select: { role: { select: { id: true, code: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

export const findByRole = (roleCode: string) =>
  prisma.user.findMany({
    where: { isActive: true, userRoles: { some: { role: { code: roleCode } } } },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  });

export const findByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

export const findById = (id: number) =>
  prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, isActive: true },
  });

export const findByIdFull = (id: number) =>
  prisma.user.findUnique({ where: { id } });

export const findByIdWithProfile = (id: number) =>
  prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, role: true, createdAt: true,
      student: { select: { firstNameEn: true, lastNameEn: true, titleEn: true } },
      advisor: { select: { firstNameEn: true, lastNameEn: true, titleEn: true } },
    },
  });

export const findByGoogleIdOrEmail = (googleId: string, email: string) =>
  prisma.user.findFirst({ where: { OR: [{ googleId }, { email }] } });

// ── Mutations ─────────────────────────────────────────────────────

export const create = (data: { email: string; password?: string; name: string }) =>
  prisma.user.create({
    data,
    select: { id: true, email: true, name: true, createdAt: true },
  });

export const update = (id: number, dto: UpdateUserDto) =>
  prisma.user.update({
    where: { id },
    data: { name: dto.name, role: dto.role, isActive: dto.isActive },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

export const updatePassword = (id: number, hashedPassword: string) =>
  prisma.user.update({ where: { id }, data: { password: hashedPassword } });

export const updateImage = (id: number, image: string) =>
  prisma.user.update({ where: { id }, data: { image } });

export const linkGoogleAccount = (id: number, googleId: string, image: string) =>
  prisma.user.update({ where: { id }, data: { googleId, image } });

export const findNonStudentUsers = () =>
  prisma.user.findMany({
    where: {
      isActive: true,
      userRoles: { none: { role: { code: { in: ['STUDENT', 'DEAN'] } } } },
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
