import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

interface AuditOptions {
  entity: string;
  getEntityId?: (req: AuthRequest) => number | undefined;
  fetchBefore?: (req: AuthRequest) => Promise<unknown>;
}

export const auditLog = (opts: AuditOptions) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Capture before state for mutations that modify / remove existing data
    let beforeData: unknown = null;
    if (opts.fetchBefore && ['PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())) {
      try { beforeData = await opts.fetchBefore(req); } catch { /* ignore */ }
    }

    // Intercept response body
    const originalJson = res.json.bind(res);
    let responseBody: any;
    res.json = (body: any) => { responseBody = body; return originalJson(body); };

    res.on('finish', async () => {
      try {
        if (!req.user) return;
        if (res.statusCode >= 400) return; // skip failed requests

        const entityId = opts.getEntityId
          ? opts.getEntityId(req)
          : parseInt(req.params.id || req.params.depId || '0') || undefined;

        const method = req.method.toUpperCase();
        const action =
          method === 'POST'                        ? 'CREATE' :
          method === 'PUT' || method === 'PATCH'   ? 'UPDATE' :
          method === 'DELETE'                      ? 'DELETE' : method;

        // Strip the {success, data} API wrapper — store only the entity data
        const afterData = responseBody?.data ?? responseBody;

        await prisma.auditLog.create({
          data: {
            userId:    req.user.userId,
            action,
            entity:    opts.entity,
            entityId:  entityId ?? null,
            before:    beforeData ? JSON.stringify(beforeData) : null,
            after:     afterData  ? JSON.stringify(afterData)  : null,
            ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
          },
        });
      } catch {
        // Never let audit logging crash the app
      }
    });

    next();
  };
