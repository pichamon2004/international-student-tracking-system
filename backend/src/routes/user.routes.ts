import { Router } from 'express';
import { getUsers, createUser, updateUser, getStaffUsers } from '../controllers/user.controller';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/auditLog.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';
import prisma from '../utils/prisma';

const router = Router();

router.get('/ir-staff', authenticate, asyncHandler(getStaffUsers));

router.get('/',    authenticate, requirePermission('USER_MANAGEMENT.view'),   asyncHandler(getUsers));
router.post('/',   authenticate, requirePermission('USER_MANAGEMENT.create'), auditLog({ entity: 'User' }), asyncHandler(createUser));
router.put('/:id', authenticate, requirePermission('USER_MANAGEMENT.edit'),
  auditLog({
    entity: 'User',
    fetchBefore: async (req) => {
      const id = parseInt(req.params.id);
      if (!id) return null;
      return prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, isActive: true },
      });
    },
  }),
  asyncHandler(updateUser),
);

export default router;
