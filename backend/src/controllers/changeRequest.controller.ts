import { Response } from 'express';
import { AuthRequest } from '../types';
import * as service from '../services/domain/changeRequest.service';
import prisma from '../utils/prisma';

export const listPending = async (_req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.listPending();
  res.json({ success: true, data });
};

// Staff review every request; a student sees only their own. Everyone else is refused.
async function canReadStudentRequests(req: AuthRequest, studentId: number): Promise<boolean> {
  const role = req.user?.activeRole;
  if (role === 'STAFF') return true;
  if (role !== 'STUDENT' || !Number.isInteger(studentId)) return false;
  const me = await prisma.student.findUnique({ where: { userId: req.user!.userId }, select: { id: true } });
  return me?.id === studentId;
}

export const getOne = async (req: AuthRequest, res: Response): Promise<void> => {
  const cr = await service.getOne(parseInt(req.params.id));
  // Same 404 whether it doesn't exist or isn't yours — don't reveal which ids exist
  if (!cr || !(await canReadStudentRequests(req, cr.studentId))) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }
  res.json({ success: true, data: cr });
};

export const approve = async (req: AuthRequest, res: Response): Promise<void> => {
  const cr = await service.approveChange(
    parseInt(req.params.id),
    req.user!.userId,
    req.body.reviewNote,
  );
  res.json({ success: true, data: cr });
};

export const reject = async (req: AuthRequest, res: Response): Promise<void> => {
  const cr = await service.rejectChange(
    parseInt(req.params.id),
    req.user!.userId,
    req.body.reviewNote,
  );
  res.json({ success: true, data: cr });
};

export const cancel = async (req: AuthRequest, res: Response): Promise<void> => {
  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
  if (!student) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  const cr = await service.cancelChange(parseInt(req.params.id), student.id);
  res.json({ success: true, data: cr });
};

// GET /api/change-requests/pending?entityType=VISA&studentId=1 — all pending requests on that kind of record
export const listPendingOfType = async (req: AuthRequest, res: Response): Promise<void> => {
  const sid = parseInt(req.query.studentId as string);
  if (!(await canReadStudentRequests(req, sid))) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  const data = await service.listPendingOfType(sid, String(req.query.entityType ?? ''));
  res.json({ success: true, data });
};

export const getPendingForEntity = async (req: AuthRequest, res: Response): Promise<void> => {
  const { entityType, entityId, studentId } = req.query;
  const eid = entityId ? parseInt(entityId as string) : null;
  const sid = parseInt(studentId as string);
  if (!(await canReadStudentRequests(req, sid))) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  const cr = await service.getPendingForEntity(sid, entityType as string, eid);
  res.json({ success: true, data: cr ?? null });
};
