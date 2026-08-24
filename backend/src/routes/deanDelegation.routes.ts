import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';
import {
  getSignatory,
  getDelegation,
  setDelegate,
  toggleDelegation,
  removeDelegation,
  getDelegateUsers,
} from '../controllers/deanDelegation.controller';

const router = Router();

router.get('/signatory',  authenticate,                    asyncHandler(getSignatory));
router.get('/delegates',  authenticate, requireRole('DEAN'), asyncHandler(getDelegateUsers));
router.get('/delegation', authenticate, requireRole('DEAN'), asyncHandler(getDelegation));
router.put('/delegation', authenticate, requireRole('DEAN'), asyncHandler(setDelegate));
router.patch('/delegation', authenticate, requireRole('DEAN'), asyncHandler(toggleDelegation));
router.delete('/delegation', authenticate, requireRole('DEAN'), asyncHandler(removeDelegation));

export default router;
