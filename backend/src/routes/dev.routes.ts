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

const STAFF_SELECT = { id: true, email: true, name: true, phone: true, role: true, isActive: true, createdAt: true } as const;

// GET /api/dev/staff — list all STAFF users
router.get('/staff', requireDevKey, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'STAFF' },
      select: STAFF_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/dev/staff — create a new STAFF user (Google OAuth — no password needed)
router.post('/staff', requireDevKey, async (req, res) => {
  try {
    const { email, name, phone } = req.body;
    if (!email || !name) {
      res.status(400).json({ success: false, message: 'email and name are required' });
      return;
    }
    const user = await prisma.user.create({
      data: { email, name, phone: phone || null, role: 'STAFF', isActive: true },
      select: STAFF_SELECT,
    });
    res.status(201).json({ success: true, data: user });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      res.status(400).json({ success: false, message: 'Email already exists' });
      return;
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/dev/staff/:id — update isActive, name and/or phone
router.put('/staff/:id', requireDevKey, async (req, res) => {
  try {
    const { isActive, name, phone } = req.body;
    const data: { isActive?: boolean; name?: string; phone?: string | null } = {};
    if (isActive !== undefined) data.isActive = isActive;
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone || null;
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data,
      select: STAFF_SELECT,
    });
    res.json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
