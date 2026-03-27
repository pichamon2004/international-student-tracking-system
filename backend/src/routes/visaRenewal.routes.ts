import { Router } from 'express';
import { getVisaRenewals, resolveVisaRenewal, getStudentVisaRenewals } from '../controllers/visaRenewal.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, requireRole('STAFF', 'ADVISOR'), getVisaRenewals);
router.put('/:id/resolve', authenticate, requireRole('STAFF', 'ADVISOR'), resolveVisaRenewal);

export default router;

// Exported for mounting under /api/students
export const studentVisaRenewalRouter = Router();
studentVisaRenewalRouter.get('/:id/visa-renewals', authenticate, getStudentVisaRenewals);
