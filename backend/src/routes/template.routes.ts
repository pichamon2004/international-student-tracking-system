import { Router } from 'express';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, generatePDF } from '../controllers/template.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getTemplates);
router.post('/', authenticate, requireAdmin, createTemplate);
router.put('/:id', authenticate, requireAdmin, updateTemplate);
router.delete('/:id', authenticate, requireAdmin, deleteTemplate);
router.get('/:templateId/generate/:studentId', authenticate, generatePDF);

export default router;
