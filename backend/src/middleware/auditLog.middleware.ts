import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

interface AuditOptions {
  entity: string;
  getEntityId?: (req: AuthRequest) => number | undefined;
}

/**
 * Factory that returns a middleware recording every mutating request to AuditLog.
 * Usage: router.post('/', authenticate, auditLog({ entity: 'Student' }), handler)
 */
export const auditLog = (opts: AuditOptions) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Intercept response to capture status and body
    const originalJson = res.json.bind(res);
    let responseBody: unknown;

    res.json = (body: unknown) => {
      responseBody = body;
      return originalJson(body);
    };

    res.on('finish', async () => {
      try {
        if (!req.user) return;

        const entityId = opts.getEntityId ? opts.getEntityId(req) : parseInt(req.params.id || req.params.depId || '0') || undefined;
        const method = req.method.toUpperCase();
        const action = method === 'POST' ? 'CREATE' : method === 'PUT' || method === 'PATCH' ? 'UPDATE' : method === 'DELETE' ? 'DELETE' : method;

        await prisma.auditLog.create({
          data: {
            userId: req.user.userId,
            action,
            entity: opts.entity,
            entityId: entityId ?? null,
            after: responseBody ? JSON.stringify(responseBody) : null,
            ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
          },
        });
      } catch {
        // Never let audit logging crash the app
      }
    });

    next();
  };
