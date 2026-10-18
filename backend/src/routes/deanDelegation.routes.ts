import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';
import { auditLog } from '../middleware/auditLog.middleware';
import * as deanDelegationRepository from '../repositories/deanDelegation.repository';
import {
  getSignatory,
  listDelegations,
  createDelegation,
  revokeDelegation,
  getDelegateUsers,
} from '../controllers/deanDelegation.controller';

const router = Router();

const fetchDelegationBefore = (req: { params: { id?: string } }) =>
  deanDelegationRepository.findById(parseInt(req.params.id ?? '0'));

// Delegation is managed by IR staff; anyone signed in can see who currently signs.
router.get('/signatory',               authenticate,                       asyncHandler(getSignatory));
router.get('/delegates',               authenticate, requireRole('STAFF'), asyncHandler(getDelegateUsers));
router.get('/delegations',             authenticate, requireRole('STAFF'), asyncHandler(listDelegations));
router.post('/delegations',            authenticate, requireRole('STAFF'),
  auditLog({ entity: 'DeanDelegation' }), asyncHandler(createDelegation));
router.post('/delegations/:id/revoke', authenticate, requireRole('STAFF'),
  auditLog({ entity: 'DeanDelegation', action: 'REVOKE', fetchBefore: fetchDelegationBefore }), asyncHandler(revokeDelegation));

export default router;
