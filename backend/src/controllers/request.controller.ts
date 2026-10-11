import { Response } from 'express';
import { AuthRequest } from '../types';
import * as requestService from '../services/domain/request.service';

// GET /api/requests
export const getRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  const requests = await requestService.getRequests(
    {
      status:    req.query.status    as string | undefined,
      studentId: req.query.studentId as string | undefined,
      advisorId: req.query.advisorId as string | undefined,
    },
    req.user?.activeRole,
    req.user?.userId
  );
  res.json({ success: true, data: requests });
};

// GET /api/requests/:id
export const getRequestById = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await requestService.getRequestById(
    parseInt(req.params.id),
    req.user?.activeRole,
    req.user?.userId
  );
  res.json({ success: true, data });
};

// POST /api/requests
export const createRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const request = await requestService.createRequest(req.body, req.user?.activeRole, req.user?.userId);
  res.status(201).json({ success: true, data: request });
};

// PUT /api/requests/:id/status
export const updateRequestStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const files = req.files && Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
  const updated = await requestService.updateRequestStatus(
    parseInt(req.params.id),
    { status: req.body.status, comment: req.body.comment },
    req.user?.activeRole,
    req.user?.userId,
    files
  );
  res.json({ success: true, data: updated });
};

// POST /api/requests/:id/follow-up
export const followUpRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await requestService.followUp(parseInt(req.params.id));
  res.json({ success: true, message: `Follow-up reminder sent to ${result.roleLabel}`, data: result });
};

// PUT /api/requests/:id  (student edits own PENDING request)
export const updateRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const updated = await requestService.updateRequest(
    parseInt(req.params.id),
    { description: req.body.description, formData: req.body.formData },
    req.user?.userId
  );
  res.json({ success: true, data: updated });
};

// POST /api/requests/:id/cancel  (student asks staff to cancel)
export const requestCancel = async (req: AuthRequest, res: Response): Promise<void> => {
  const cancellation = await requestService.requestCancel(
    parseInt(req.params.id),
    req.body.reason,
    req.user?.userId
  );
  res.status(201).json({ success: true, data: cancellation });
};

// POST /api/requests/:id/cancel/review  (staff approves/rejects the cancellation)
export const reviewCancel = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await requestService.reviewCancel(
    parseInt(req.params.id),
    { approve: req.body.approve === true || req.body.approve === 'true', note: req.body.note },
    req.user?.userId
  );
  res.json({ success: true, data: result });
};
