import { Router } from 'express';
import {
  getRequests, getRequestById, createRequest, updateRequestStatus, followUpRequest,
  updateRequest, requestCancel, reviewCancel,
} from '../controllers/request.controller';
import { authenticate, requireRole, requirePermission } from '../middleware/auth.middleware';
import { updateRequestStatusSchema } from '../middleware/validate.middleware';
import { auditLog } from '../middleware/auditLog.middleware';
import { upload } from '../middleware/upload.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

// STUDENT ดู/สร้าง request ของตัวเองได้ — controller กรอง role เอง
router.get('/',    authenticate, asyncHandler(getRequests));
router.get('/:id', authenticate, asyncHandler(getRequestById));
router.post('/',   authenticate, auditLog({ entity: 'Request' }), asyncHandler(createRequest));

// STUDENT แก้ไข request ของตัวเอง (เฉพาะตอน PENDING) / ขอยกเลิก (รอ staff อนุมัติ)
router.put('/:id',         authenticate, requireRole('STUDENT'), auditLog({ entity: 'Request' }), asyncHandler(updateRequest));
router.post('/:id/cancel', authenticate, requireRole('STUDENT'), auditLog({ entity: 'Request' }), asyncHandler(requestCancel));

// STAFF อนุมัติ/ปฏิเสธคำขอยกเลิก
router.post('/:id/cancel/review', authenticate, requirePermission('REQUEST_MANAGEMENT.edit'),
  auditLog({ entity: 'Request' }), asyncHandler(reviewCancel));

// STAFF/ADVISOR เปลี่ยน status
router.put('/:id/status', authenticate, requirePermission('REQUEST_MANAGEMENT.edit'),
  upload.array('files', 10), auditLog({ entity: 'Request' }), ...updateRequestStatusSchema, asyncHandler(updateRequestStatus));

// STAFF ส่ง follow-up reminder (email + in-app notification) ให้ผู้รับผิดชอบปัจจุบัน
router.post('/:id/follow-up', authenticate, requirePermission('REQUEST_MANAGEMENT.edit'), asyncHandler(followUpRequest));

export default router;
