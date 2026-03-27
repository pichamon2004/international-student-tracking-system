import { Router } from 'express';
import {
  sendEmailToStudent,
  sendCustomEmailToStudent,
  getStudentEmailVariables,
} from '../controllers/studentEmail.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();

// STAFF only — กด "ส่งอีเมล" ไปหา student
router.get(
  '/:id/email-variables',
  authenticate,
  requireRole('STAFF'),
  getStudentEmailVariables
);

router.post(
  '/:id/send-email',
  authenticate,
  requireRole('STAFF'),
  auditLog({ entity: 'EmailSent' }),
  sendEmailToStudent
);

router.post(
  '/:id/send-email/custom',
  authenticate,
  requireRole('STAFF'),
  auditLog({ entity: 'EmailSent' }),
  sendCustomEmailToStudent
);

export default router;
