import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireStudentOwnership, requireStudentSelf } from '../middleware/ownership.middleware';
import { upload } from '../middleware/upload.middleware';
import {
  getAcademicDocuments,
  createAcademicDocument,
  updateAcademicDocument,
  deleteAcademicDocument,
  uploadAcademicDocumentImage,
} from '../controllers/academicDocument.controller';

const router = Router();

// GET — student sees own, staff/advisor see assigned
router.get('/:id/academic-documents', authenticate, requireStudentOwnership, getAcademicDocuments);

// Image upload (static path before /:docId)
router.post('/:id/academic-documents/image', authenticate, requireStudentSelf, upload.single('image'), uploadAcademicDocumentImage);

// Write — student only
router.post('/:id/academic-documents', authenticate, requireStudentSelf, createAcademicDocument);
router.put('/:id/academic-documents/:docId', authenticate, requireStudentSelf, updateAcademicDocument);
router.delete('/:id/academic-documents/:docId', authenticate, requireStudentSelf, deleteAcademicDocument);

export default router;
