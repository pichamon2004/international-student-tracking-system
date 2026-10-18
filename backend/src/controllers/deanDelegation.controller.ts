import { Response } from 'express';
import { AuthRequest } from '../types';
import * as service from '../services/domain/deanDelegation.service';

export const getSignatory = async (_req: AuthRequest, res: Response): Promise<void> => {
  const signatory = await service.getActiveSignatory();
  res.json({ success: true, data: signatory });
};

// GET /api/dean/delegations — history, newest first
export const listDelegations = async (_req: AuthRequest, res: Response): Promise<void> => {
  const delegations = await service.listDelegations();
  res.json({ success: true, data: delegations });
};

// POST /api/dean/delegations
export const createDelegation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { delegateId, startAt, endAt, note } = req.body;
  if (!delegateId || typeof delegateId !== 'number') {
    res.status(400).json({ success: false, message: 'delegateId is required' });
    return;
  }
  const delegation = await service.createDelegation(
    { delegateId, startAt, endAt, note: typeof note === 'string' ? note : undefined },
    req.user!.userId
  );
  res.status(201).json({ success: true, data: delegation });
};

// POST /api/dean/delegations/:id/revoke
export const revokeDelegation = async (req: AuthRequest, res: Response): Promise<void> => {
  const delegation = await service.revokeDelegation(parseInt(req.params.id), req.user!.userId);
  res.json({ success: true, data: delegation });
};

export const getDelegateUsers = async (_req: AuthRequest, res: Response): Promise<void> => {
  const users = await service.getDelegateUsers();
  res.json({ success: true, data: users });
};
