import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';

/* ── asyncHandler ─────────────────────────────────────────────────
   Wraps async route handlers so errors bubble up to the global
   error handler instead of causing unhandled promise rejections.
*/
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/* ── Global Error Handler ─────────────────────────────────────── */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, message: 'Duplicate entry — record already exists' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Record not found' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({ success: false, message: 'Related record not found' });
      return;
    }
  }

  // Multer errors (file upload)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ success: false, message: 'File too large — maximum size is 20 MB' });
      return;
    }
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  // Validation errors (express-validator style objects passed via next(err))
  if (err instanceof Error && err.message === 'Validation failed') {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  console.error('[ErrorHandler]', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
};
