import { Router } from 'express';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../controllers/template.controller';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

router.get('/',    authenticate,                                               asyncHandler(getTemplates));
router.post('/',   authenticate, requirePermission('TEMPLATE_MANAGEMENT.create'), asyncHandler(createTemplate));
router.put('/:id', authenticate, requirePermission('TEMPLATE_MANAGEMENT.edit'),   asyncHandler(updateTemplate));
router.delete('/:id', authenticate, requirePermission('TEMPLATE_MANAGEMENT.delete'), asyncHandler(deleteTemplate));

export default router;
