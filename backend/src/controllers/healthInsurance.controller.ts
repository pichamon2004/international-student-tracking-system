import { Response } from 'express';
import { AuthRequest } from '../types';
import * as healthInsuranceService from '../services/domain/healthInsurance.service';
import * as changeRequestService from '../services/domain/changeRequest.service';
import { uploadToR2 } from '../services/external/r2.service';
import prisma from '../utils/prisma';

// GET /api/students/:id/health-insurance
export const getHealthInsurances = async (req: AuthRequest, res: Response): Promise<void> => {
  const insurances = await healthInsuranceService.getHealthInsurances(parseInt(req.params.id));
  res.json({ success: true, data: insurances });
};

// POST /api/students/:id/health-insurance
export const createHealthInsurance = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  if (req.user?.activeRole === 'STUDENT') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentId } });
    if (currentStudent?.registrationStatus === 'ACTIVE') {
      const cr = await changeRequestService.submitChange(studentId, 'HEALTH_INSURANCE', null, 'CREATE', req.body);
      res.status(202).json({ success: true, changeRequest: cr });
      return;
    }
  }
  const insurance = await healthInsuranceService.createHealthInsurance(studentId, req.body);
  res.status(201).json({ success: true, data: insurance });
};

// PUT /api/students/:id/health-insurance/:insuranceId
export const updateHealthInsurance = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const insuranceId = parseInt(req.params.insuranceId);
  if (req.user?.activeRole === 'STUDENT') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentId } });
    if (currentStudent?.registrationStatus === 'ACTIVE') {
      const cr = await changeRequestService.submitChange(studentId, 'HEALTH_INSURANCE', insuranceId, 'UPDATE', req.body);
      res.status(202).json({ success: true, changeRequest: cr });
      return;
    }
  }
  const updated = await healthInsuranceService.updateHealthInsurance(insuranceId, studentId, req.body);
  res.json({ success: true, data: updated });
};

// DELETE /api/students/:id/health-insurance/:insuranceId
export const deleteHealthInsurance = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const insuranceId = parseInt(req.params.insuranceId);
  if (req.user?.activeRole === 'STUDENT') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentId } });
    if (currentStudent?.registrationStatus === 'ACTIVE') {
      const cr = await changeRequestService.submitChange(studentId, 'HEALTH_INSURANCE', insuranceId, 'DELETE', {});
      res.status(202).json({ success: true, changeRequest: cr });
      return;
    }
  }
  await healthInsuranceService.deleteHealthInsurance(insuranceId, studentId);
  res.json({ success: true, message: 'Health insurance deleted' });
};

// POST /api/students/:id/health-insurance/image
export const uploadHealthInsuranceImage = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file provided' });
    return;
  }
  const { url } = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'health-insurance');
  res.json({ success: true, data: { url } });
};
