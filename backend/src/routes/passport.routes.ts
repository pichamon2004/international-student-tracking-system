import { Router } from 'express';
import { getPassport, upsertPassport, scanPassport } from '../controllers/passport.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.get('/:id/passport', authenticate, getPassport);
router.put('/:id/passport', authenticate, upsertPassport);
router.post('/:id/passport/scan', authenticate, upload.single('image'), scanPassport);

export default router;
