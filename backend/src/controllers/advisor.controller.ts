import { Response } from 'express';
import { AuthRequest } from '../types';
import * as advisorService from '../services/domain/advisor.service';
import { UpdateAdvisorDto } from '../repositories/advisor.repository';

export const getAdvisors = async (_req: AuthRequest, res: Response): Promise<void> => {
  const advisors = await advisorService.getAdvisors();
  res.json({ success: true, data: advisors });
};

export const getDeans = async (_req: AuthRequest, res: Response): Promise<void> => {
  const deans = await advisorService.getDeans();
  res.json({ success: true, data: deans });
};

export const getAdvisorById = async (req: AuthRequest, res: Response): Promise<void> => {
  const advisor = await advisorService.getAdvisorById(parseInt(req.params.id));
  res.json({ success: true, data: advisor });
};

export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await advisorService.getMyProfile(req.user!.userId);
  res.json({ success: true, data: profile });
};

export const createAdvisor = async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, titleEn, firstNameEn, lastNameEn, phone, nationality } = req.body;
  const advisor = await advisorService.createAdvisor({
    email, titleEn, firstNameEn, lastNameEn, phone, nationality,
  });
  res.status(201).json({ success: true, data: advisor });
};

export const updateMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    titleEn, firstNameEn, lastNameEn, phone, nationality,
    workPermitNumber, workPermitIssue, workPermitExpiry,
  } = req.body;

  const dto: UpdateAdvisorDto = {
    titleEn, firstNameEn, lastNameEn, phone, nationality,
    workPermitNumber,
    workPermitIssue:  workPermitIssue  ? new Date(workPermitIssue)  : undefined,
    workPermitExpiry: workPermitExpiry ? new Date(workPermitExpiry) : undefined,
  };

  const advisor = await advisorService.updateMyProfile(req.user!.userId, dto);
  res.json({ success: true, data: advisor });
};

export const updateAdvisorById = async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    titleEn, firstNameEn, lastNameEn, phone, nationality,
    isActive, workPermitNumber, workPermitIssue, workPermitExpiry, workPermitFileUrl,
  } = req.body;

  const dto: UpdateAdvisorDto = {
    titleEn, firstNameEn, lastNameEn, phone, nationality,
    isActive, workPermitNumber, workPermitFileUrl,
    workPermitIssue:  workPermitIssue  ? new Date(workPermitIssue)  : undefined,
    workPermitExpiry: workPermitExpiry ? new Date(workPermitExpiry) : undefined,
  };

  const advisor = await advisorService.updateAdvisorById(parseInt(req.params.id), dto);
  res.json({ success: true, data: advisor });
};

export const uploadPhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file provided' });
    return;
  }
  const result = await advisorService.uploadPhoto(req.user!.userId, req.file);
  res.json({ success: true, data: result });
};

export const importAdvisors = async (req: AuthRequest, res: Response): Promise<void> => {
  const { rows } = req.body as {
    rows: {
      email: string;
      titleEn?: string;
      firstNameEn: string;
      lastNameEn: string;
      nationality?: string;
      phone?: string;
    }[];
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ success: false, message: 'rows array is required' });
    return;
  }

  const results = await Promise.allSettled(
    rows.map(row =>
      advisorService.createAdvisor({
        email: row.email,
        titleEn: row.titleEn,
        firstNameEn: row.firstNameEn,
        lastNameEn: row.lastNameEn,
        nationality: row.nationality,
        phone: row.phone,
      })
    )
  );

  const summary = results.map((r, i) => ({
    row: i + 1,
    email: rows[i].email,
    success: r.status === 'fulfilled',
    error: r.status === 'rejected' ? (r.reason as Error).message : undefined,
  }));

  const successCount = summary.filter(s => s.success).length;
  res.json({ success: true, data: { summary, successCount, failCount: rows.length - successCount } });
};
