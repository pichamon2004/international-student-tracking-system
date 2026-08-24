import { Router } from 'express';
import {
  getEmailTemplates, getEmailTemplateById, createEmailTemplate,
  updateEmailTemplate, deleteEmailTemplate, testEmailTemplate,
} from '../controllers/emailTemplate.controller';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

router.use(authenticate);

router.get('/',      requirePermission('EMAIL_TEMPLATE_MANAGEMENT.view'),   asyncHandler(getEmailTemplates));
router.get('/:id',   requirePermission('EMAIL_TEMPLATE_MANAGEMENT.view'),   asyncHandler(getEmailTemplateById));
router.post('/',     requirePermission('EMAIL_TEMPLATE_MANAGEMENT.create'), asyncHandler(createEmailTemplate));
router.put('/:id',   requirePermission('EMAIL_TEMPLATE_MANAGEMENT.edit'),   asyncHandler(updateEmailTemplate));
router.delete('/:id',requirePermission('EMAIL_TEMPLATE_MANAGEMENT.delete'), asyncHandler(deleteEmailTemplate));
router.post('/:id/test', requirePermission('EMAIL_TEMPLATE_MANAGEMENT.view'), asyncHandler(testEmailTemplate));

export default router;
