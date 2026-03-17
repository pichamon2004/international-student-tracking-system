import { Router } from 'express';
import { getDocuments, uploadDocument, deleteDocument } from '../controllers/document.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.get('/:id/documents', authenticate, getDocuments);
router.post('/:id/documents', authenticate, upload.single('file'), uploadDocument);
router.delete('/:id/documents/:docId', authenticate, deleteDocument);

export default router;
