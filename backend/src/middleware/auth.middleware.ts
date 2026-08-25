import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, AuthPayload } from '../types';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.activeRole)) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    next();
  };

export const requirePermission = (...permCodes: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    const perms = req.user?.permissions ?? [];
    const hasAll = permCodes.every(code => perms.includes(code));
    if (!hasAll) {
      res.status(403).json({ success: false, message: 'Forbidden: insufficient permission' });
      return;
    }
    next();
  };

/** Passes if the user has at least one of the given permissions (OR, not AND). */
export const requireAnyPermission = (...permCodes: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    const perms = req.user?.permissions ?? [];
    const hasAny = permCodes.some(code => perms.includes(code));
    if (!hasAny) {
      res.status(403).json({ success: false, message: 'Forbidden: insufficient permission' });
      return;
    }
    next();
  };

/** @deprecated use requireRole('STAFF') */
export const requireAdmin = requireRole('STAFF');
