import prisma from '../../utils/prisma';
import * as repo from '../../repositories/changeRequest.repository';

export const submitChange = async (
  studentId: number,
  entityType: string,
  entityId: number | null,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: object,
) => {
  const existing = await repo.findPending(studentId, entityType, entityId);
  if (existing) {
    const err = Object.assign(new Error('A pending change request already exists for this item'), { statusCode: 409 });
    throw err;
  }
  return repo.create({ studentId, entityType, entityId, action, payload });
};

export const approveChange = async (id: number, reviewedBy: number, reviewNote?: string) => {
  const cr = await repo.findById(id);
  if (!cr || cr.status !== 'PENDING') {
    throw Object.assign(new Error('Change request not found or not pending'), { statusCode: 404 });
  }
  await applyChange(cr);
  return repo.updateStatus(id, 'APPROVED', reviewedBy, reviewNote);
};

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

export const listPending = () => repo.findAllPending();

export const getOne = (id: number) => repo.findById(id);

export const getPendingForEntity = (
  studentId: number,
  entityType: string,
  entityId: number | null,
) => repo.findPending(studentId, entityType, entityId);

async function applyChange(cr: Awaited<ReturnType<typeof repo.findById>>) {
  if (!cr) return;
  const p = cr.payload as Record<string, unknown>;

  switch (cr.entityType) {
    case 'STUDENT_PROFILE':
      await prisma.student.update({ where: { id: cr.studentId }, data: p as any });
      break;

    case 'DEPENDENT':
      if (cr.action === 'CREATE') {
        await prisma.dependent.create({ data: { ...(p as any), studentId: cr.studentId } });
      } else if (cr.action === 'UPDATE') {
        await prisma.dependent.update({ where: { id: cr.entityId! }, data: p as any });
      } else {
        await prisma.dependent.delete({ where: { id: cr.entityId! } });
      }
      break;

    case 'PASSPORT':
      await prisma.passport.upsert({
        where: { studentId: cr.studentId },
        update: p as any,
        create: { ...(p as any), studentId: cr.studentId },
      });
      break;

    case 'VISA':
      if (cr.action === 'CREATE') {
        await prisma.visa.create({ data: { ...(p as any), studentId: cr.studentId } });
      } else if (cr.action === 'UPDATE') {
        await prisma.visa.update({ where: { id: cr.entityId! }, data: p as any });
      } else {
        await prisma.visa.delete({ where: { id: cr.entityId! } });
      }
      break;

    case 'HEALTH_INSURANCE':
      if (cr.action === 'CREATE') {
        await prisma.healthInsurance.create({ data: { ...(p as any), studentId: cr.studentId } });
      } else if (cr.action === 'UPDATE') {
        await prisma.healthInsurance.update({ where: { id: cr.entityId! }, data: p as any });
      } else {
        await prisma.healthInsurance.delete({ where: { id: cr.entityId! } });
      }
      break;

    case 'ACADEMIC_DOCUMENT':
      if (cr.action === 'CREATE') {
        await prisma.academicDocument.create({ data: { ...(p as any), studentId: cr.studentId } });
      } else if (cr.action === 'UPDATE') {
        await prisma.academicDocument.update({ where: { id: cr.entityId! }, data: p as any });
      } else {
        await prisma.academicDocument.delete({ where: { id: cr.entityId! } });
      }
      break;
  }
}
