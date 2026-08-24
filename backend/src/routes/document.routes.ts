import { Router } from 'express';
import { getDocuments, uploadDocument, deleteDocument } from '../controllers/document.controller';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { requireStudentOwnership } from '../middleware/ownership.middleware';
import { upload } from '../middleware/upload.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

router.get('/:id/documents',        authenticate, requireStudentOwnership,                         asyncHandler(getDocuments));
router.post('/:id/documents',       authenticate, requireStudentOwnership, upload.single('file'),  asyncHandler(uploadDocument));
router.delete('/:id/documents/:docId', authenticate, requirePermission('DOCUMENT_MANAGEMENT.delete'), asyncHandler(deleteDocument));

export default router;
