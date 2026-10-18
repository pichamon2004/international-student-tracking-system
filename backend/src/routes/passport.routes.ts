import { Router } from 'express';
import { getPassports, createPassport, updatePassport, setCurrentPassport, uploadPassportImage, scanPassport } from '../controllers/passport.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStudentOwnership, requireStudentSelf } from '../middleware/ownership.middleware';
import { uploadImage, uploadImageLarge } from '../middleware/upload.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

// READ: student เห็นของตัวเอง, STAFF/ADVISOR เห็นทั้งหมด
router.get('/:id/passport', authenticate, requireStudentOwnership, asyncHandler(getPassports));

// Image/scan (static paths before /:passportId)
router.post('/:id/passport/image', authenticate, requireStudentSelf, uploadImage.single('image'), asyncHandler(uploadPassportImage));
router.post('/:id/passport/scan', authenticate, requireStudentOwnership, uploadImageLarge.single('image'), asyncHandler(scanPassport));

// WRITE: student เท่านั้น
router.post('/:id/passport', authenticate, requireStudentSelf, asyncHandler(createPassport));
router.put('/:id/passport/:passportId/current', authenticate, requireStudentSelf, asyncHandler(setCurrentPassport));
router.put('/:id/passport/:passportId', authenticate, requireStudentSelf, asyncHandler(updatePassport));

export default router;
