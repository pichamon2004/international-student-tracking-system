import { Router } from 'express';
import { getAuditLogs, getAuditLogById } from '../controllers/auditLog.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, requireRole('STAFF'), getAuditLogs);
router.get('/:id', authenticate, requireRole('STAFF'), getAuditLogById);

export default router;
