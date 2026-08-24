import { Router } from 'express';
import { getVisas, createVisa, updateVisa, deleteVisa, uploadVisaImage } from '../controllers/visa.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStudentOwnership, requireStudentSelf } from '../middleware/ownership.middleware';
import { createVisaSchema } from '../middleware/validate.middleware';
import { uploadImage } from '../middleware/upload.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

// READ: student เห็นของตัวเอง, STAFF/ADVISOR เห็นทั้งหมด
router.get('/:id/visas', authenticate, requireStudentOwnership, asyncHandler(getVisas));

// Image upload (must be before /:id/visas/:visaId to avoid route conflict)
router.post('/:id/visas/image', authenticate, requireStudentSelf, uploadImage.single('image'), asyncHandler(uploadVisaImage));

// WRITE: student เท่านั้น (ข้อมูลของตัวเอง)
router.post('/:id/visas', authenticate, requireStudentSelf, ...createVisaSchema, asyncHandler(createVisa));
router.put('/:id/visas/:visaId', authenticate, requireStudentSelf, asyncHandler(updateVisa));
router.delete('/:id/visas/:visaId', authenticate, requireStudentSelf, asyncHandler(deleteVisa));

export default router;
