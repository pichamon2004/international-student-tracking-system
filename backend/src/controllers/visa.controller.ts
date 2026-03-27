import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { uploadToR2 } from '../services/r2.service';

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
    const { issueDate, expiryDate, ...rest } = req.body;
    const visa = await prisma.visa.create({
      data: {
        ...rest,
        studentId:  parseInt(req.params.id),
        issueDate:  new Date(issueDate),
        expiryDate: new Date(expiryDate),
      },
    });
    res.status(201).json({ success: true, data: visa });
  } catch (error) {
    console.error('[createVisa] error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateVisa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { issueDate, expiryDate, ...rest } = req.body;
    const visa = await prisma.visa.update({
      where: { id: parseInt(req.params.visaId) },
      data: {
        ...rest,
        ...(issueDate  && { issueDate:  new Date(issueDate)  }),
        ...(expiryDate && { expiryDate: new Date(expiryDate) }),
      },
    });
    res.json({ success: true, data: visa });
  } catch (error: unknown) {
    console.error('[updateVisa] error:', error);
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

// POST /api/students/:id/visas/image — upload visa image, return R2 URL
export const uploadVisaImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image file provided' });
      return;
    }
    const { url } = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'visas');
    res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('[uploadVisaImage] error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
};
