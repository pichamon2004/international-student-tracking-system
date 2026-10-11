import { RequestStatus } from '@prisma/client';
import prisma from '../../utils/prisma';
import * as requestRepository from '../../repositories/request.repository';
import * as advisorRepository from '../../repositories/advisor.repository';
import * as studentRepository from '../../repositories/student.repository';
import * as documentTemplateRepository from '../../repositories/documentTemplate.repository';
import * as templateVariableRepository from '../../repositories/templateVariable.repository';
import * as deanDelegationRepository from '../../repositories/deanDelegation.repository';
import * as requestCancellationRepository from '../../repositories/requestCancellation.repository';
import * as generatedDocRepository from '../../repositories/generatedDoc.repository';
import * as deanDelegationService from './deanDelegation.service';
import * as generatedDocService from './generatedDoc.service';
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

// The "Submit disabled until filled" check on the frontend is only a UI
// nicety — it can be bypassed (devtools, direct API calls), and the
// student-entered data that fills it is not trustworthy on its own. Re-derive
// which variables actually require student input (inputType !== 'auto') from
// the request type's document templates and reject if any are missing.
const assertRequiredFields = async (requestTypeId: number, rawFormData: unknown) => {
  const templates = await documentTemplateRepository.findByRequestTypeId(requestTypeId);
  const requiredKeys = new Set<string>();
  for (const t of templates) {
    const vars: string[] = t.variables ? JSON.parse(t.variables) : [];
    for (const token of vars) {
      const key = token.replace(/[{}]/g, '');
      if (!key.startsWith('sig_')) requiredKeys.add(key);
    }
  }

  if (requiredKeys.size === 0) return;

  const varDefs = await templateVariableRepository.findAll();
  const inputTypeByKey = new Map(varDefs.map(v => [v.key, v.inputType]));
  const formData = (rawFormData ?? {}) as Record<string, string>;

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
};

// Loads a request and confirms it belongs to the calling student.
const findOwnRequest = async (requestId: number, userId?: number) => {
  const request = await requestRepository.findByIdWithStudent(requestId);
  if (!request) {
    throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  }
  const student = userId !== undefined ? await studentRepository.findByUserId(userId) : null;
  if (!student || request.studentId !== student.id) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }
  return request;
};

// Statuses where the request is still moving through the workflow.
const OPEN_STATUSES: RequestStatus[] = [
  'PENDING', 'STAFF_APPROVED', 'FORWARDED_TO_ADVISOR', 'ADVISOR_APPROVED', 'FORWARDED_TO_DEAN',
];

const findActiveStaffUsers = () =>
  prisma.user.findMany({
    where: { isActive: true, userRoles: { some: { role: { code: 'STAFF' } } } },
    select: { id: true, email: true },
  });

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

  if (dto.requestTypeId) {
    await assertRequiredFields(parseInt(String(dto.requestTypeId)), dto.formData);
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
  if (existing.cancellations.length > 0) {
    throw Object.assign(
      new Error('This request has a cancellation pending staff review'),
      { statusCode: 409 }
    );
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

  // Templates using the "approval" signing method get the approver's name
  // printed into their signature box as soon as they approve.
  const approvalRole: Record<string, string> = {
    STAFF_APPROVED:   'ir_staff',
    ADVISOR_APPROVED: 'advisor',
    DEAN_APPROVED:    'dean',
  };
  if (approvalRole[dto.status] && userId !== undefined) {
    await generatedDocService
      .recordApprovalSignature(requestId, approvalRole[dto.status], userId)
      .catch(console.error);
  }

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
      cancellations: { where: { status: 'PENDING' }, take: 1 },
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

  // A pending cancellation freezes the workflow until staff decide on it,
  // so staff are the ones holding things up regardless of the status.
  const cancellationPending = request.cancellations.length > 0;

  if (!cancellationPending && request.status === 'FORWARDED_TO_ADVISOR' && request.student.advisor?.userId) {
    recipients = [{ userId: request.student.advisor.userId, email: request.student.advisor.user?.email ?? null }];
    roleLabel = 'Advisor';
    linkBase = '/advisor/request';
  } else if (!cancellationPending && request.status === 'FORWARDED_TO_DEAN') {
    const signatory = await deanDelegationService.getActiveSignatory();
    const deanUser = await prisma.user.findUnique({ where: { id: signatory.id }, select: { email: true } });
    recipients = [{ userId: signatory.id, email: deanUser?.email ?? null }];
    roleLabel = signatory.isDelegated ? 'Vice Dean (delegate)' : 'Dean';
    linkBase = '/dean/request';
  } else {
    // PENDING, STAFF_APPROVED, ADVISOR_APPROVED (awaiting staff to forward it) → whole staff pool
    const staffUsers = await findActiveStaffUsers();
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

// ── student edit ────────────────────────────────────────────────────

export const updateRequest = async (
  requestId: number,
  dto: { description?: string; formData?: unknown },
  userId?: number
) => {
  const existing = await findOwnRequest(requestId, userId);

  if (existing.status !== 'PENDING') {
    throw Object.assign(
      new Error('This request is already being processed and can no longer be edited'),
      { statusCode: 409 }
    );
  }
  if (existing.cancellations.length > 0) {
    throw Object.assign(
      new Error('This request has a cancellation pending staff review'),
      { statusCode: 409 }
    );
  }

  if (existing.requestTypeId) {
    await assertRequiredFields(existing.requestTypeId, dto.formData);
  }

  const updated = await requestRepository.updateContent(requestId, {
    description: dto.description,
    formData: dto.formData ? JSON.stringify(dto.formData) : null,
  });

  // Any generated PDF (and the signatures on it) was built from the old form
  // data — drop it so the student re-generates and re-signs the new version.
  await generatedDocRepository.deleteByRequestId(requestId);

  return updated;
};

// ── cancellation ────────────────────────────────────────────────────

export const requestCancel = async (requestId: number, reason: string, userId?: number) => {
  if (!reason || !reason.trim()) {
    throw Object.assign(new Error('reason is required'), { statusCode: 400 });
  }

  const existing = await findOwnRequest(requestId, userId);

  if (!OPEN_STATUSES.includes(existing.status)) {
    throw Object.assign(new Error('This request is already closed'), { statusCode: 409 });
  }
  if (existing.cancellations.length > 0) {
    throw Object.assign(
      new Error('A cancellation request is already pending for this request'),
      { statusCode: 409 }
    );
  }

  const cancellation = await requestCancellationRepository.create(requestId, reason.trim());

  const studentName =
    [existing.student.firstNameEn, existing.student.lastNameEn].filter(Boolean).join(' ') || 'A student';
  const message = `${studentName} asked to cancel the request "${existing.title}". Reason: ${reason.trim()}`;
  const link = `/staff/request/${requestId}`;

  findActiveStaffUsers()
    .then(async (staff) => {
      await createNotifications(staff.map(u => u.id), {
        type: 'REQUEST_UPDATE',
        title: 'Cancellation Requested',
        message,
        link,
      });
      await Promise.all(
        staff
          .filter((u): u is { id: number; email: string } => !!u.email)
          .map(u => sendEmail(
            u.email,
            `[IST] Cancellation Requested — ${existing.title}`,
            `<p>Dear Staff,</p>
             <p>${message}</p>
             <p>Please log in to the IST system to approve or reject the cancellation.</p>`
          ))
      );
    })
    .catch(console.error);

  return cancellation;
};

export const reviewCancel = async (
  requestId: number,
  dto: { approve: boolean; note?: string },
  staffUserId?: number
) => {
  if (staffUserId === undefined) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }

  const existing = await requestRepository.findByIdWithStudent(requestId);
  if (!existing) {
    throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  }
  const pending = existing.cancellations[0];
  if (!pending) {
    throw Object.assign(new Error('No pending cancellation for this request'), { statusCode: 404 });
  }

  const result = await requestCancellationRepository.review(
    pending.id, requestId, dto.approve, staffUserId, dto.note
  );

  const label = dto.approve ? 'approved' : 'rejected';
  createNotification({
    userId: existing.student.userId,
    type: 'REQUEST_UPDATE',
    title: `Cancellation ${dto.approve ? 'Approved' : 'Rejected'}`,
    message: `Your cancellation request for "${existing.title}" has been ${label}.`,
    link: `/student/request/${requestId}`,
  }).catch(console.error);

  if (existing.student.email) {
    const studentName =
      [existing.student.firstNameEn, existing.student.lastNameEn].filter(Boolean).join(' ') || 'Student';
    sendEmail(
      existing.student.email,
      `Cancellation ${dto.approve ? 'Approved' : 'Rejected'} — ${existing.title}`,
      `<p>Dear ${studentName},</p>
       <p>Your cancellation request for <strong>"${existing.title}"</strong> has been <strong>${label}</strong>.</p>
       ${dto.note ? `<p>Comment: ${dto.note}</p>` : ''}
       ${dto.approve ? '' : '<p>Your request will continue through the normal approval process.</p>'}
       <p>Please log in to the IST system to view the details.</p>`
    ).catch(console.error);
  }

  return result;
};
