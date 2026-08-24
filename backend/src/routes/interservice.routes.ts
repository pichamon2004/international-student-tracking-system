import { Router } from 'express';
import {
  createInterserviceCheck, getInterserviceChecks,
  updateInterserviceCheck, mockKkuEndpoint,
} from '../controllers/interservice.controller';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router({ mergeParams: true });

router.get('/:id/interservice-checks',          authenticate, requirePermission('INTERSERVICE_MANAGEMENT.view'),   asyncHandler(getInterserviceChecks));
router.post('/:id/interservice-checks',         authenticate, requirePermission('INTERSERVICE_MANAGEMENT.create'), asyncHandler(createInterserviceCheck));
router.put('/:id/interservice-checks/:checkId', authenticate, requirePermission('INTERSERVICE_MANAGEMENT.edit'),   asyncHandler(updateInterserviceCheck));

export { mockKkuEndpoint };
export default router;
