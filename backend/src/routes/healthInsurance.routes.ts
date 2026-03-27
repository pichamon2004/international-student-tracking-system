import { Router } from 'express';
import {
  getHealthInsurances,
  createHealthInsurance,
  updateHealthInsurance,
  deleteHealthInsurance,
  uploadHealthInsuranceImage,
} from '../controllers/healthInsurance.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStudentOwnership, requireStudentSelf } from '../middleware/ownership.middleware';
import { uploadImage } from '../middleware/upload.middleware';

const router = Router({ mergeParams: true });

router.use(authenticate);

// READ: student เห็นของตัวเอง, STAFF/ADVISOR เห็นทั้งหมด
router.get('/:id/health-insurance', requireStudentOwnership, getHealthInsurances);

// Image upload (static path before /:insuranceId)
router.post('/:id/health-insurance/image', requireStudentSelf, uploadImage.single('image'), uploadHealthInsuranceImage);

// WRITE: student เท่านั้น
router.post('/:id/health-insurance', requireStudentSelf, createHealthInsurance);
router.put('/:id/health-insurance/:insuranceId', requireStudentSelf, updateHealthInsurance);
router.delete('/:id/health-insurance/:insuranceId', requireStudentSelf, deleteHealthInsurance);

export default router;
