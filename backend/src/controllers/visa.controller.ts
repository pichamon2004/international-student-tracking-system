import { Response } from 'express';
import { AuthRequest } from '../types';
import * as visaService from '../services/domain/visa.service';
import * as changeRequestService from '../services/domain/changeRequest.service';

export const getVisas = async (req: AuthRequest, res: Response): Promise<void> => {
  const visas = await visaService.getVisas(parseInt(req.params.id));
  res.json({ success: true, data: visas });
};

export const createVisa = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  if (req.user?.activeRole === 'STUDENT') {
    const cr = await changeRequestService.submitChange(studentId, 'VISA', null, 'CREATE', req.body);
    res.status(202).json({ success: true, changeRequest: cr });
    return;
  }
  const visa = await visaService.createVisa(studentId, req.body);
  res.status(201).json({ success: true, data: visa });
};

export const updateVisa = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const visaId = parseInt(req.params.visaId);
  if (req.user?.activeRole === 'STUDENT') {
    const cr = await changeRequestService.submitChange(studentId, 'VISA', visaId, 'UPDATE', req.body);
    res.status(202).json({ success: true, changeRequest: cr });
    return;
  }
  const visa = await visaService.updateVisa(visaId, req.body);
  res.json({ success: true, data: visa });
};

export const deleteVisa = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const visaId = parseInt(req.params.visaId);
  if (req.user?.activeRole === 'STUDENT') {
    const cr = await changeRequestService.submitChange(studentId, 'VISA', visaId, 'DELETE', {});
    res.status(202).json({ success: true, changeRequest: cr });
    return;
  }
  await visaService.deleteVisa(visaId);
  res.json({ success: true, message: 'Visa deleted successfully' });
};

// POST /api/students/:id/visas/image
export const uploadVisaImage = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file provided' });
    return;
  }
  const { url } = await visaService.uploadVisaImage(req.file);
  res.json({ success: true, data: { url } });
};
