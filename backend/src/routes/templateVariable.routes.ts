import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';
import {
  getVariables,
  createVariable,
  updateVariable,
  deleteVariable,
} from '../controllers/templateVariable.controller';

const router = Router();

router.get('/',       authenticate,                                                   asyncHandler(getVariables));
router.post('/',      authenticate, requirePermission('TEMPLATE_MANAGEMENT.create'), asyncHandler(createVariable));
router.put('/:id',    authenticate, requirePermission('TEMPLATE_MANAGEMENT.edit'),   asyncHandler(updateVariable));
router.delete('/:id', authenticate, requirePermission('TEMPLATE_MANAGEMENT.delete'), asyncHandler(deleteVariable));

export default router;
