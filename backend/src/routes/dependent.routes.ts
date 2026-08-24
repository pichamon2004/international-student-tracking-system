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
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router({ mergeParams: true });

router.use(authenticate);

// READ: student เห็นของตัวเอง, STAFF/ADVISOR เห็นทั้งหมด
router.get('/:id/dependents',           requireStudentOwnership, asyncHandler(getDependents));
router.get('/:id/dependents/:depId',    requireStudentOwnership, asyncHandler(getDependentById));

// Image upload for dependent passport/visa (static path before /:depId)
router.post('/:id/dependents/image',    requireStudentSelf, uploadImage.single('image'), asyncHandler(uploadDependentImage));

// WRITE: student เท่านั้น
router.post('/:id/dependents',          requireStudentSelf, asyncHandler(createDependent));
router.put('/:id/dependents/:depId',    requireStudentSelf, asyncHandler(updateDependent));
router.delete('/:id/dependents/:depId', requireStudentSelf, asyncHandler(deleteDependent));

// Dependent documents — student อ่านได้, เขียนได้เฉพาะตัวเอง
router.get('/:id/dependents/:depId/documents',           requireStudentOwnership, asyncHandler(getDependentDocuments));
router.post('/:id/dependents/:depId/documents',          requireStudentSelf, upload.single('file'), asyncHandler(uploadDependentDocument));
router.delete('/:id/dependents/:depId/documents/:docId', requireStudentSelf, asyncHandler(deleteDependentDocument));

export default router;
