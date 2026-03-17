import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

export const getVisas = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const visas = await prisma.visa.findMany({
      where: { studentId: parseInt(req.params.id) },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: visas });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createVisa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const visa = await prisma.visa.create({
      data: { ...req.body, studentId: parseInt(req.params.id) },
    });
    res.status(201).json({ success: true, data: visa });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateVisa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const visa = await prisma.visa.update({
      where: { id: parseInt(req.params.visaId) },
      data: req.body,
    });
    res.json({ success: true, data: visa });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, message: 'Visa not found' });
      return;
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteVisa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.visa.delete({ where: { id: parseInt(req.params.visaId) } });
    res.json({ success: true, message: 'Visa deleted successfully' });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, message: 'Visa not found' });
      return;
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
