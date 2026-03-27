import { Response } from 'express';
import prisma from '../utils/prisma';
import { RequestStatus } from '@prisma/client';
import { AuthRequest } from '../types';
import { createNotification } from '../services/notification.service';
import { sendEmail } from '../services/email.service';
import { uploadToR2 } from '../services/r2.service';

// GET /api/requests
// query: ?status=PENDING&studentId=1&advisorId=2
export const getRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, studentId, advisorId } = req.query;

    // ADVISOR เห็นเฉพาะ requests ของ students ในความดูแล
    let advisorStudentIds: number[] | undefined;
    if (req.user?.role === 'ADVISOR') {
      const advisor = await prisma.advisor.findUnique({
        where: { userId: req.user.userId },
        select: { students: { select: { id: true } } },
      });
      advisorStudentIds = advisor?.students.map((s) => s.id) ?? [];
    }

    const requests = await prisma.request.findMany({
      where: {
        ...(status    ? { status: status as RequestStatus }         : {}),
        ...(studentId ? { studentId: parseInt(studentId as string) } : {}),
        ...(advisorId ? { student: { advisorId: parseInt(advisorId as string) } } : {}),
        ...(advisorStudentIds ? { studentId: { in: advisorStudentIds } } : {}),
      },
      include: {
        student: {
          select: {
            id: true, studentId: true,
            firstNameEn: true, lastNameEn: true, titleEn: true,
            email: true, program: true, faculty: true,
          },
        },
        requestType: { select: { id: true, name: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: requests });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/requests/:id
export const getRequestById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request = await prisma.request.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        student: true,
        requestType: {
          include: {
            documentTemplates: {
              select: { id: true, name: true, description: true, variables: true, body: true },
            },
          },
        },
      },
    });
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }

    // STUDENT เห็นได้แค่ request ของตัวเอง
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.userId },
        select: { id: true },
      });
      if (!student || request.studentId !== student.id) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }
    }

    res.json({ success: true, data: request });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/requests  (student submits)
export const createRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { requestTypeId, title, description, formData } = req.body;
    let { studentId } = req.body;

    if (!title) {
      res.status(400).json({ success: false, message: 'title is required' });
      return;
    }

    // STUDENT: ใช้ studentId ของตัวเองเสมอ (ไม่ให้ส่ง studentId อื่นมาได้)
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.userId },
        select: { id: true },
      });
      if (!student) {
        res.status(400).json({ success: false, message: 'Student profile not found' });
        return;
      }
      studentId = student.id;
    }

    if (!studentId) {
      res.status(400).json({ success: false, message: 'studentId is required' });
      return;
    }

    const request = await prisma.request.create({
      data: {
        studentId: parseInt(studentId),
        requestTypeId: requestTypeId ? parseInt(requestTypeId) : null,
        title,
        description,
        formData: formData ? JSON.stringify(formData) : null,
        status: 'PENDING',
      },
      include: {
        requestType: { select: { id: true, name: true, icon: true } },
      },
    });
    res.status(201).json({ success: true, data: request });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /api/requests/:id/status  (staff/advisor updates status)
export const updateRequestStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, comment } = req.body;
    const requestId = parseInt(req.params.id);

    const existing = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        student: {
          select: { userId: true, email: true, firstNameEn: true, lastNameEn: true },
        },
      },
    });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }

    // แยก field ที่ update ตาม role
    const isAdvisor = req.user?.role === 'ADVISOR';

    // Upload files from advisor and save to attachments
    let attachmentsJson: string | undefined;
    if (isAdvisor && req.files && Array.isArray(req.files) && req.files.length > 0) {
      const urls = await Promise.all(
        (req.files as Express.Multer.File[]).map(f =>
          uploadToR2(f.buffer, f.originalname, f.mimetype, 'request-attachments').then(r => r.url)
        )
      );
      attachmentsJson = JSON.stringify(urls);
    }

    const updateData = isAdvisor
      ? { status, advisorComment: comment, advisorAt: new Date(), advisorId: req.user?.userId, ...(attachmentsJson !== undefined ? { attachments: attachmentsJson } : {}) }
      : { status, staffComment: comment, staffAt: new Date(), staffId: req.user?.userId };

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: updateData,
    });

    const statusLabels: Record<string, string> = {
      ADVISOR_APPROVED:    'approved by your advisor',
      ADVISOR_REJECTED:    'rejected by your advisor',
      STAFF_APPROVED:      'approved by staff',
      STAFF_REJECTED:      'rejected by staff',
      FORWARDED_TO_ADVISOR:'forwarded to your advisor',
      FORWARDED_TO_DEAN:   'forwarded to the dean',
      DEAN_APPROVED:       'approved by the dean',
      DEAN_REJECTED:       'rejected by the dean',
      CANCELLED:           'cancelled',
    };
    const label = statusLabels[status];
    if (label) {
      await createNotification({
        userId: existing.student.userId,
        type: 'REQUEST_UPDATE',
        title: 'Request Status Updated',
        message: `Your request "${existing.title}" has been ${label}.`,
        link: `/student/request/${requestId}`,
      });

      if (existing.student.email) {
        const studentName = [existing.student.firstNameEn, existing.student.lastNameEn]
          .filter(Boolean).join(' ') || 'Student';
        await sendEmail(
          existing.student.email,
          `Request Status Updated — ${existing.title}`,
          `<p>Dear ${studentName},</p>
           <p>Your request <strong>"${existing.title}"</strong> has been <strong>${label}</strong>.</p>
           ${comment ? `<p>Comment: ${comment}</p>` : ''}
           <p>Please log in to the IST system to view the details.</p>`
        );
      }
    }

    res.json({ success: true, data: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
