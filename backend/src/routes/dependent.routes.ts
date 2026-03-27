import { Router } from 'express';
import {
  getDependents,
  getDependentById,
  createDependent,
  updateDependent,
  deleteDependent,
  getDependentDocuments,
  uploadDependentDocument,
  deleteDependentDocument,
  uploadDependentImage,
} from '../controllers/dependent.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStudentOwnership, requireStudentSelf } from '../middleware/ownership.middleware';
import { upload, uploadImage } from '../middleware/upload.middleware';

const router = Router({ mergeParams: true });

router.use(authenticate);

// READ: student เห็นของตัวเอง, STAFF/ADVISOR เห็นทั้งหมด
router.get('/:id/dependents',           requireStudentOwnership, getDependents);
router.get('/:id/dependents/:depId',    requireStudentOwnership, getDependentById);

// Image upload for dependent passport/visa (static path before /:depId)
router.post('/:id/dependents/image',    requireStudentSelf, uploadImage.single('image'), uploadDependentImage);

// WRITE: student เท่านั้น
router.post('/:id/dependents',          requireStudentSelf, createDependent);
router.put('/:id/dependents/:depId',    requireStudentSelf, updateDependent);
router.delete('/:id/dependents/:depId', requireStudentSelf, deleteDependent);

// Dependent documents — student อ่านได้, เขียนได้เฉพาะตัวเอง
router.get('/:id/dependents/:depId/documents',           requireStudentOwnership, getDependentDocuments);
router.post('/:id/dependents/:depId/documents',          requireStudentSelf, upload.single('file'), uploadDependentDocument);
router.delete('/:id/dependents/:depId/documents/:docId', requireStudentSelf, deleteDependentDocument);

export default router;
