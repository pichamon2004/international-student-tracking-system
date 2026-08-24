import { Request, Response } from 'express';
import * as requestTypeService from '../services/domain/requestType.service';

// GET /api/request-types
export const getRequestTypes = async (_req: Request, res: Response): Promise<void> => {
  const types = await requestTypeService.getRequestTypes();
  res.json({ success: true, data: types });
};

// POST /api/request-types
export const createRequestType = async (req: Request, res: Response): Promise<void> => {
  const type = await requestTypeService.createRequestType(req.body);
  res.status(201).json({ success: true, data: type });
};

// PUT /api/request-types/:id
export const updateRequestType = async (req: Request, res: Response): Promise<void> => {
  const type = await requestTypeService.updateRequestType(parseInt(req.params.id), req.body);
  res.json({ success: true, data: type });
};

// DELETE /api/request-types/:id
export const deleteRequestType = async (req: Request, res: Response): Promise<void> => {
  await requestTypeService.deleteRequestType(parseInt(req.params.id));
  res.json({ success: true, message: 'Request type deleted' });
};
