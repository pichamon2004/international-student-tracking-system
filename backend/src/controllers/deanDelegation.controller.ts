import { Response } from 'express';
import { AuthRequest } from '../types';
import * as service from '../services/domain/deanDelegation.service';

export const getSignatory = async (_req: AuthRequest, res: Response): Promise<void> => {
  const signatory = await service.getActiveSignatory();
  res.json({ success: true, data: signatory });
};

export const getDelegation = async (req: AuthRequest, res: Response): Promise<void> => {
  const delegation = await service.getDelegation(req.user!.userId);
  res.json({ success: true, data: delegation ?? null });
};

export const setDelegate = async (req: AuthRequest, res: Response): Promise<void> => {
  const { delegateId } = req.body;
  if (!delegateId || typeof delegateId !== 'number') {
    res.status(400).json({ success: false, message: 'delegateId is required' });
    return;
  }
  const delegation = await service.setDelegate(req.user!.userId, delegateId);
  res.json({ success: true, data: delegation });
};

export const toggleDelegation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') {
    res.status(400).json({ success: false, message: 'isActive (boolean) is required' });
    return;
  }
  const delegation = await service.toggleDelegation(req.user!.userId, isActive);
  res.json({ success: true, data: delegation });
};

export const removeDelegation = async (req: AuthRequest, res: Response): Promise<void> => {
  await service.removeDelegation(req.user!.userId);
  res.json({ success: true });
};

export const getDelegateUsers = async (_req: AuthRequest, res: Response): Promise<void> => {
  const users = await service.getDelegateUsers();
  res.json({ success: true, data: users });
};
