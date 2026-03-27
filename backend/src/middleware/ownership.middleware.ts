import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

/**
 * requireStudentOwnership
 *
 * ตรวจสอบว่า user ที่ login มีสิทธิ์เข้าถึง student record ใน :id param
 * - STAFF  → ผ่านทุกกรณี
 * - ADVISOR → ผ่านทุกกรณี (ตรวจ advisor assignment ที่ controller ถ้าต้องการ)
 * - STUDENT → ต้องเป็น student record ของตัวเองเท่านั้น
 */
export const requireStudentOwnership = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (req.user.role === 'STAFF' || req.user.role === 'ADVISOR') {
    next();
    return;
  }

  if (req.user.role === 'STUDENT') {
    const targetId = parseInt(req.params.id);
    if (isNaN(targetId)) {
      res.status(400).json({ success: false, message: 'Invalid student ID' });
      return;
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });

    if (!student || student.id !== targetId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    next();
    return;
  }

  res.status(403).json({ success: false, message: 'Forbidden' });
};

/**
 * requireStudentSelf
 *
 * อนุญาตเฉพาะ STUDENT ที่เป็นเจ้าของ record เท่านั้น
 * STAFF และ ADVISOR ไม่มีสิทธิ์เขียน (view-only)
 */
export const requireStudentSelf = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (req.user.role !== 'STUDENT') {
    res.status(403).json({ success: false, message: 'Only students can modify this resource' });
    return;
  }

  const targetId = parseInt(req.params.id);
  if (isNaN(targetId)) {
    res.status(400).json({ success: false, message: 'Invalid student ID' });
    return;
  }

  const student = await prisma.student.findUnique({
    where: { userId: req.user.userId },
    select: { id: true },
  });

  if (!student || student.id !== targetId) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  next();
};

/**
 * requireAdvisorOwnership
 *
 * ADVISOR สามารถดูข้อมูล student ได้เฉพาะที่อยู่ในความดูแลของตัวเอง
 * STAFF → ผ่านทุกกรณี
 */
export const requireAdvisorOwnership = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (req.user.role === 'STAFF') {
    next();
    return;
  }

  if (req.user.role === 'ADVISOR') {
    const targetStudentId = parseInt(req.params.id);
    if (isNaN(targetStudentId)) {
      res.status(400).json({ success: false, message: 'Invalid student ID' });
      return;
    }

    const advisor = await prisma.advisor.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });

    if (!advisor) {
      res.status(403).json({ success: false, message: 'Advisor profile not found' });
      return;
    }

    const student = await prisma.student.findFirst({
      where: { id: targetStudentId, advisorId: advisor.id },
      select: { id: true },
    });

    if (!student) {
      res.status(403).json({ success: false, message: 'Student is not under your supervision' });
      return;
    }
    next();
    return;
  }

  res.status(403).json({ success: false, message: 'Forbidden' });
};
