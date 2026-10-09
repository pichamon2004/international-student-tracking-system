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
      // P2003 means the opposite of what it sounds like: the record IS found,
      // but it's still referenced by other rows (e.g. a template with
      // existing generated documents), so the DB refuses the delete/update.
      res.status(409).json({ success: false, message: 'Cannot delete — this record is still referenced by other data' });
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

  // Custom service errors thrown as Object.assign(new Error(...), { statusCode })
  if (err instanceof Error && typeof (err as unknown as { statusCode?: unknown }).statusCode === 'number') {
    res.status((err as unknown as { statusCode: number }).statusCode).json({ success: false, message: err.message });
    return;
  }

  console.error('[ErrorHandler]', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
};
