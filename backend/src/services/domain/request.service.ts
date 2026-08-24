import { RequestStatus } from '@prisma/client';
import * as requestRepository from '../../repositories/request.repository';
import * as advisorRepository from '../../repositories/advisor.repository';
import * as studentRepository from '../../repositories/student.repository';
import * as documentTemplateRepository from '../../repositories/documentTemplate.repository';
import { createNotification } from '../notification.service';
import { sendEmail } from '../external/email.service';
import { uploadToR2 } from '../external/r2.service';

export const getRequests = async (
  query: { status?: string; studentId?: string; advisorId?: string },
  userRole?: string,
  userId?: number
) => {
  let advisorWhereClause: object | undefined;

  if (userRole === 'DEAN') {
    advisorWhereClause = { status: 'FORWARDED_TO_DEAN' };
  } else if (userRole === 'ADVISOR' && userId !== undefined) {
    const advisor = await advisorRepository.findStudentIdsByUserId(userId);
    const myStudentIds = advisor?.students.map((s) => s.id) ?? [];
    advisorWhereClause = { studentId: { in: myStudentIds } };
  }

  return requestRepository.findMany({
    ...(query.status    ? { status: query.status as RequestStatus }             : {}),
    ...(query.studentId ? { studentId: parseInt(query.studentId) }              : {}),
    ...(query.advisorId ? { student: { advisorId: parseInt(query.advisorId) } } : {}),
    ...advisorWhereClause,
  });
};

export const getRequestById = async (
  id: number,
  userRole?: string,
  userId?: number
) => {
  const request = await requestRepository.findById(id);
  if (!request) {
    throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  }

  if (userRole === 'STUDENT' && userId !== undefined) {
    const student = await studentRepository.findByUserId(userId);
    if (!student || request.studentId !== student.id) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
    }
  }

  const documentTemplates = request.requestTypeId
    ? await documentTemplateRepository.findByRequestTypeId(request.requestTypeId)
    : [];

  return {
    ...request,
    requestType: request.requestType
      ? { ...request.requestType, documentTemplates }
      : null,
  };
};

export const createRequest = async (
  dto: {
    requestTypeId?: string | number;
    title: string;
    description?: string;
    formData?: unknown;
    studentId?: string | number;
  },
  userRole?: string,
  userId?: number
) => {
  if (!dto.title) {
    throw Object.assign(new Error('title is required'), { statusCode: 400 });
  }

  let studentId: number | undefined = dto.studentId !== undefined ? parseInt(String(dto.studentId)) : undefined;

  if (userRole === 'STUDENT' && userId !== undefined) {
    const student = await studentRepository.findByUserId(userId);
    if (!student) {
      throw Object.assign(new Error('Student profile not found'), { statusCode: 400 });
    }
    studentId = student.id;
  }

  if (!studentId) {
    throw Object.assign(new Error('studentId is required'), { statusCode: 400 });
  }

  return requestRepository.create({
    studentId,
    requestTypeId: dto.requestTypeId ? parseInt(String(dto.requestTypeId)) : null,
    title: dto.title,
    description: dto.description,
    formData: dto.formData ? JSON.stringify(dto.formData) : null,
  });
};

export const updateRequestStatus = async (
  requestId: number,
  dto: { status: string; comment?: string },
  userRole?: string,
  userId?: number,
  files?: Express.Multer.File[]
) => {
  const existing = await requestRepository.findByIdWithStudent(requestId);
  if (!existing) {
    throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  }

  let attachmentsJson: string | undefined;
  if (files && files.length > 0) {
    const urls = await Promise.all(
      files.map((f) =>
        uploadToR2(f.buffer, f.originalname, f.mimetype, 'request-attachments').then((r) => r.url)
      )
    );
    attachmentsJson = JSON.stringify(urls);
  }

  const attachmentsPatch = attachmentsJson !== undefined ? { attachments: attachmentsJson } : {};
  const isAdvisor = userRole === 'ADVISOR';

  const updateData = isAdvisor
    ? {
        status: dto.status as RequestStatus,
        advisorComment: dto.comment,
        advisorAt: new Date(),
        advisorId: userId,
        ...attachmentsPatch,
      }
    : {
        status: dto.status as RequestStatus,
        staffComment: dto.comment,
        staffAt: new Date(),
        staffId: userId,
        ...attachmentsPatch,
      };

  const updated = await requestRepository.updateStatus(requestId, updateData);

  const statusLabels: Record<string, string> = {
    ADVISOR_APPROVED:     'approved by your advisor',
    ADVISOR_REJECTED:     'rejected by your advisor',
    STAFF_APPROVED:       'approved by staff',
    STAFF_REJECTED:       'rejected by staff',
    FORWARDED_TO_ADVISOR: 'forwarded to your advisor',
    FORWARDED_TO_DEAN:    'forwarded to the dean',
    DEAN_APPROVED:        'approved by the dean',
    DEAN_REJECTED:        'rejected by the dean',
    CANCELLED:            'cancelled',
  };
  const label = statusLabels[dto.status];

  if (label) {
    createNotification({
      userId: existing.student.userId,
      type: 'REQUEST_UPDATE',
      title: 'Request Status Updated',
      message: `Your request "${existing.title}" has been ${label}.`,
      link: `/student/request/${requestId}`,
    }).catch(console.error);

    if (existing.student.email) {
      const studentName =
        [existing.student.firstNameEn, existing.student.lastNameEn].filter(Boolean).join(' ') || 'Student';
      sendEmail(
        existing.student.email,
        `Request Status Updated — ${existing.title}`,
        `<p>Dear ${studentName},</p>
         <p>Your request <strong>"${existing.title}"</strong> has been <strong>${label}</strong>.</p>
         ${dto.comment ? `<p>Comment: ${dto.comment}</p>` : ''}
         <p>Please log in to the IST system to view the details.</p>`
      ).catch(console.error);
    }
  }

  return updated;
};
