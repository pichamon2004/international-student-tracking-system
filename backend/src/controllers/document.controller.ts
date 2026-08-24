import { Response } from 'express';
import { AuthRequest } from '../types';
import * as documentService from '../services/domain/document.service';

export const getDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  const documents = await documentService.getDocuments(parseInt(req.params.id));
  res.json({ success: true, data: documents });
};

export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file provided' });
    return;
  }
  const document = await documentService.uploadDocument(
    parseInt(req.params.id),
    req.file,
    req.body.name,
    req.body.description,
    req.user!.userId
  );
  res.status(201).json({ success: true, data: document });
};

export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  await documentService.deleteDocument(parseInt(req.params.docId));
  res.json({ success: true, message: 'Document deleted successfully' });
};
