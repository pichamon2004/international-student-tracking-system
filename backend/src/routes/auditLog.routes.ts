import { Router } from 'express';
import { getAuditLogs, getAuditLogById } from '../controllers/auditLog.controller';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

router.get('/',    authenticate, requirePermission('AUDIT_LOG.view'), asyncHandler(getAuditLogs));
router.get('/:id', authenticate, requirePermission('AUDIT_LOG.view'), asyncHandler(getAuditLogById));

export default router;
