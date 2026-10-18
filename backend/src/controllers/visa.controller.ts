import { Response } from 'express';
import { AuthRequest } from '../types';
import * as visaService from '../services/domain/visa.service';
import * as changeRequestService from '../services/domain/changeRequest.service';
import prisma from '../utils/prisma';
import * as passportRepository from '../repositories/passport.repository';

// The passport a visa is stamped in must be one of the student's own — refused up front, and re-checked under lock on write
async function badPassport(req: AuthRequest, res: Response, studentId: number): Promise<boolean> {
  const raw = req.body?.passportId;
  if (raw === undefined || raw === null || raw === '') return false;
  const id = Number(raw);
  if (Number.isInteger(id) && (await passportRepository.findByIdAndStudentId(id, studentId))) return false;
  res.status(400).json({ success: false, message: 'Choose one of your own passports for this visa' });
  return true;
}

export const getVisas = async (req: AuthRequest, res: Response): Promise<void> => {
  const visas = await visaService.getVisas(parseInt(req.params.id));
  res.json({ success: true, data: visas });
};

export const createVisa = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  if (await badPassport(req, res, studentId)) return;
  if (req.user?.activeRole === 'STUDENT') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentId } });
    if (currentStudent?.registrationStatus === 'ACTIVE' && currentStudent.registrationStep === 2) {
      const cr = await changeRequestService.submitChange(studentId, 'VISA', null, 'CREATE', req.body, req.user);
      res.status(202).json({ success: true, changeRequest: cr });
      return;
    }
  }
  const visa = await visaService.createVisa(studentId, req.body, req.user!);
  res.status(201).json({ success: true, data: visa });
};

export const updateVisa = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const visaId = parseInt(req.params.visaId);
  if (await badPassport(req, res, studentId)) return;
  if (req.user?.activeRole === 'STUDENT') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentId } });
    if (currentStudent?.registrationStatus === 'ACTIVE' && currentStudent.registrationStep === 2) {
      const cr = await changeRequestService.submitChange(studentId, 'VISA', visaId, 'UPDATE', req.body, req.user);
      res.status(202).json({ success: true, changeRequest: cr });
      return;
    }
  }
  const visa = await visaService.updateVisa(visaId, studentId, req.body, req.user!);
  res.json({ success: true, data: visa });
};

export const deleteVisa = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const visaId = parseInt(req.params.visaId);
  if (req.user?.activeRole === 'STUDENT') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentId } });
    if (currentStudent?.registrationStatus === 'ACTIVE' && currentStudent.registrationStep === 2) {
      const cr = await changeRequestService.submitChange(studentId, 'VISA', visaId, 'DELETE', {});
      res.status(202).json({ success: true, changeRequest: cr });
      return;
    }
  }
  await visaService.deleteVisa(visaId, studentId);
  res.json({ success: true, message: 'Visa deleted successfully' });
};

// POST /api/students/:id/visas/image
export const uploadVisaImage = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file provided' });
    return;
  }
  const data = await visaService.uploadVisaImage(req.file, parseInt(req.params.id), req.user!.userId, req.body.slot);
  res.json({ success: true, data });
};
