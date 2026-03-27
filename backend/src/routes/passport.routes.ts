import { Router } from 'express';
import { getPassport, upsertPassport, uploadPassportImage, scanPassport } from '../controllers/passport.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStudentOwnership, requireStudentSelf } from '../middleware/ownership.middleware';
import { uploadImage, uploadImageLarge } from '../middleware/upload.middleware';

const router = Router();

// READ: student เห็นของตัวเอง, STAFF/ADVISOR เห็นทั้งหมด
router.get('/:id/passport', authenticate, requireStudentOwnership, getPassport);

// WRITE: student เท่านั้น
router.put('/:id/passport', authenticate, requireStudentSelf, upsertPassport);
router.post('/:id/passport/image', authenticate, requireStudentSelf, uploadImage.single('image'), uploadPassportImage);
router.post('/:id/passport/scan', authenticate, requireStudentOwnership, uploadImageLarge.single('image'), scanPassport);

export default router;
