import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

const router = Router();

// ── Dev key guard ─────────────────────────────────────────────────────────────
function requireDevKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-dev-key'];
  if (!process.env.DEV_SECRET || key !== process.env.DEV_SECRET) {
    res.status(401).json({ success: false, message: 'Invalid dev key' });
    return;
  }
  next();
}

const STAFF_SELECT = {
  id: true, email: true, name: true, isActive: true, createdAt: true,
  userRoles: { select: { role: { select: { code: true } } } },
} as const;

// Roles live in user_roles; flatten them to codes for the dev page
const withRoles = <T extends { userRoles: { role: { code: string } }[] }>({ userRoles, ...user }: T) =>
  ({ ...user, roles: userRoles.map(ur => ur.role.code) });

const IS_STAFF = { userRoles: { some: { role: { code: 'STAFF' } } } } as const;

// GET /api/dev/staff — list all STAFF users
router.get('/staff', requireDevKey, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: IS_STAFF,
      select: STAFF_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users.map(withRoles) });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/dev/staff — create a new STAFF user (Google OAuth — no password needed)
router.post('/staff', requireDevKey, async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      res.status(400).json({ success: false, message: 'email and name are required' });
      return;
    }
    const staffRole = await prisma.role.findUnique({ where: { code: 'STAFF' } });
    if (!staffRole) {
      res.status(500).json({ success: false, message: 'STAFF role missing — run the seed first' });
      return;
    }
    const user = await prisma.user.create({
      data: { email, name, isActive: true, userRoles: { create: { roleId: staffRole.id } } },
      select: STAFF_SELECT,
    });
    res.status(201).json({ success: true, data: withRoles(user) });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      res.status(400).json({ success: false, message: 'Email already exists' });
      return;
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/dev/staff/:id — update isActive and/or name
router.put('/staff/:id', requireDevKey, async (req, res) => {
  try {
    const { isActive, name } = req.body;
    const data: { isActive?: boolean; name?: string } = {};
    if (isActive !== undefined) data.isActive = isActive;
    if (name !== undefined) data.name = name;
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data,
      select: STAFF_SELECT,
    });
    res.json({ success: true, data: withRoles(user) });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
