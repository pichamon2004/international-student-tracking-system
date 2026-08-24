import { Response } from 'express';
import { AuthRequest } from '../types';
import * as passportService from '../services/domain/passport.service';
import * as changeRequestService from '../services/domain/changeRequest.service';
import prisma from '../utils/prisma';

export const getPassport = async (req: AuthRequest, res: Response): Promise<void> => {
  const passport = await passportService.getPassport(parseInt(req.params.id));
  res.json({ success: true, data: passport });
};

export const upsertPassport = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  if (req.user?.activeRole === 'STUDENT') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentId } });
    if (currentStudent?.registrationStatus === 'ACTIVE') {
      const cr = await changeRequestService.submitChange(studentId, 'PASSPORT', null, 'UPDATE', req.body);
      res.status(202).json({ success: true, changeRequest: cr });
      return;
    }
  }
  const passport = await passportService.upsertPassport(studentId, req.body);
  res.json({ success: true, data: passport });
};

// POST /api/students/:id/passport/image
export const uploadPassportImage = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file provided' });
    return;
  }
  const { url } = await passportService.uploadPassportImage(req.file);
  res.json({ success: true, data: { url } });
};

export const scanPassport = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file provided' });
    return;
  }
  const scanResult = await passportService.scanPassport(req.file);
  res.json({ success: true, data: scanResult });
};
