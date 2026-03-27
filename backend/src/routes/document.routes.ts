import { Router } from 'express';
import { getDocuments, uploadDocument, deleteDocument } from '../controllers/document.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { requireStudentOwnership } from '../middleware/ownership.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.get('/:id/documents', authenticate, requireStudentOwnership, getDocuments);
router.post('/:id/documents', authenticate, requireStudentOwnership, upload.single('file'), uploadDocument);
router.delete('/:id/documents/:docId', authenticate, requireRole('STAFF'), deleteDocument);

export default router;
