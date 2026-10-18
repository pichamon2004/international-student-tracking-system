import * as auditLogRepository from '../../repositories/auditLog.repository';
import prisma from '../../utils/prisma';
import * as fileService from './file.service';
import { keyFromUrl } from '../external/r2.service';

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

/**
 * A fresh signed URL for a file a snapshot mentions. Snapshots keep the URL that
 * was current when they were written (public, or signed and long expired); the
 * key inside it still names the object. Only URLs that really occur in this
 * log's snapshots are honoured, so this can't be used to open arbitrary files.
 */
export const getSnapshotFileUrl = async (id: number, url: string) => {
  const notFound = () => Object.assign(new Error('File not found'), { statusCode: 404 });
  const log = await auditLogRepository.findById(id);
  if (!log || !url || !`${log.before ?? ''}\n${log.after ?? ''}`.includes(url)) throw notFound();
  const key = keyFromUrl(url);
  if (!key) throw notFound();
  // Retired (soft-deleted) files are still history — auditors may open them
  const file = await prisma.file.findUnique({ where: { storageKey: key }, select: { id: true, storageKey: true, mimeType: true } });
  if (!file) throw notFound();
  return { url: await fileService.urlFor(file), mimeType: file.mimeType };
};
