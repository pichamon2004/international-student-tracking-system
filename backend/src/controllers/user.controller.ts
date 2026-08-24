import { Response } from 'express';
import { AuthRequest } from '../types';
import * as userService from '../services/domain/user.service';

export const getUsers = async (_req: AuthRequest, res: Response): Promise<void> => {
  const users = await userService.getUsers();
  res.json({ success: true, data: users });
};

export const getStaffUsers = async (_req: AuthRequest, res: Response): Promise<void> => {
  const staff = await userService.getStaffUsers();
  res.json({ success: true, data: staff.length > 0 ? staff[0] : null });
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, password, name, role } = req.body;
  const user = await userService.createUser(email, password, name, role);
  res.status(201).json({ success: true, data: user });
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, role, isActive } = req.body;
  const user = await userService.updateUser(parseInt(req.params.id), { name, roleCode: role, isActive });
  res.json({ success: true, data: user });
};
