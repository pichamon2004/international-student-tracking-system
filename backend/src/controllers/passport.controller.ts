import { Response } from 'express';
import { AuthRequest } from '../types';
import * as passportService from '../services/domain/passport.service';
import * as passportRepository from '../repositories/passport.repository';
import * as changeRequestService from '../services/domain/changeRequest.service';
import prisma from '../utils/prisma';

// Students who finished registration must go through staff approval
const needsApproval = async (req: AuthRequest, studentId: number): Promise<boolean> => {
  if (req.user?.activeRole !== 'STUDENT') return false;
  const currentStudent = await prisma.student.findUnique({ where: { id: studentId } });
  return currentStudent?.registrationStatus === 'ACTIVE' && currentStudent.registrationStep === 2;
};

// GET /api/students/:id/passport
export const getPassports = async (req: AuthRequest, res: Response): Promise<void> => {
  const passports = await passportService.getPassports(parseInt(req.params.id));
  res.json({ success: true, data: passports });
};

// POST /api/students/:id/passport
export const createPassport = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  // Refuse a duplicate number up front rather than letting it wait for approval
  await passportService.assertPassportNumberAvailable(studentId, req.body.passportNumber);
  if (await needsApproval(req, studentId)) {
    const cr = await changeRequestService.submitChange(studentId, 'PASSPORT', null, 'CREATE', req.body, req.user);
    res.status(202).json({ success: true, changeRequest: cr });
    return;
  }
  const passport = await passportService.createPassport(studentId, req.body, req.user!);
  res.status(201).json({ success: true, data: passport });
};

// PUT /api/students/:id/passport/:passportId
export const updatePassport = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const passportId = parseInt(req.params.passportId);
  await passportService.assertPassportNumberAvailable(studentId, req.body.passportNumber, passportId);
  if (await needsApproval(req, studentId)) {
    const cr = await changeRequestService.submitChange(studentId, 'PASSPORT', passportId, 'UPDATE', req.body, req.user);
    res.status(202).json({ success: true, changeRequest: cr });
    return;
  }
  const passport = await passportService.updatePassport(studentId, passportId, req.body, req.user!);
  res.json({ success: true, data: passport });
};

// PUT /api/students/:id/passport/:passportId/current  { isCurrent: boolean }
// Choose which passport is the current one (or none); goes through approval like any other edit
export const setCurrentPassport = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const passportId = parseInt(req.params.passportId);
  if (typeof req.body.isCurrent !== 'boolean') {
    res.status(400).json({ success: false, message: 'isCurrent must be true or false' });
    return;
  }
  // Only the student's own passports (not a dependent's) — checked before anything is queued for approval
  if (!(await passportRepository.findByIdAndStudentId(passportId, studentId))) {
    res.status(404).json({ success: false, message: 'Passport not found' });
    return;
  }
  const change = { isCurrent: req.body.isCurrent };
  if (await needsApproval(req, studentId)) {
    const cr = await changeRequestService.submitChange(studentId, 'PASSPORT', passportId, 'UPDATE', change, req.user);
    res.status(202).json({ success: true, changeRequest: cr });
    return;
  }
  const passport = await passportService.updatePassport(studentId, passportId, change, req.user!);
  res.json({ success: true, data: passport });
};

// POST /api/students/:id/passport/image
export const uploadPassportImage = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file provided' });
    return;
  }
  const data = await passportService.uploadPassportImage(req.file, parseInt(req.params.id), req.user!.userId);
  res.json({ success: true, data });
};

export const scanPassport = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file provided' });
    return;
  }
  const scanResult = await passportService.scanPassport(req.file);
  res.json({ success: true, data: scanResult });
};
