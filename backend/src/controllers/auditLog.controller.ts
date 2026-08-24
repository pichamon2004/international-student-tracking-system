import { Response } from 'express';
import { AuthRequest } from '../types';
import * as auditLogService from '../services/domain/auditLog.service';

// GET /api/audit-logs
export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  const page  = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const { entity, userId, startDate, endDate } = req.query;

  const { logs, total, totalPages } = await auditLogService.getAuditLogs({
    page,
    limit,
    entity:    entity as string | undefined,
    userId:    userId ? parseInt(userId as string) : undefined,
    startDate: startDate as string | undefined,
    endDate:   endDate as string | undefined,
  });

  res.json({ success: true, data: logs, pagination: { page, limit, total, totalPages } });
};

// GET /api/audit-logs/:id
export const getAuditLogById = async (req: AuthRequest, res: Response): Promise<void> => {
  const log = await auditLogService.getAuditLogById(parseInt(req.params.id));
  res.json({ success: true, data: log });
};
