import { Router } from 'express';
import {
  getStudents,
  getStudentById,
  getMyStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  registerStudent,
  submitPhase2,
  approveStudent,
  rejectStudent,
  uploadStudentPhoto,
} from '../controllers/student.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { requireStudentOwnership } from '../middleware/ownership.middleware';
import { auditLog } from '../middleware/auditLog.middleware';
import { uploadImage } from '../middleware/upload.middleware';

const router = Router();

// Static routes MUST come before /:id
router.get('/me', authenticate, getMyStudent);
router.post('/register', authenticate, requireRole('STUDENT'), registerStudent);
router.put('/me/submit-phase2', authenticate, requireRole('STUDENT'), submitPhase2);

// Staff / advisor routes
router.get('/', authenticate, requireRole('STAFF', 'ADVISOR'), getStudents);
router.post('/', authenticate, requireRole('STAFF'), auditLog({ entity: 'Student' }), createStudent);
router.put('/:id/approve', authenticate, requireRole('STAFF'), auditLog({ entity: 'Student' }), approveStudent);
router.put('/:id/reject',  authenticate, requireRole('STAFF'), auditLog({ entity: 'Student' }), rejectStudent);
router.delete('/:id', authenticate, requireRole('STAFF'), auditLog({ entity: 'Student' }), deleteStudent);

// Profile photo upload
router.post('/:id/photo', authenticate, requireStudentOwnership, uploadImage.single('image'), uploadStudentPhoto);

// Resource-level ownership: STUDENT เห็นแค่ของตัวเอง, ADVISOR/STAFF เห็นทั้งหมด
router.put('/:id', authenticate, requireStudentOwnership, auditLog({ entity: 'Student' }), updateStudent);
router.get('/:id', authenticate, requireStudentOwnership, getStudentById);

export default router;
