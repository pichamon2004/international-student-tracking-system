import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import prisma from '../../utils/prisma';
import * as userRepository from '../../repositories/user.repository';

// ── JWT helpers ───────────────────────────────────────────────────

const signAccess = (payload: { userId: number; email: string; activeRole: string; permissions: string[] }) =>
  jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as jwt.SignOptions['expiresIn'],
  });

// temp token สำหรับกรณีมีหลาย role — อายุสั้น 5 นาที ไม่มี permissions
const signTemp = (userId: number) =>
  jwt.sign({ userId, type: 'select_role' }, process.env.JWT_SECRET!, { expiresIn: '5m' });

// เก็บ activeRole ใน refresh token ด้วย เพื่อ restore role ตอน refresh
const signRefresh = (userId: number, activeRole: string) =>
  jwt.sign({ userId, activeRole }, process.env.JWT_SECRET!, { expiresIn: '30d' as jwt.SignOptions['expiresIn'] });

// ── helpers ───────────────────────────────────────────────────────

const buildPermissions = async (roleId: number): Promise<string[]> => {
  const rolePerms = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: { select: { code: true } } },
  });
  return rolePerms.map(rp => rp.permission.code);
};

const getUserRoles = (userId: number) =>
  prisma.userRole.findMany({
    where: { userId },
    include: { role: { select: { id: true, code: true, name: true, isActive: true } } },
  });

// ── login ─────────────────────────────────────────────────────────

export const login = async (email: string, password: string) => {
  const user = await userRepository.findByEmail(email);
  if (!user || !user.isActive) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const valid = await bcrypt.compare(password, user.password!);
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const userRoles = await getUserRoles(user.id);
  const activeRoles = userRoles.filter(ur => ur.role.isActive);

  if (activeRoles.length === 0) {
    throw Object.assign(new Error('No role assigned'), { statusCode: 403 });
  }

  // มีหลาย role → ให้ user เลือกก่อน
  if (activeRoles.length > 1) {
    return {
      requireRoleSelection: true,
      tempToken: signTemp(user.id),
      roles: activeRoles.map(ur => ({ id: ur.role.id, code: ur.role.code, name: ur.role.name })),
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  // มี role เดียว → auto-select
  const role = activeRoles[0].role;
  const permissions = await buildPermissions(role.id);

  return {
    token:        signAccess({ userId: user.id, email: user.email, activeRole: role.code, permissions }),
    refreshToken: signRefresh(user.id, role.code),
    user:         { id: user.id, email: user.email, name: user.name, activeRole: role.code },
  };
};

// ── select role ───────────────────────────────────────────────────

export const selectRole = async (userId: number, roleId: number) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const userRole = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId, roleId } },
    include: { role: true },
  });

  if (!userRole || !userRole.role.isActive) {
    throw Object.assign(new Error('Role not assigned to user'), { statusCode: 403 });
  }

  const permissions = await buildPermissions(roleId);

  return {
    token:        signAccess({ userId, email: user.email, activeRole: userRole.role.code, permissions }),
    refreshToken: signRefresh(userId, userRole.role.code),
    user:         { id: userId, email: user.email, name: user.name, activeRole: userRole.role.code },
  };
};

// ── refresh token ─────────────────────────────────────────────────

export const verifyAndRefresh = async (cookieToken: string) => {
  let payload: { userId: number; activeRole: string };
  try {
    payload = jwt.verify(cookieToken, process.env.JWT_SECRET!) as { userId: number; activeRole: string };
  } catch {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
  }

  const user = await userRepository.findById(payload.userId);
  if (!user || !user.isActive) {
    throw Object.assign(new Error('User not found or inactive'), { statusCode: 401 });
  }

  // ตรวจว่า user ยังมี role นี้อยู่
  const role = await prisma.role.findUnique({ where: { code: payload.activeRole } });
  if (!role) {
    throw Object.assign(new Error('Role no longer exists'), { statusCode: 401 });
  }

  const userRole = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
  });
  if (!userRole) {
    throw Object.assign(new Error('Role no longer assigned'), { statusCode: 401 });
  }

  const permissions = await buildPermissions(role.id);

  return {
    token:        signAccess({ userId: user.id, email: user.email, activeRole: role.code, permissions }),
    refreshToken: signRefresh(user.id, role.code),
  };
};

// ── getMyRoles ────────────────────────────────────────────────────

export const getMyRoles = async (userId: number) => {
  const userRoles = await getUserRoles(userId);
  return userRoles
    .filter(ur => ur.role.isActive)
    .map(ur => ({ id: ur.role.id, code: ur.role.code, name: ur.role.name }));
};

// ── getMe ─────────────────────────────────────────────────────────

export const getMyProfile = async (userId: number) => {
  const user = await userRepository.findByIdWithProfile(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  let displayName = user.name;
  if (user.student?.firstNameEn) {
    displayName = user.student.firstNameEn;
  } else if (user.advisor) {
    const { titleEn, firstNameEn, lastNameEn } = user.advisor;
    const full = [titleEn, firstNameEn, lastNameEn].filter(Boolean).join(' ');
    if (full) displayName = full;
  }

  const { student: _s, advisor: _a, ...rest } = user;
  return { ...rest, name: displayName };
};

// ── Google OAuth ──────────────────────────────────────────────────

export const processGoogleLogin = async (code: string, redirectUri: string) => {
  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id:     process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri:  redirectUri,
    grant_type:    'authorization_code',
  });

  const profileRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
  });
  const { sub: googleId, email, picture } = profileRes.data;

  let user = await userRepository.findByGoogleIdOrEmail(googleId, email);
  if (!user) throw Object.assign(new Error('not_registered'), { statusCode: 401, errorCode: 'not_registered' });

  if (!user.googleId) {
    user = await userRepository.linkGoogleAccount(user.id, googleId, picture);
  }

  if (!user.isActive) throw Object.assign(new Error('inactive'), { statusCode: 401, errorCode: 'inactive' });

  const userRoles = await getUserRoles(user.id);
  const activeRoles = userRoles.filter(ur => ur.role.isActive);

  if (activeRoles.length === 0) {
    throw Object.assign(new Error('no_role'), { statusCode: 401, errorCode: 'no_role' });
  }

  if (activeRoles.length > 1) {
    return {
      requireRoleSelection: true,
      tempToken: signTemp(user.id),
      roles: activeRoles.map(ur => ({ id: ur.role.id, code: ur.role.code, name: ur.role.name })),
    };
  }

  const role = activeRoles[0].role;
  const permissions = await buildPermissions(role.id);

  return {
    token:        signAccess({ userId: user.id, email: user.email, activeRole: role.code, permissions }),
    refreshToken: signRefresh(user.id, role.code),
    activeRole:   role.code,
  };
};

// ── changePassword ────────────────────────────────────────────────

export const changePassword = async (userId: number, currentPassword: string, newPassword: string) => {
  const user = await userRepository.findByIdFull(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  if (!user.password) {
    throw Object.assign(
      new Error('This account uses Google login. Please use Google to sign in.'),
      { statusCode: 400 }
    );
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await userRepository.updatePassword(userId, hashed);
};
