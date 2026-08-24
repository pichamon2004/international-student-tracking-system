import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';

// ── Roles ─────────────────────────────────────────────────────────

export const getRoles = async (_req: AuthRequest, res: Response): Promise<void> => {
  const roles = await prisma.role.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, code: true, name: true, description: true, isActive: true, createdAt: true },
  });
  res.json({ success: true, data: roles });
};

export const createRole = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, name, description } = req.body;
  const role = await prisma.role.create({
    data: { code: code.toUpperCase(), name, description },
    select: { id: true, code: true, name: true, description: true, isActive: true },
  });
  res.status(201).json({ success: true, data: role });
};

export const updateRole = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description, isActive } = req.body;
  const role = await prisma.role.update({
    where: { id: parseInt(req.params.id) },
    data: { name, description, isActive },
    select: { id: true, code: true, name: true, description: true, isActive: true },
  });
  res.json({ success: true, data: role });
};

export const deleteRole = async (req: AuthRequest, res: Response): Promise<void> => {
  const roleId = parseInt(req.params.id);
  const force  = req.query.force === 'true';

  const userCount = await prisma.userRole.count({ where: { roleId } });

  if (userCount > 0 && !force) {
    res.status(400).json({
      success: false,
      message: `Role นี้มีผู้ใช้งานอยู่ ${userCount} คน`,
      userCount,
    });
    return;
  }

  // force=true: ลบ user assignments และ permissions ก่อน แล้วค่อยลบ role
  await prisma.userRole.deleteMany({ where: { roleId } });
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.role.delete({ where: { id: roleId } });
  res.json({ success: true, message: 'ลบ role เรียบร้อย' });
};

// ── Role Permissions ──────────────────────────────────────────────

export const getRolePermissions = async (req: AuthRequest, res: Response): Promise<void> => {
  const roleId = parseInt(req.params.id);
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      permissions: {
        include: { permission: { include: { module: true } } },
      },
    },
  });
  if (!role) {
    res.status(404).json({ success: false, message: 'Role not found' });
    return;
  }
  res.json({ success: true, data: role });
};

export const updateRolePermissions = async (req: AuthRequest, res: Response): Promise<void> => {
  const roleId = parseInt(req.params.id);
  const { permissionIds }: { permissionIds: number[] } = req.body;

  // ลบ permissions เดิมทั้งหมดแล้วเพิ่มใหม่ทั้งหมด
  await prisma.rolePermission.deleteMany({ where: { roleId } });

  if (permissionIds.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map(permissionId => ({ roleId, permissionId })),
      skipDuplicates: true,
    });
  }

  const updated = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: { include: { permission: true } } },
  });
  res.json({ success: true, data: updated });
};

// ── Modules ───────────────────────────────────────────────────────

export const createModule = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, name, isViewOnly } = req.body;
  const upperCode = (code as string).toUpperCase();

  const exists = await prisma.module.findUnique({ where: { code: upperCode } });
  if (exists) {
    res.status(400).json({ success: false, message: 'Module code นี้มีอยู่แล้ว' });
    return;
  }

  const maxSort = await prisma.module.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

  const module = await prisma.module.create({
    data: { code: upperCode, name, level: 1, sortOrder },
  });

  const methods = isViewOnly ? ['view'] : ['view', 'create', 'edit', 'delete'];
  await prisma.permission.createMany({
    data: methods.map(method => ({
      moduleId: module.id,
      method,
      code: `${upperCode}.${method}`,
      description: `${method} - ${name}`,
    })),
  });

  res.status(201).json({ success: true, data: module });
};

export const updateModule = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name } = req.body;
  const module = await prisma.module.update({
    where: { id: parseInt(req.params.id) },
    data: { name },
    include: { permissions: { select: { id: true, method: true, code: true } } },
  });
  res.json({ success: true, data: module });
};

export const deleteModule = async (req: AuthRequest, res: Response): Promise<void> => {
  const moduleId = parseInt(req.params.id);

  const hasRolePerm = await prisma.rolePermission.findFirst({
    where: { permission: { moduleId } },
  });
  if (hasRolePerm) {
    res.status(400).json({ success: false, message: 'ไม่สามารถลบ module ที่มี role ใช้งานอยู่' });
    return;
  }

  await prisma.permission.deleteMany({ where: { moduleId } });
  await prisma.module.delete({ where: { id: moduleId } });
  res.json({ success: true, message: 'Module deleted' });
};

export const getModules = async (_req: AuthRequest, res: Response): Promise<void> => {
  const modules = await prisma.module.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      permissions: {
        orderBy: { method: 'asc' },
        select: { id: true, method: true, code: true, description: true },
      },
    },
  });
  res.json({ success: true, data: modules });
};

// ── User Roles ────────────────────────────────────────────────────

export const getUserRoles = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = parseInt(req.params.id);
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { select: { id: true, code: true, name: true, isActive: true } } },
  });
  res.json({ success: true, data: userRoles.map(ur => ur.role) });
};

export const assignRoleToUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = parseInt(req.params.id);
  const { roleId } = req.body;

  const userRole = await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: {},
    create: { userId, roleId },
  });

  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { code: true } });
  if (role?.code === 'ADVISOR') {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const existing = await prisma.advisor.findUnique({ where: { userId } });
    if (!existing && user) {
      const parts = user.name.trim().split(/\s+/);
      await prisma.advisor.create({
        data: { userId, firstNameEn: parts[0] ?? '', lastNameEn: parts.slice(1).join(' ') || '' },
      });
    }
  }

  res.status(201).json({ success: true, data: userRole });
};

export const removeRoleFromUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId  = parseInt(req.params.id);
  const roleId  = parseInt(req.params.roleId);

  await prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
  res.json({ success: true, message: 'Role removed from user' });
};
