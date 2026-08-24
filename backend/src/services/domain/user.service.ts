import bcrypt from 'bcryptjs';
import prisma from '../../utils/prisma';
import * as userRepository from '../../repositories/user.repository';

export const getUsers = () =>
  userRepository.findAll();

export const getStaffUsers = () =>
  userRepository.findByRole('STAFF');

export const createUser = async (email: string, password: string | undefined, name: string, roleCode: string) => {
  const hashed = password ? await bcrypt.hash(password, 10) : undefined;
  const user = await userRepository.create({ email, password: hashed, name });

  const role = await prisma.role.findUnique({ where: { code: roleCode } });
  if (role) {
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });

    if (roleCode === 'ADVISOR') {
      await ensureAdvisorRecord(user.id, name);
    }
  }

  return user;
};

async function ensureAdvisorRecord(userId: number, displayName: string) {
  const existing = await prisma.advisor.findUnique({ where: { userId } });
  if (existing) return;
  const parts = displayName.trim().split(/\s+/);
  const firstNameEn = parts[0] ?? '';
  const lastNameEn  = parts.slice(1).join(' ') || '';
  await prisma.advisor.create({ data: { userId, firstNameEn, lastNameEn } });
}

export const updateUser = async (id: number, dto: { name?: string; roleCode?: string; isActive?: boolean }) => {
  const updated = await userRepository.update(id, { name: dto.name, isActive: dto.isActive });

  if (dto.roleCode !== undefined) {
    const role = await prisma.role.findUnique({ where: { code: dto.roleCode } });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: id, roleId: role.id } },
        update: {},
        create: { userId: id, roleId: role.id },
      });
    }
  }

  return updated;
};
