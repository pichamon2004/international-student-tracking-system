import { Router } from 'express';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../controllers/template.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getTemplates);
router.post('/', authenticate, requireRole('STAFF'), createTemplate);
router.put('/:id', authenticate, requireRole('STAFF'), updateTemplate);
router.delete('/:id', authenticate, requireRole('STAFF'), deleteTemplate);

export default router;
