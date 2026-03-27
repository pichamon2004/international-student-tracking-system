import { Router } from 'express';
import {
  getEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  testEmailTemplate,
} from '../controllers/emailTemplate.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(requireRole('STAFF'));

router.get('/', getEmailTemplates);
router.get('/:id', getEmailTemplateById);
router.post('/', createEmailTemplate);
router.put('/:id', updateEmailTemplate);
router.delete('/:id', deleteEmailTemplate);
router.post('/:id/test', testEmailTemplate);

export default router;
