import * as auditLogRepository from '../../repositories/auditLog.repository';

export const getAuditLogs = async (query: {
  page: number;
  limit: number;
  entity?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
}) => {
  const { page, limit, entity, userId, startDate, endDate } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (entity) where.entity = entity;
  if (userId) where.userId = userId;
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate   ? { lte: new Date(endDate) }   : {}),
    };
  }

  const [logs, total] = await Promise.all([
    auditLogRepository.findMany(where, skip, limit),
    auditLogRepository.countMany(where),
  ]);

  return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getAuditLogById = async (id: number) => {
  const log = await auditLogRepository.findById(id);
  if (!log) throw Object.assign(new Error('Audit log not found'), { statusCode: 404 });
  return log;
};
