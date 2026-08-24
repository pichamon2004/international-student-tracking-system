import { Response } from 'express';
import { AuthRequest } from '../types';
import * as visaRenewalService from '../services/domain/visaRenewal.service';

// GET /api/visa-renewals
export const getVisaRenewals = async (req: AuthRequest, res: Response): Promise<void> => {
  const { isResolved } = req.query;
  const isResolvedFilter =
    isResolved === 'false' ? false :
    isResolved === 'true'  ? true  :
    undefined;

  const data = await visaRenewalService.getVisaRenewals(isResolvedFilter);
  res.json({ success: true, data });
};

// PUT /api/visa-renewals/:id/resolve
export const resolveVisaRenewal = async (req: AuthRequest, res: Response): Promise<void> => {
  const updated = await visaRenewalService.resolveVisaRenewal(parseInt(req.params.id));
  res.json({ success: true, data: updated });
};

// GET /api/students/:id/visa-renewals
export const getStudentVisaRenewals = async (req: AuthRequest, res: Response): Promise<void> => {
  const renewals = await visaRenewalService.getStudentVisaRenewals(parseInt(req.params.id));
  res.json({ success: true, data: renewals });
};
