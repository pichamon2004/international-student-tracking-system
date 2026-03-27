import { Router } from 'express';
import {
  getRequests,
  getRequestById,
  createRequest,
  updateRequestStatus,
} from '../controllers/request.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { updateRequestStatusSchema } from '../middleware/validate.middleware';
import { auditLog } from '../middleware/auditLog.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// STUDENT ก็ดู list requests ของตัวเองได้ผ่าน controller ที่กรอง role แล้ว
router.get('/', authenticate, getRequests);
router.get('/:id', authenticate, getRequestById);
router.post('/', authenticate, auditLog({ entity: 'Request' }), createRequest);
router.put('/:id/status', authenticate, requireRole('STAFF', 'ADVISOR'), upload.array('files', 10), auditLog({ entity: 'Request' }), ...updateRequestStatusSchema, updateRequestStatus);

export default router;
