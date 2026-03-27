import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { callKkuInterservice } from '../services/kkuInterservice.service';

// POST /api/students/:id/interservice-checks
// → ดึง passport ปัจจุบัน → ส่งไปเช็คกับ KKU → บันทึกผลใน DB
export const createInterserviceCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const { renewalId } = req.body;

    // ดึง student พร้อม passport ปัจจุบัน
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        passports: {
          where: { isCurrent: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const passport = student.passports[0];
    if (!passport) {
      res.status(400).json({ success: false, message: 'นักศึกษาไม่มีข้อมูล passport ปัจจุบัน' });
      return;
    }

    // เรียก KKU Interservice (mock หรือ API จริง)
    const kkuResult = await callKkuInterservice(passport.passportNumber);

    // map KKU status → Prisma InterserviceStatus enum
    const statusMap = {
      NOT_SUBMITTED: 'NOT_SUBMITTED',
      PENDING:       'PENDING',
      APPROVED:      'APPROVED',
      REJECTED:      'REJECTED',
    } as const;

    const check = await prisma.interserviceCheck.create({
      data: {
        studentId,
        renewalId: renewalId ? parseInt(renewalId) : null,
        status:      statusMap[kkuResult.status],
        referenceId: kkuResult.referenceId ?? undefined,
        notes:       kkuResult.message,
        checkedAt:   new Date(kkuResult.checkedAt),
      },
      include: {
        renewal: { select: { id: true, daysRemaining: true, isResolved: true } },
      },
    });

    res.status(201).json({ success: true, data: check, kkuResponse: kkuResult });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/students/:id/interservice-checks
export const getInterserviceChecks = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const checks = await prisma.interserviceCheck.findMany({
      where: { studentId },
      include: {
        renewal: { select: { id: true, daysRemaining: true, notifiedAt: true, isResolved: true } },
      },
      orderBy: { checkedAt: 'desc' },
    });

    res.json({ success: true, data: checks });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /api/students/:id/interservice-checks/:checkId
// staff override สถานะ กรณี KKU แจ้งนอกระบบ
export const updateInterserviceCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const checkId   = parseInt(req.params.checkId);
    const { status, referenceId, notes } = req.body;

    const existing = await prisma.interserviceCheck.findFirst({
      where: { id: checkId, studentId },
    });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Interservice check not found' });
      return;
    }

    const validStatuses = ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: `status ต้องเป็นหนึ่งใน: ${validStatuses.join(', ')}` });
      return;
    }

    const updated = await prisma.interserviceCheck.update({
      where: { id: checkId },
      data: {
        ...(status      !== undefined && { status }),
        ...(referenceId !== undefined && { referenceId }),
        ...(notes       !== undefined && { notes }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
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
