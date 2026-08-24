import { Request, Response } from 'express';
import * as interserviceService from '../services/domain/interservice.service';
import { callKkuInterservice } from '../services/external/kkuInterservice.service';

// POST /api/students/:id/interservice-checks
export const createInterserviceCheck = async (req: Request, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const { renewalId } = req.body;

  const check = await interserviceService.createInterserviceCheck(
    studentId,
    renewalId ? parseInt(renewalId) : null
  );

  res.status(201).json({ success: true, data: check });
};

// GET /api/students/:id/interservice-checks
export const getInterserviceChecks = async (req: Request, res: Response): Promise<void> => {
  const checks = await interserviceService.getInterserviceChecks(parseInt(req.params.id));
  res.json({ success: true, data: checks });
};

// PUT /api/students/:id/interservice-checks/:checkId
export const updateInterserviceCheck = async (req: Request, res: Response): Promise<void> => {
  const updated = await interserviceService.updateInterserviceCheck(
    parseInt(req.params.checkId),
    parseInt(req.params.id),
    req.body
  );
  res.json({ success: true, data: updated });
};

// GET /api/mock/kku-interservice?passportNumber=XX1234567  (dev only)
export const mockKkuEndpoint = async (req: Request, res: Response): Promise<void> => {
  const { passportNumber } = req.query;
  if (!passportNumber) {
    res.status(400).json({ success: false, message: 'passportNumber is required' });
    return;
  }
  const result = await callKkuInterservice(passportNumber as string);
  res.json(result);
};
