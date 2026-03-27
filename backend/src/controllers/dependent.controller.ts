import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { createNotification } from '../services/notification.service';
import { uploadToR2, deleteFromR2, keyFromUrl } from '../services/r2.service';

const EXPIRY_WARN_DAYS = 90;

// GET /api/students/:id/dependents
export const getDependents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const dependents = await prisma.dependent.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: dependents });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/students/:id/dependents/:depId
export const getDependentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const depId = parseInt(req.params.depId);

    const dep = await prisma.dependent.findFirst({ where: { id: depId, studentId } });
    if (!dep) {
      res.status(404).json({ success: false, message: 'Dependent not found' });
      return;
    }
    res.json({ success: true, data: dep });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/students/:id/dependents
export const createDependent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const {
      relationship, title, firstName, middleName, lastName,
      dateOfBirth, gender, nationality,
      passportNumber, passportExpiry, passportImageUrl,
      visaType, visaExpiry, visaImageUrl, visaStatus,
    } = req.body;

    if (!relationship || !firstName || !lastName || !dateOfBirth || !gender || !nationality) {
      res.status(400).json({
        success: false,
        message: 'relationship, firstName, lastName, dateOfBirth, gender, nationality are required',
      });
      return;
    }

    const dep = await prisma.dependent.create({
      data: {
        studentId,
        relationship, title, firstName, middleName, lastName,
        dateOfBirth: new Date(dateOfBirth),
        gender, nationality,
        passportNumber,
        passportExpiry: passportExpiry ? new Date(passportExpiry) : undefined,
        passportImageUrl,
        visaType,
        visaExpiry: visaExpiry ? new Date(visaExpiry) : undefined,
        visaImageUrl,
        visaStatus: visaStatus ?? 'ACTIVE',
      },
    });

    // Warn if dependent docs expire soon
    await _checkDependentExpiry(studentId, dep.passportExpiry, dep.visaExpiry, firstName);

    res.status(201).json({ success: true, data: dep });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /api/students/:id/dependents/:depId
export const updateDependent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const depId = parseInt(req.params.depId);

    const existing = await prisma.dependent.findFirst({ where: { id: depId, studentId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Dependent not found' });
      return;
    }

    const { dateOfBirth, passportExpiry, visaExpiry, ...rest } = req.body;

    const updated = await prisma.dependent.update({
      where: { id: depId },
      data: {
        ...rest,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        passportExpiry: passportExpiry ? new Date(passportExpiry) : undefined,
        visaExpiry: visaExpiry ? new Date(visaExpiry) : undefined,
      },
    });

    await _checkDependentExpiry(studentId, updated.passportExpiry, updated.visaExpiry, updated.firstName);

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/students/:id/dependents/:depId
export const deleteDependent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const depId = parseInt(req.params.depId);

    const existing = await prisma.dependent.findFirst({ where: { id: depId, studentId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Dependent not found' });
      return;
    }

    await prisma.dependent.delete({ where: { id: depId } });
    res.json({ success: true, message: 'Dependent deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ── Dependent Image Upload (passport / visa image) ─────────── */

// POST /api/students/:id/dependents/image?type=passport|visa
export const uploadDependentImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image file provided' });
      return;
    }
    const { url } = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'dependents');
    res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('[uploadDependentImage] error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
};

/* ── Dependent Document Upload ───────────────────────────────── */

// GET /api/students/:id/dependents/:depId/documents
export const getDependentDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const depId = parseInt(req.params.depId);
    const docs = await prisma.document.findMany({
      where: { dependentId: depId },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json({ success: true, data: docs });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/students/:id/dependents/:depId/documents
export const uploadDependentDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file provided' });
      return;
    }
    const depId = parseInt(req.params.depId);
    const studentId = parseInt(req.params.id);

    const dep = await prisma.dependent.findFirst({ where: { id: depId, studentId } });
    if (!dep) {
      res.status(404).json({ success: false, message: 'Dependent not found' });
      return;
    }

    const { url } = await uploadToR2(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'dependents'
    );

    const doc = await prisma.document.create({
      data: {
        dependentId: depId,
        name:        req.body.name || req.file.originalname,
        description: req.body.description,
        fileUrl:     url,
        fileType:    req.file.mimetype,
        fileSize:    req.file.size,
        uploadedBy:  req.user!.userId,
      },
    });
    res.status(201).json({ success: true, data: doc });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/students/:id/dependents/:depId/documents/:docId
export const deleteDependentDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: parseInt(req.params.docId) } });
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }
    await deleteFromR2(keyFromUrl(doc.fileUrl));
    await prisma.document.delete({ where: { id: doc.id } });
    res.json({ success: true, message: 'Document deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ── internal helpers ─────────────────────────────────────────── */
async function _checkDependentExpiry(
  studentId: number,
  passportExpiry: Date | null,
  visaExpiry: Date | null,
  name: string
) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { userId: true },
  });
  if (!student) return;

  const now = Date.now();
  const check = async (expiry: Date | null, docType: string) => {
    if (!expiry) return;
    const days = Math.ceil((expiry.getTime() - now) / 86_400_000);
    if (days <= EXPIRY_WARN_DAYS) {
      await createNotification({
        userId: student.userId,
        type: 'VISA_ALERT',
        title: `Dependent ${docType} Expiring Soon`,
        message: `${name}'s ${docType} expires in ${days} day(s). Please take action.`,
        link: '/student/profile',
      });
    }
  };

  await Promise.all([
    check(passportExpiry, 'Passport'),
    check(visaExpiry, 'Visa'),
  ]);
}
