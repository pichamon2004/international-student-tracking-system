import { Router } from 'express';
import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { uploadImage } from '../middleware/upload.middleware';
import { uploadToR2 } from '../services/r2.service';

const router = Router();

// POST /api/advisors — create User(ADVISOR) + Advisor record atomically (STAFF only)
router.post('/', authenticate, requireRole('STAFF'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, titleEn, firstNameEn, lastNameEn, phone, nationality, faculty } = req.body;
    if (!email || !firstNameEn || !lastNameEn) {
      res.status(400).json({ success: false, message: 'email, firstNameEn, and lastNameEn are required' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name: [titleEn, firstNameEn, lastNameEn].filter(Boolean).join(' '), role: 'ADVISOR', isActive: true },
      });
      const advisor = await tx.advisor.create({
        data: { userId: user.id, titleEn: titleEn || null, firstNameEn, lastNameEn, phone: phone || null, nationality: nationality || null, faculty: faculty || null },
        include: { _count: { select: { students: true } }, user: { select: { email: true } } },
      });
      return advisor;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      res.status(400).json({ success: false, message: 'Email already exists' });
      return;
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/advisors — list all advisors (STAFF only)
router.get('/', authenticate, requireRole('STAFF'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const advisors = await prisma.advisor.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { students: true } },
        user: { select: { email: true } },
      },
      orderBy: { firstNameEn: 'asc' },
    });
    res.json({ success: true, data: advisors });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/advisors/dean — get the dean (isDean=true)
router.get('/dean', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dean = await prisma.advisor.findFirst({
      where: { isDean: true, isActive: true },
      select: { id: true, titleEn: true, firstNameEn: true, lastNameEn: true },
    });
    res.json({ success: true, data: dean ?? null });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/advisors/me/photo — upload profile photo
router.post('/me/photo', authenticate, requireRole('ADVISOR'), uploadImage.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image file provided' });
      return;
    }
    const { url } = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'photos');
    await prisma.user.update({ where: { id: req.user!.userId }, data: { image: url } });
    res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('POST /advisors/me/photo error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload photo' });
  }
});

// GET /api/advisors/me
router.get('/me', authenticate, requireRole('ADVISOR', 'STAFF'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const advisor = await prisma.advisor.findUnique({
      where: { userId: req.user!.userId },
      include: {
        user: { select: { email: true, image: true } },
        students: {
          select: {
            id: true, studentId: true, titleEn: true,
            firstNameEn: true, lastNameEn: true,
            faculty: true, program: true, level: true,
            registrationStatus: true, homeCountry: true,
            visas: { where: { status: 'ACTIVE' }, select: { visaType: true, expiryDate: true }, take: 1 },
            passports: { where: { isCurrent: true }, select: { expiryDate: true }, take: 1 },
          },
        },
      },
    });

    if (!advisor) {
      res.status(404).json({ success: false, message: 'Advisor profile not found' });
      return;
    }

    const { user, ...rest } = advisor;
    res.json({ success: true, data: { ...rest, email: user?.email ?? null, photoUrl: user?.image ?? null } });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/advisors/me
router.put('/me', authenticate, requireRole('ADVISOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { titleEn, firstNameEn, lastNameEn, phone, workPermitNumber, workPermitIssue, workPermitExpiry, nationality } = req.body;
    const data: Record<string, unknown> = {};
    if (titleEn !== undefined)        data.titleEn        = titleEn        || null;
    if (firstNameEn !== undefined)    data.firstNameEn    = firstNameEn    || null;
    if (lastNameEn !== undefined)     data.lastNameEn     = lastNameEn     || null;
    if (phone !== undefined)          data.phone          = phone          || null;
    if (nationality !== undefined)    data.nationality    = nationality    || null;
    if (workPermitNumber !== undefined) data.workPermitNumber = workPermitNumber || null;
    if (workPermitIssue !== undefined)  data.workPermitIssue  = workPermitIssue  ? new Date(workPermitIssue)  : null;
    if (workPermitExpiry !== undefined) data.workPermitExpiry = workPermitExpiry ? new Date(workPermitExpiry) : null;

    const advisor = await prisma.advisor.update({
      where: { userId: req.user!.userId },
      data,
    });
    res.json({ success: true, data: advisor });
  } catch (error) {
    console.error('PUT /advisors/me error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/advisors/:id — STAFF only
router.get('/:id', authenticate, requireRole('STAFF'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const advisor = await prisma.advisor.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        students: {
          select: {
            id: true, studentId: true, titleEn: true,
            firstNameEn: true, lastNameEn: true,
            faculty: true, program: true, level: true,
            registrationStatus: true, email: true,
          },
        },
        user: { select: { email: true } },
      },
    });
    if (!advisor) {
      res.status(404).json({ success: false, message: 'Advisor not found' });
      return;
    }
    res.json({ success: true, data: advisor });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/advisors/:id — STAFF only
router.put('/:id', authenticate, requireRole('STAFF'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const advisor = await prisma.advisor.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json({ success: true, data: advisor });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
