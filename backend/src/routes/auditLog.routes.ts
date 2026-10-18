import { Router } from 'express';
import { getAuditLogs, getAuditLogById, getSnapshotFile } from '../controllers/auditLog.controller';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

router.get('/',    authenticate, requirePermission('AUDIT_LOG.view'), asyncHandler(getAuditLogs));
router.get('/:id', authenticate, requirePermission('AUDIT_LOG.view'), asyncHandler(getAuditLogById));
router.get('/:id/file', authenticate, requirePermission('AUDIT_LOG.view'), asyncHandler(getSnapshotFile));

export default router;
