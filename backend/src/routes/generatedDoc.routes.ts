import { Router } from 'express';
import {
  generatePdf,
  getGeneratedDocs,
  getGeneratedDocById,
  downloadGeneratedDoc,
  uploadSignedDoc,
} from '../controllers/generatedDoc.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Under /api/requests
export const requestDocRouter = Router();
requestDocRouter.post('/:id/generate-pdf', authenticate, requireRole('STAFF', 'ADVISOR'), generatePdf);
requestDocRouter.get('/:id/generated-documents', authenticate, getGeneratedDocs);

// Under /api/generated-documents
router.get('/:docId', authenticate, getGeneratedDocById);
router.get('/:docId/download', authenticate, downloadGeneratedDoc);
router.post('/:docId/upload-signed', authenticate, requireRole('STAFF'), ...uploadSignedDoc);

export default router;
