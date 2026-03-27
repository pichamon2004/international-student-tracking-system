import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

// GET /api/audit-logs
export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const skip = (page - 1) * limit;
    const { entity, userId, startDate, endDate } = req.query;

    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;
    if (userId) where.userId = parseInt(userId as string);
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(startDate as string) } : {}),
        ...(endDate ? { lte: new Date(endDate as string) } : {}),
      };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/audit-logs/:id
export const getAuditLogById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const log = await prisma.auditLog.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
    if (!log) {
      res.status(404).json({ success: false, message: 'Audit log not found' });
      return;
    }
    res.json({ success: true, data: log });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
