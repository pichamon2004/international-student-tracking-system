import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

// GET /api/visa-renewals
export const getVisaRenewals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isResolved = req.query.isResolved;
    const where: Record<string, unknown> = {};
    if (isResolved === 'false') where.isResolved = false;
    if (isResolved === 'true') where.isResolved = true;

    const renewals = await prisma.visaRenewal.findMany({
      where,
      include: {
        student: {
          select: {
            id: true, studentId: true,
            firstNameEn: true, lastNameEn: true, titleEn: true,
            faculty: true, program: true,
            visas: { where: { status: 'ACTIVE' }, select: { visaType: true, expiryDate: true }, take: 1 },
          },
        },
      },
      orderBy: { daysRemaining: 'asc' },
    });

    res.json({ success: true, data: renewals });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /api/visa-renewals/:id/resolve
export const resolveVisaRenewal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const renewal = await prisma.visaRenewal.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!renewal) {
      res.status(404).json({ success: false, message: 'Visa renewal not found' });
      return;
    }

    const updated = await prisma.visaRenewal.update({
      where: { id: renewal.id },
      data: { isResolved: true, resolvedAt: new Date() },
    });

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/students/:id/visa-renewals
export const getStudentVisaRenewals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const renewals = await prisma.visaRenewal.findMany({
      where: { studentId: parseInt(req.params.id) },
      orderBy: { notifiedAt: 'desc' },
    });
    res.json({ success: true, data: renewals });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
