import { Router } from 'express';
import { Response } from 'express';
import { getUsers, createUser, updateUser } from '../controllers/user.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/auditLog.middleware';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';

const router = Router();

// GET /api/users/ir-staff — returns first active STAFF user (accessible to all authenticated users)
router.get('/ir-staff', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.user.findFirst({
      where: { role: 'STAFF', isActive: true },
      select: { id: true, name: true },
    });
    res.json({ success: true, data: staff ?? null });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/', authenticate, requireRole('STAFF'), getUsers);
router.post('/', authenticate, requireRole('STAFF'), auditLog({ entity: 'User' }), createUser);
router.put('/:id', authenticate, requireRole('STAFF'), auditLog({ entity: 'User' }), updateUser);

export default router;
