import { Response } from 'express';
import { AuthRequest } from '../types';
import * as service from '../services/domain/changeRequest.service';
import prisma from '../utils/prisma';

export const listPending = async (_req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.listPending();
  res.json({ success: true, data });
};

export const getOne = async (req: AuthRequest, res: Response): Promise<void> => {
  const cr = await service.getOne(parseInt(req.params.id));
  if (!cr) { res.status(404).json({ success: false, message: 'Not found' }); return; }
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

export const getPendingForEntity = async (req: AuthRequest, res: Response): Promise<void> => {
  const { entityType, entityId, studentId } = req.query;
  const eid = entityId ? parseInt(entityId as string) : null;
  const sid = parseInt(studentId as string);
  const cr = await service.getPendingForEntity(sid, entityType as string, eid);
  res.json({ success: true, data: cr ?? null });
};
