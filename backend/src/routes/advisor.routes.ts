import { Router } from 'express';
import { authenticate, requireRole, requirePermission } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';
import { uploadImage } from '../middleware/upload.middleware';
import {
  getAdvisors, getDeans, getAdvisorById, getMyProfile,
  createAdvisor, updateMyProfile, updateAdvisorById, uploadPhoto, importAdvisors,
} from '../controllers/advisor.controller';

const router = Router();

// ADVISOR self-service (role check)
router.get('/deans',     authenticate,                                asyncHandler(getDeans));
router.get('/me',        authenticate, requireRole('ADVISOR', 'STAFF'), asyncHandler(getMyProfile));
router.put('/me',        authenticate, requireRole('ADVISOR'),        asyncHandler(updateMyProfile));
router.post('/me/photo', authenticate, requireRole('ADVISOR'),        uploadImage.single('image'), asyncHandler(uploadPhoto));

// Permission-based
router.get('/',        authenticate, requirePermission('ADVISOR_MANAGEMENT.view'),   asyncHandler(getAdvisors));
router.post('/',       authenticate, requirePermission('ADVISOR_MANAGEMENT.create'), asyncHandler(createAdvisor));
router.post('/import', authenticate, requirePermission('ADVISOR_MANAGEMENT.create'), asyncHandler(importAdvisors));
router.get('/:id',     authenticate, requirePermission('ADVISOR_MANAGEMENT.view'),   asyncHandler(getAdvisorById));
router.put('/:id',     authenticate, requirePermission('ADVISOR_MANAGEMENT.edit'),   asyncHandler(updateAdvisorById));

export default router;
