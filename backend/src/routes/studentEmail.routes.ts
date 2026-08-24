import { Router } from 'express';
import { sendEmailToStudent, sendCustomEmailToStudent, getStudentEmailVariables } from '../controllers/studentEmail.controller';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/auditLog.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

router.get('/:id/email-variables',  authenticate, requirePermission('STUDENT_MANAGEMENT.view'),   asyncHandler(getStudentEmailVariables));
router.post('/:id/send-email',      authenticate, requirePermission('STUDENT_MANAGEMENT.edit'),   auditLog({ entity: 'EmailSent' }), asyncHandler(sendEmailToStudent));
router.post('/:id/send-email/custom', authenticate, requirePermission('STUDENT_MANAGEMENT.edit'), auditLog({ entity: 'EmailSent' }), asyncHandler(sendCustomEmailToStudent));

export default router;
