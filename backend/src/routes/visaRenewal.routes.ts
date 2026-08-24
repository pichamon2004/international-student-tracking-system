import { Router } from 'express';
import { getVisaRenewals, resolveVisaRenewal, getStudentVisaRenewals } from '../controllers/visaRenewal.controller';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

router.get('/',          authenticate, requirePermission('VISA_MANAGEMENT.view'), asyncHandler(getVisaRenewals));
router.put('/:id/resolve', authenticate, requirePermission('VISA_MANAGEMENT.edit'), asyncHandler(resolveVisaRenewal));

export default router;

export const studentVisaRenewalRouter = Router();
studentVisaRenewalRouter.get('/:id/visa-renewals', authenticate, asyncHandler(getStudentVisaRenewals));
