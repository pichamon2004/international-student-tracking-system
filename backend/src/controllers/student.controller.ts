import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { createNotification } from '../services/notification.service';
import { uploadToR2 } from '../services/r2.service';

export const getStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const advisorId = req.query.advisorId ? parseInt(req.query.advisorId as string) : undefined;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (advisorId) where.advisorId = advisorId;
    if (search) {
      where.OR = [
        { firstNameEn: { contains: search } },
        { lastNameEn: { contains: search } },
        { studentId: { contains: search } },
        { nationality: { contains: search } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          passports: { where: { isCurrent: true }, select: { passportNumber: true, expiryDate: true }, take: 1 },
          visas: { where: { status: 'ACTIVE' }, select: { visaType: true, expiryDate: true }, take: 1 },
          healthInsurances: { where: { isCurrent: true }, select: { provider: true, expiryDate: true }, take: 1 },
          advisor: { select: { titleEn: true, firstNameEn: true, lastNameEn: true } },
        },
      }),
      prisma.student.count({ where }),
    ]);

    res.json({
      success: true,
      data: students,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getStudentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        passports: { where: { isCurrent: true }, take: 1 },
        visas: { where: { status: 'ACTIVE' }, take: 1 },
        healthInsurances: { where: { isCurrent: true }, take: 1 },
        documents: true,
        advisor: { select: { id: true, titleEn: true, firstNameEn: true, lastNameEn: true, faculty: true } },
      },
    });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }
    res.json({ success: true, data: student });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* GET /api/students/me — student sees their own profile */
export const getMyStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [student, staffContact] = await Promise.all([
      prisma.student.findUnique({
        where: { userId: req.user!.userId },
        include: {
          passports: { where: { isCurrent: true }, take: 1 },
          visas: { where: { status: 'ACTIVE' }, take: 1 },
          healthInsurances: { where: { isCurrent: true }, take: 1 },
          academicDocuments: { orderBy: { issueDate: 'desc' } },
          dependents: { select: { id: true }, take: 1 },
          advisor: {
            select: {
              id: true, titleEn: true, firstNameEn: true, lastNameEn: true, faculty: true,
              phone: true,
              user: { select: { email: true } },
            },
          },
          user: { select: { email: true } },
        },
      }),
      prisma.user.findFirst({
        where: { role: 'STAFF', isActive: true },
        select: { name: true, phone: true, email: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student profile not found' });
      return;
    }
    const { user, advisor, ...studentData } = student;
    const advisorFlat = advisor ? {
      ...advisor,
      email: (advisor as unknown as { user?: { email?: string } }).user?.email ?? null,
      user: undefined,
    } : null;
    res.json({ success: true, data: {
      ...studentData,
      email: studentData.email || user?.email || null,
      advisor: advisorFlat,
      staffContact: staffContact ?? null,
    } });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, studentId, titleEn, firstNameEn, middleNameEn, lastNameEn } = req.body;

    if (!email || !firstNameEn || !lastNameEn) {
      res.status(400).json({ success: false, message: 'email, firstNameEn, and lastNameEn are required' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'An account with this email already exists' });
      return;
    }

    const name = [firstNameEn, lastNameEn].filter(Boolean).join(' ');

    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name, role: 'STUDENT', isActive: true },
      });
      return tx.student.create({
        data: {
          userId: user.id,
          studentId: studentId || undefined,
          titleEn: titleEn || undefined,
          firstNameEn,
          middleNameEn: middleNameEn || undefined,
          lastNameEn,
          registrationStatus: 'PENDING_APPROVAL',
          registrationStep: 0,
        },
      });
    });

    res.status(201).json({ success: true, data: student });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      res.status(400).json({ success: false, message: 'Student ID or email already exists' });
      return;
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json({ success: true, data: student });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.student.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* POST /api/students/:id/photo — upload profile photo, save R2 URL to student record */
export const uploadStudentPhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image file provided' });
      return;
    }
    const studentId = parseInt(req.params.id);
    const { url } = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'photos');
    const student = await prisma.student.update({
      where: { id: studentId },
      data: { photoUrl: url },
    });
    res.json({ success: true, data: { url, student } });
  } catch (error) {
    console.error('[uploadStudentPhoto] error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload photo' });
  }
};

/* POST /api/students/register — student Phase 1 registration (update pre-created record) */
export const registerStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const existing = await prisma.student.findUnique({ where: { userId } });
    if (!existing) {
      res.status(403).json({ success: false, message: 'Your account has not been pre-registered by staff. Please contact the college.' });
      return;
    }

    if (existing.registrationStep >= 1 && existing.registrationStatus === 'PENDING_APPROVAL') {
      // Already submitted Phase 1, allow re-save without re-notifying
      const student = await prisma.student.update({
        where: { userId },
        data: { ...req.body },
      });
      res.json({ success: true, data: student });
      return;
    }

    const student = await prisma.student.update({
      where: { userId },
      data: {
        registrationStatus: 'PENDING_APPROVAL',
        registrationStep: 1,
        ...req.body,
      },
    });

    // Notify staff about Phase 1 submission
    const staffUsers = await prisma.user.findMany({
      where: { role: 'STAFF', isActive: true },
      select: { id: true },
    });
    await Promise.all(
      staffUsers.map((u) =>
        createNotification({
          userId: u.id,
          type: 'REGISTRATION',
          title: 'Phase 1 Registration Submitted',
          message: `${student.firstNameEn ?? 'A student'} ${student.lastNameEn ?? ''} has submitted Phase 1 registration.`,
          link: `/staff/students/${student.id}`,
        })
      )
    );

    res.json({ success: true, data: student });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* PUT /api/students/me/submit-phase2 — student submits Phase 2 to-do list */
export const submitPhase2 = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const existing = await prisma.student.findUnique({ where: { userId } });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    if (!(existing.registrationStep === 1 && existing.registrationStatus === 'ACTIVE')) {
      res.status(400).json({ success: false, message: 'Phase 1 must be approved before submitting Phase 2' });
      return;
    }

    const student = await prisma.student.update({
      where: { userId },
      data: { registrationStep: 2, registrationStatus: 'PENDING_APPROVAL' },
    });

    const staffUsers = await prisma.user.findMany({
      where: { role: 'STAFF', isActive: true },
      select: { id: true },
    });
    await Promise.all(
      staffUsers.map((u) =>
        createNotification({
          userId: u.id,
          type: 'REGISTRATION',
          title: 'Phase 2 Registration Submitted',
          message: `${student.firstNameEn ?? 'A student'} ${student.lastNameEn ?? ''} has completed Phase 2. Please fill in academic information.`,
          link: `/staff/students/${student.id}`,
        })
      )
    );

    res.json({ success: true, data: student });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* PUT /api/students/:id/approve — staff approves Phase 1 or Phase 2 registration */
export const approveStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: { registrationStatus: 'ACTIVE', rejectionReason: null },
    });

    const isPhase1 = student.registrationStep === 1;
    await createNotification({
      userId: student.userId,
      type: 'REGISTRATION',
      title: isPhase1 ? 'Phase 1 Approved' : 'Registration Approved',
      message: isPhase1
        ? 'Your Phase 1 registration has been approved. Please complete the to-do list (Phase 2) to finish your registration.'
        : 'Your student registration has been fully approved. Welcome!',
      link: isPhase1 ? '/student/profile' : '/student/dashboard',
    });

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* PUT /api/students/:id/reject — staff rejects registration */
export const rejectStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const { reason } = req.body;

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: { registrationStatus: 'REJECTED', rejectionReason: reason ?? null },
    });

    await createNotification({
      userId: student.userId,
      type: 'REGISTRATION',
      title: 'Registration Rejected',
      message: reason
        ? `Your registration was rejected: ${reason}`
        : 'Your registration was rejected. Please contact staff for more information.',
      link: '/student/register',
    });

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
