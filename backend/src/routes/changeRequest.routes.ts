import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';
import {
  listPending, getOne, approve, reject, cancel, getPendingForEntity,
} from '../controllers/changeRequest.controller';

const router = Router();

router.get('/entity',        authenticate, asyncHandler(getPendingForEntity));
router.get('/',              authenticate, requireRole('STAFF'), asyncHandler(listPending));
router.get('/:id',           authenticate, asyncHandler(getOne));
router.post('/:id/approve',  authenticate, requireRole('STAFF'), asyncHandler(approve));
router.post('/:id/reject',   authenticate, requireRole('STAFF'), asyncHandler(reject));
router.delete('/:id',        authenticate, asyncHandler(cancel));

export default router;
