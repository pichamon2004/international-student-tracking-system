import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { sendEmail, sendTemplateEmail } from '../services/email.service';

/**
 * สร้าง variables จากข้อมูล student สำหรับใส่ใน email template อัตโนมัติ
 */
const buildStudentVariables = (student: {
  firstNameEn: string | null;
  lastNameEn: string | null;
  studentId: string | null;
  program: string | null;
  faculty: string | null;
  email: string | null;
  visas: { visaType: string; expiryDate: Date }[];
  passports: { passportNumber: string; expiryDate: Date }[];
}): Record<string, string> => {
  const name = [student.firstNameEn, student.lastNameEn].filter(Boolean).join(' ') || '-';
  const currentVisa    = student.visas[0];
  const currentPassport = student.passports[0];

  return {
    student_name:      name,
    student_id:        student.studentId ?? '-',
    student_email:     student.email ?? '-',
    program:           student.program ?? '-',
    faculty:           student.faculty ?? '-',
    visa_type:         currentVisa?.visaType ?? '-',
    visa_expiry:       currentVisa?.expiryDate.toDateString() ?? '-',
    passport_number:   currentPassport?.passportNumber ?? '-',
    passport_expiry:   currentPassport?.expiryDate.toDateString() ?? '-',
  };
};

// POST /api/students/:id/send-email
// body: { templateId, extraVariables? }
export const sendEmailToStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const { templateId, extraVariables } = req.body;

    if (!templateId) {
      res.status(400).json({ success: false, message: 'templateId is required' });
      return;
    }

    // ดึงข้อมูล student พร้อม visa + passport ปัจจุบัน
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        firstNameEn: true, lastNameEn: true,
        studentId: true, email: true,
        program: true, faculty: true,
        user: { select: { email: true } },
        visas: {
          where: { status: 'ACTIVE', isCurrent: true },
          orderBy: { expiryDate: 'asc' },
          take: 1,
          select: { visaType: true, expiryDate: true },
        },
        passports: {
          where: { isCurrent: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { passportNumber: true, expiryDate: true },
        },
      },
    });

    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const recipientEmail = student.email || student.user.email;
    if (!recipientEmail) {
      res.status(400).json({ success: false, message: 'Student has no email address' });
      return;
    }

    // รวม auto-fill variables + extraVariables ที่ staff ส่งมา
    const autoVariables = buildStudentVariables(student);
    const variables = { ...autoVariables, ...(extraVariables ?? {}) };

    await sendTemplateEmail(recipientEmail, parseInt(templateId), variables);

    res.json({
      success: true,
      message: `Email sent to ${recipientEmail}`,
      data: { recipient: recipientEmail, variables },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/students/:id/send-email/custom
// ส่ง email แบบกำหนด subject + body เองโดยไม่ใช้ template
// body: { subject, html, extraVariables? }
export const sendCustomEmailToStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const { subject, html } = req.body;

    if (!subject || !html) {
      res.status(400).json({ success: false, message: 'subject and html are required' });
      return;
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        firstNameEn: true, lastNameEn: true,
        email: true,
        user: { select: { email: true } },
      },
    });

    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const recipientEmail = student.email || student.user.email;
    if (!recipientEmail) {
      res.status(400).json({ success: false, message: 'Student has no email address' });
      return;
    }

    await sendEmail(recipientEmail, subject, html);

    res.json({ success: true, message: `Email sent to ${recipientEmail}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/students/:id/email-variables
// ดึง auto-fill variables ของ student ให้ frontend แสดง preview ก่อนส่ง
export const getStudentEmailVariables = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        firstNameEn: true, lastNameEn: true,
        studentId: true, email: true,
        program: true, faculty: true,
        user: { select: { email: true } },
        visas: {
          where: { status: 'ACTIVE', isCurrent: true },
          orderBy: { expiryDate: 'asc' },
          take: 1,
          select: { visaType: true, expiryDate: true },
        },
        passports: {
          where: { isCurrent: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { passportNumber: true, expiryDate: true },
        },
      },
    });

    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const variables = buildStudentVariables(student);
    const recipientEmail = student.email || student.user.email;

    res.json({ success: true, data: { recipientEmail, variables } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
