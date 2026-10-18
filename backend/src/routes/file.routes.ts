import { Router } from 'express';
import { getFileUrl, downloadFile } from '../controllers/file.controller';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

// Access is decided per file from the records that reference it (fileAccess.ts)
const router = Router();
router.get('/:id/url',      authenticate, asyncHandler(getFileUrl));
router.get('/:id/download', authenticate, asyncHandler(downloadFile));

export default router;
