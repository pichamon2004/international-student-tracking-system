import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { createNotification } from '../services/notification.service';
import { uploadToR2 } from '../services/r2.service';

const EXPIRY_WARN_DAYS = 90;

// GET /api/students/:id/health-insurance
export const getHealthInsurances = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const insurances = await prisma.healthInsurance.findMany({
      where: { studentId },
      orderBy: { expiryDate: 'asc' },
    });
    res.json({ success: true, data: insurances });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/students/:id/health-insurance
export const createHealthInsurance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const { provider, policyNumber, coverageType, startDate, expiryDate, fileUrl } = req.body;

    if (!provider || !startDate || !expiryDate) {
      res.status(400).json({ success: false, message: 'provider, startDate, expiryDate are required' });
      return;
    }

    const start = new Date(startDate);
    const expiry = new Date(expiryDate);
    if (start >= expiry) {
      res.status(400).json({ success: false, message: 'startDate must be before expiryDate' });
      return;
    }

    const insurance = await prisma.healthInsurance.create({
      data: { studentId, provider, policyNumber, coverageType, startDate: start, expiryDate: expiry, fileUrl },
    });

    // Notify if expiry within EXPIRY_WARN_DAYS
    await _checkAndNotifyExpiry(studentId, expiry);

    res.status(201).json({ success: true, data: insurance });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /api/students/:id/health-insurance/:insuranceId
export const updateHealthInsurance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const insuranceId = parseInt(req.params.insuranceId);

    const existing = await prisma.healthInsurance.findFirst({ where: { id: insuranceId, studentId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Health insurance not found' });
      return;
    }

    const { startDate, expiryDate } = req.body;
    if (startDate && expiryDate && new Date(startDate) >= new Date(expiryDate)) {
      res.status(400).json({ success: false, message: 'startDate must be before expiryDate' });
      return;
    }

    const updated = await prisma.healthInsurance.update({
      where: { id: insuranceId },
      data: {
        ...req.body,
        startDate: startDate ? new Date(startDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      },
    });

    if (expiryDate) await _checkAndNotifyExpiry(studentId, new Date(expiryDate));

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/students/:id/health-insurance/:insuranceId
export const deleteHealthInsurance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const insuranceId = parseInt(req.params.insuranceId);

    const existing = await prisma.healthInsurance.findFirst({ where: { id: insuranceId, studentId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Health insurance not found' });
      return;
    }

    await prisma.healthInsurance.delete({ where: { id: insuranceId } });
    res.json({ success: true, message: 'Health insurance deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/students/:id/health-insurance/image — upload insurance image, return R2 URL
export const uploadHealthInsuranceImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image file provided' });
      return;
    }
    const { url } = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'health-insurance');
    res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('[uploadHealthInsuranceImage] error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
};

/* ── internal helper ─────────────────────────────────────────── */
async function _checkAndNotifyExpiry(studentId: number, expiryDate: Date) {
  const daysRemaining = Math.ceil((expiryDate.getTime() - Date.now()) / 86_400_000);
  if (daysRemaining > EXPIRY_WARN_DAYS) return;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { userId: true },
  });
  if (!student) return;

  await createNotification({
    userId: student.userId,
    type: 'VISA_ALERT',
    title: 'Health Insurance Expiring Soon',
    message: `Your health insurance expires in ${daysRemaining} day(s). Please renew it.`,
    link: '/student/profile',
  });
}
