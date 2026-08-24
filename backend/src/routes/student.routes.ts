import { Router } from 'express';
import {
  getStudents, getStudentById, getMyStudent, createStudent, updateStudent,
  deleteStudent, submitPhase2, approveStudent, rejectStudent,
  uploadStudentPhoto, importStudents,
} from '../controllers/student.controller';
import { authenticate, requireRole, requirePermission } from '../middleware/auth.middleware';
import { requireStudentOwnership } from '../middleware/ownership.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';
import { auditLog } from '../middleware/auditLog.middleware';
import { uploadImage } from '../middleware/upload.middleware';
import prisma from '../utils/prisma';

const router = Router();

const fetchStudentBefore = async (req: any) => {
  const id = parseInt(req.params.id);
  if (!id) return null;
  return prisma.student.findUnique({ where: { id } });
};

// STUDENT self-service
router.get('/me',               authenticate,                           asyncHandler(getMyStudent));
router.put('/me/submit-phase2', authenticate, requireRole('STUDENT'),   asyncHandler(submitPhase2));

// Permission-based (STAFF/ADVISOR)
router.get('/',           authenticate, requirePermission('STUDENT_MANAGEMENT.view'),   asyncHandler(getStudents));
router.post('/',          authenticate, requirePermission('STUDENT_MANAGEMENT.create'), auditLog({ entity: 'Student' }), asyncHandler(createStudent));
router.post('/import',    authenticate, requirePermission('STUDENT_MANAGEMENT.create'), asyncHandler(importStudents));
router.put('/:id/approve',authenticate, requirePermission('STUDENT_MANAGEMENT.edit'),  auditLog({ entity: 'Student', fetchBefore: fetchStudentBefore }), asyncHandler(approveStudent));
router.put('/:id/reject', authenticate, requirePermission('STUDENT_MANAGEMENT.edit'),  auditLog({ entity: 'Student', fetchBefore: fetchStudentBefore }), asyncHandler(rejectStudent));
router.delete('/:id',     authenticate, requirePermission('STUDENT_MANAGEMENT.delete'),auditLog({ entity: 'Student', fetchBefore: fetchStudentBefore }), asyncHandler(deleteStudent));

// Ownership-based
router.post('/:id/photo', authenticate, requireStudentOwnership, uploadImage.single('image'), asyncHandler(uploadStudentPhoto));
router.put('/:id',        authenticate, requireStudentOwnership, auditLog({ entity: 'Student', fetchBefore: fetchStudentBefore }), asyncHandler(updateStudent));
router.get('/:id',        authenticate, requireStudentOwnership, asyncHandler(getStudentById));

export default router;
