import { Response } from 'express';
import { AuthRequest } from '../types';
import * as fileService from '../services/domain/file.service';
import { assertCanAccessFile } from '../services/domain/fileAccess';

// GET /api/files/:id/url — a fresh signed URL, e.g. when the one embedded in a page has expired
export const getFileUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  const file = await assertCanAccessFile(parseInt(req.params.id), req.user!);
  res.json({ success: true, data: { url: await fileService.urlFor(file), mimeType: file.mimeType } });
};

// GET /api/files/:id/download — the bytes through the API, so the browser needs no CORS access to storage
export const downloadFile = async (req: AuthRequest, res: Response): Promise<void> => {
  const file = await assertCanAccessFile(parseInt(req.params.id), req.user!);
  const buffer = await fileService.readBuffer(file);
  const ext = file.storageKey.split('.').pop();
  const name = (file.originalName || `file-${file.id}.${ext}`).replace(/["\r\n]/g, '');
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="file-${file.id}.${ext}"; filename*=UTF-8''${encodeURIComponent(name)}`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(buffer);
};
