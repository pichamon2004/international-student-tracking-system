import { Response } from 'express';
import { AuthRequest } from '../types';
import { upload } from '../middleware/upload.middleware';
import * as generatedDocService from '../services/domain/generatedDoc.service';

// POST /api/requests/:id/generate-pdf
export const generatePdf = async (req: AuthRequest, res: Response): Promise<void> => {
  const { templateId, formData } = req.body;

  if (!templateId || !formData) {
    res.status(400).json({ success: false, message: 'templateId and formData are required' });
    return;
  }

  const genDoc = await generatedDocService.generatePdf(
    parseInt(req.params.id),
    parseInt(templateId),
    formData as Record<string, string>,
    req.user!.userId
  );

  res.status(201).json({ success: true, data: genDoc });
};

// GET /api/requests/:id/generated-documents
export const getGeneratedDocs = async (req: AuthRequest, res: Response): Promise<void> => {
  const docs = await generatedDocService.getGeneratedDocs(parseInt(req.params.id));
  res.json({ success: true, data: docs });
};

// GET /api/generated-documents/:docId
export const getGeneratedDocById = async (req: AuthRequest, res: Response): Promise<void> => {
  const doc = await generatedDocService.getGeneratedDocById(parseInt(req.params.docId));
  res.json({ success: true, data: doc });
};

// GET /api/generated-documents/:docId/download
export const downloadGeneratedDoc = async (req: AuthRequest, res: Response): Promise<void> => {
  const doc = await generatedDocService.getGeneratedDocForDownload(parseInt(req.params.docId));
  res.redirect(doc.fileUrl);
};

// POST /api/generated-documents/:docId/upload-signed
export const uploadSignedDocHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file provided' });
    return;
  }
  const updated = await generatedDocService.uploadSignedDoc(
    parseInt(req.params.docId),
    req.file,
    req.user!.userId
  );
  res.json({ success: true, data: updated });
};

export const uploadSignedDoc = [upload.single('file'), uploadSignedDocHandler];

// GET /api/generated-documents/:docId/signatures
export const getSignaturesHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const sigs = await generatedDocService.getSignatures(parseInt(req.params.docId));
  res.json({ success: true, data: sigs });
};

// POST /api/generated-documents/:docId/signatures
export const addSignatureHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, imageDataUrl } = req.body;
  if (!role || !imageDataUrl) {
    res.status(400).json({ success: false, message: 'role and imageDataUrl are required' });
    return;
  }
  const result = await generatedDocService.addDigitalSignature(
    parseInt(req.params.docId),
    role,
    imageDataUrl,
    req.user!.userId
  );
  res.status(201).json({ success: true, data: result });
};

// POST /api/generated-documents/:docId/finalize
export const finalizeHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const updated = await generatedDocService.embedAndFinalize(parseInt(req.params.docId));
  res.json({ success: true, data: updated });
};
