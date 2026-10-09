import { RequestStatus } from '@prisma/client';
import prisma from '../../utils/prisma';
import * as requestRepository from '../../repositories/request.repository';
import * as advisorRepository from '../../repositories/advisor.repository';
import * as studentRepository from '../../repositories/student.repository';
import * as documentTemplateRepository from '../../repositories/documentTemplate.repository';
import * as templateVariableRepository from '../../repositories/templateVariable.repository';
import * as deanDelegationRepository from '../../repositories/deanDelegation.repository';
import * as deanDelegationService from './deanDelegation.service';
import { createNotification, createNotifications } from '../notification.service';
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
  } else if (userRole === 'VICE_DEAN' && userId !== undefined) {
    // A vice dean only ever sees dean-level requests while an active
    // delegation names them — otherwise they get nothing, not everyone's.
    const activeDelegation = await deanDelegationRepository.findActiveByDelegateId(userId);
    advisorWhereClause = activeDelegation
      ? { status: 'FORWARDED_TO_DEAN' }
      : { id: -1 };
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

  if (userRole === 'VICE_DEAN' && userId !== undefined) {
    const activeDelegation = await deanDelegationRepository.findActiveByDelegateId(userId);
    if (!activeDelegation) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
    }
  }

  if (userRole === 'ADVISOR' && userId !== undefined) {
    const advisor = await advisorRepository.findStudentIdsByUserId(userId);
    const myStudentIds = advisor?.students.map((s) => s.id) ?? [];
    if (!myStudentIds.includes(request.studentId)) {
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

  // The "Submit disabled until filled" check on the frontend is only a UI
  // nicety — it can be bypassed (devtools, direct API calls), and the
  // student-entered data that fills it is not trustworthy on its own. Re-derive
  // which variables actually require student input (inputType !== 'auto') from
  // the request type's document templates and reject if any are missing.
  if (dto.requestTypeId) {
    const templates = await documentTemplateRepository.findByRequestTypeId(parseInt(String(dto.requestTypeId)));
    const requiredKeys = new Set<string>();
    for (const t of templates) {
      const vars: string[] = t.variables ? JSON.parse(t.variables) : [];
      for (const token of vars) {
        const key = token.replace(/[{}]/g, '');
        if (!key.startsWith('sig_')) requiredKeys.add(key);
      }
    }

    if (requiredKeys.size > 0) {
      const varDefs = await templateVariableRepository.findAll();
      const inputTypeByKey = new Map(varDefs.map(v => [v.key, v.inputType]));
      const formData = (dto.formData ?? {}) as Record<string, string>;

      const missing = [...requiredKeys].filter((key) => {
        const inputType = inputTypeByKey.get(key) ?? 'auto';
        if (inputType === 'auto') return false; // auto-filled from student profile, not student input
        const val = formData[key];
        return !val || !String(val).trim() || val === '—';
      });

      if (missing.length > 0) {
        throw Object.assign(
          new Error(`Please fill in the required fields: ${missing.join(', ')}`),
          { statusCode: 400 }
        );
      }
    }
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
  const isDean = userRole === 'DEAN' || userRole === 'VICE_DEAN';

  const updateData = isAdvisor
    ? {
        status: dto.status as RequestStatus,
        advisorComment: dto.comment,
        advisorAt: new Date(),
        advisorId: userId,
        ...attachmentsPatch,
      }
    : isDean
    ? {
        status: dto.status as RequestStatus,
        deanComment: dto.comment,
        deanAt: new Date(),
        deanId: userId,
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

// ── follow-up reminder ──────────────────────────────────────────────

export const followUp = async (requestId: number) => {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      student: {
        select: {
          firstNameEn: true,
          lastNameEn: true,
          advisor: { select: { userId: true, user: { select: { email: true } } } },
        },
      },
    },
  });
  if (!request) {
    throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  }

  const studentName = [request.student.firstNameEn, request.student.lastNameEn].filter(Boolean).join(' ') || 'A student';
  const message = `Reminder: the request "${request.title}" for ${studentName} has been pending in the same status for a while and needs your attention.`;

  let recipients: { userId: number; email: string | null }[] = [];
  let roleLabel = 'Staff';
  let linkBase = '/staff/request';

  if (request.status === 'FORWARDED_TO_ADVISOR' && request.student.advisor?.userId) {
    recipients = [{ userId: request.student.advisor.userId, email: request.student.advisor.user?.email ?? null }];
    roleLabel = 'Advisor';
    linkBase = '/advisor/request';
  } else if (request.status === 'FORWARDED_TO_DEAN') {
    const signatory = await deanDelegationService.getActiveSignatory();
    const deanUser = await prisma.user.findUnique({ where: { id: signatory.id }, select: { email: true } });
    recipients = [{ userId: signatory.id, email: deanUser?.email ?? null }];
    roleLabel = signatory.isDelegated ? 'Vice Dean (delegate)' : 'Dean';
    linkBase = '/dean/request';
  } else {
    // PENDING, STAFF_APPROVED, ADVISOR_APPROVED (awaiting staff to forward it) → whole staff pool
    const staffUsers = await prisma.user.findMany({
      where: { isActive: true, userRoles: { some: { role: { code: 'STAFF' } } } },
      select: { id: true, email: true },
    });
    recipients = staffUsers.map(u => ({ userId: u.id, email: u.email }));
    roleLabel = 'Staff';
    linkBase = '/staff/request';
  }

  if (recipients.length === 0) {
    throw Object.assign(
      new Error("No responsible person found for this request's current status"),
      { statusCode: 404 }
    );
  }

  const link = `${linkBase}/${requestId}`;

  await createNotifications(recipients.map(r => r.userId), {
    type: 'REQUEST_UPDATE',
    title: 'Follow-up: Request Needs Attention',
    message,
    link,
  });

  await Promise.all(
    recipients
      .filter((r): r is { userId: number; email: string } => !!r.email)
      .map(r => sendEmail(
        r.email,
        `[IST] Follow-up Reminder — ${request.title}`,
        `<p>Dear ${roleLabel},</p>
         <p>${message}</p>
         <p>Please log in to the IST system to take action.</p>`
      ))
  );

  return { roleLabel, notifiedCount: recipients.length };
};
