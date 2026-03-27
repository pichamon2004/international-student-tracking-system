import { Router } from 'express';
import {
  createInterserviceCheck,
  getInterserviceChecks,
  updateInterserviceCheck,
  mockKkuEndpoint,
} from '../controllers/interservice.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router({ mergeParams: true });

router.get('/:id/interservice-checks', authenticate, requireRole('STAFF', 'ADVISOR'), getInterserviceChecks);
router.post('/:id/interservice-checks', authenticate, requireRole('STAFF'), createInterserviceCheck);
router.put('/:id/interservice-checks/:checkId', authenticate, requireRole('STAFF'), updateInterserviceCheck);

export { mockKkuEndpoint };
export default router;
