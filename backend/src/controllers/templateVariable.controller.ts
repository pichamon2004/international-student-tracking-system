import { Response } from 'express';
import { AuthRequest } from '../types';
import * as templateVariableService from '../services/domain/templateVariable.service';

export const getVariables = async (_req: AuthRequest, res: Response): Promise<void> => {
  const variables = await templateVariableService.getAllVariables();
  res.json({ success: true, data: variables });
};

export const createVariable = async (req: AuthRequest, res: Response): Promise<void> => {
  const variable = await templateVariableService.createVariable(req.body);
  res.status(201).json({ success: true, data: variable });
};

export const updateVariable = async (req: AuthRequest, res: Response): Promise<void> => {
  const variable = await templateVariableService.updateVariable(
    parseInt(req.params.id),
    req.body,
  );
  res.json({ success: true, data: variable });
};

export const deleteVariable = async (req: AuthRequest, res: Response): Promise<void> => {
  await templateVariableService.deleteVariable(parseInt(req.params.id));
  res.json({ success: true, message: 'Variable deleted' });
};
