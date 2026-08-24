import { Router } from 'express';
import { getRequestTypes, createRequestType, updateRequestType, deleteRequestType } from '../controllers/requestType.controller';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

router.get('/',    authenticate,                                              asyncHandler(getRequestTypes));
router.post('/',   authenticate, requirePermission('REQUEST_MANAGEMENT.create'), asyncHandler(createRequestType));
router.put('/:id', authenticate, requirePermission('REQUEST_MANAGEMENT.edit'),   asyncHandler(updateRequestType));
router.delete('/:id', authenticate, requirePermission('REQUEST_MANAGEMENT.delete'), asyncHandler(deleteRequestType));

export default router;
