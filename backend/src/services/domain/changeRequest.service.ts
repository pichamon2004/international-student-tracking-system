import type { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import * as repo from '../../repositories/changeRequest.repository';
import * as healthInsuranceService from './healthInsurance.service';
import * as academicDocumentService from './academicDocument.service';
import * as passportService from './passport.service';
import * as visaService from './visa.service';
import * as dependentService from './dependent.service';
import { STUDENT_FILES, resolveFileFields, withoutFileFields } from './fileFields';
import type { ClaimActor } from './filePolicy';
import { hasFileFields, presentChangeRequest, toStoredPayload } from './changeRequestFiles';

export const submitChange = async (
  studentId: number,
  entityType: string,
  entityId: number | null,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: object,
  actor?: ClaimActor,
) => {
  const existing = await repo.findPending(studentId, entityType, entityId);
  if (existing) {
    const err = Object.assign(new Error('A pending change request already exists for this item'), { statusCode: 409 });
    throw err;
  }
  // File URLs become fileIds, checked against this student now and again on approval
  if (hasFileFields(entityType) && action !== 'DELETE') {
    if (!actor) throw new Error(`submitChange(${entityType}) needs the actor to claim its files`);
    payload = await toStoredPayload(entityType, studentId, payload as Record<string, unknown>, actor);
  }
  return presentChangeRequest(await repo.create({ studentId, entityType, entityId, action, payload }));
};

export const approveChange = async (id: number, reviewedBy: number, reviewNote?: string) =>
  // One transaction: the request stays PENDING-locked while its files are re-claimed and written,
  // so a concurrent cancel/approve or file delete either waits or makes the whole approval fail.
  prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ status: string }[]>`SELECT status FROM change_requests WHERE id = ${id} FOR UPDATE`;
    if (locked.length === 0 || locked[0].status !== 'PENDING') {
      throw Object.assign(new Error('Change request not found or not pending'), { statusCode: 404 });
    }
    const cr = await tx.changeRequest.findUniqueOrThrow({ where: { id }, include: { student: { select: { userId: true } } } });
    try {
      await applyChange(cr, tx);
    } catch (err) {
      // The target record or a file changed since submission — nothing is applied
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 400 || status === 404) {
        throw Object.assign(new Error(`The data has changed since this request was submitted — please review it again (${(err as Error).message})`), { statusCode: 409 });
      }
      throw err;
    }
    return tx.changeRequest.update({
      where: { id },
      data: { status: 'APPROVED', reviewedBy, reviewNote, reviewedAt: new Date() },
    });
  }, { timeout: 30_000 });

export const rejectChange = async (id: number, reviewedBy: number, reviewNote?: string) => {
  const cr = await repo.findById(id);
  if (!cr || cr.status !== 'PENDING') {
    throw Object.assign(new Error('Change request not found or not pending'), { statusCode: 404 });
  }
  return repo.updateStatus(id, 'REJECTED', reviewedBy, reviewNote);
};

export const cancelChange = async (id: number, studentId: number) => {
  const cr = await repo.findById(id);
  if (!cr || cr.status !== 'PENDING') {
    throw Object.assign(new Error('Change request not found or not pending'), { statusCode: 404 });
  }
  if (cr.studentId !== studentId) {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }
  return repo.updateStatus(id, 'CANCELLED');
};

export const listPending = async () => Promise.all((await repo.findAllPending()).map(cr => presentChangeRequest(cr)));

export const getOne = async (id: number) => presentChangeRequest(await repo.findById(id));

export const listPendingOfType = async (studentId: number, entityType: string) =>
  Promise.all((await repo.findPendingOfType(studentId, entityType)).map(cr => presentChangeRequest(cr)));

export const getPendingForEntity = async (
  studentId: number,
  entityType: string,
  entityId: number | null,
) => presentChangeRequest(await repo.findPending(studentId, entityType, entityId));

// Change request payloads are stored as plain JSON, so date fields arrive as
// "YYYY-MM-DD" strings rather than Date objects. Prisma's raw client requires
// a full ISO-8601 DateTime for DateTime columns, so convert any date-looking
// string before handing the payload to Prisma.
function coerceDates(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val)) {
      const d = new Date(val);
      out[key] = isNaN(d.getTime()) ? val : d;
    } else {
      out[key] = val;
    }
  }
  return out;
}

type LockedChangeRequest = Prisma.ChangeRequestGetPayload<{ include: { student: { select: { userId: true } } } }>;

async function applyChange(cr: LockedChangeRequest, tx: Prisma.TransactionClient) {
  const p = coerceDates(cr.payload as Record<string, unknown>);
  // Files are re-claimed as the student who submitted: still there, still theirs, right purpose
  const submitter: ClaimActor = { userId: cr.student.userId, activeRole: 'STUDENT', permissions: [], studentId: cr.studentId };

  switch (cr.entityType) {
    case 'STUDENT_PROFILE': {
      const target = { kind: 'student' as const, studentId: cr.studentId };
      const photo = await resolveFileFields(p, STUDENT_FILES, target, submitter, tx);
      await tx.student.update({ where: { id: cr.studentId }, data: { ...withoutFileFields(p, STUDENT_FILES), ...photo } as any });
      break;
    }

    case 'DEPENDENT':
      if (cr.action === 'CREATE') {
        await dependentService.createDependent(cr.studentId, p as any, submitter, tx);
      } else if (cr.action === 'UPDATE') {
        await dependentService.updateDependent(cr.entityId!, cr.studentId, p as any, submitter, tx);
      } else {
        await dependentService.deleteDependent(cr.entityId!, cr.studentId, tx);
      }
      break;

    case 'PASSPORT':
      if (cr.action === 'CREATE') {
        // Retires the previous current passport into history
        await passportService.createPassport(cr.studentId, p as any, submitter, tx);
      } else if (cr.action === 'UPDATE') {
        if (cr.entityId) {
          await passportService.updatePassport(cr.studentId, cr.entityId, p as any, submitter, tx);
        } else {
          // Requests submitted before multi-passport support
          await passportService.updateCurrentPassport(cr.studentId, p as any, submitter, tx);
        }
      } else {
        await passportService.deletePassport(cr.studentId, cr.entityId!, tx);
      }
      break;

    case 'VISA':
      if (cr.action === 'CREATE') {
        await visaService.createVisa(cr.studentId, p as any, submitter, tx);
      } else if (cr.action === 'UPDATE') {
        await visaService.updateVisa(cr.entityId!, cr.studentId, p as any, submitter, tx);
      } else {
        await visaService.deleteVisa(cr.entityId!, cr.studentId, tx);
      }
      break;

    case 'HEALTH_INSURANCE':
      if (cr.action === 'CREATE') {
        // Same path as a direct create: retires the previous current policy
        // (otherwise the student ends up with two "current" policies) and
        // parses the date-only strings the form sends.
        await healthInsuranceService.createHealthInsurance(cr.studentId, p as any, submitter, tx);
      } else if (cr.action === 'UPDATE') {
        await healthInsuranceService.updateHealthInsurance(cr.entityId!, cr.studentId, p as any, submitter, tx);
      } else {
        await healthInsuranceService.deleteHealthInsurance(cr.entityId!, cr.studentId, tx);
      }
      break;

    case 'ACADEMIC_DOCUMENT':
      if (cr.action === 'CREATE') {
        await academicDocumentService.createAcademicDocument(cr.studentId, p as any, submitter, tx);
      } else if (cr.action === 'UPDATE') {
        await academicDocumentService.updateAcademicDocument(cr.entityId!, cr.studentId, p as any, submitter, tx);
      } else {
        await academicDocumentService.deleteAcademicDocument(cr.entityId!, cr.studentId, tx);
      }
      break;
  }
}
