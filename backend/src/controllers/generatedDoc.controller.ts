import { Response } from 'express';
import PDFDocument from 'pdfkit';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { renderTemplate } from '../utils/templateRenderer';
import { upload } from '../middleware/upload.middleware';
import { uploadToR2, deleteFromR2, keyFromUrl } from '../services/r2.service';

// POST /api/requests/:id/generate-pdf
export const generatePdf = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requestId = parseInt(req.params.id);
    const { templateId, formData } = req.body;

    if (!templateId || !formData) {
      res.status(400).json({ success: false, message: 'templateId and formData are required' });
      return;
    }

    const [request, template] = await Promise.all([
      prisma.request.findUnique({ where: { id: requestId }, include: { student: true } }),
      prisma.documentTemplate.findUnique({ where: { id: parseInt(templateId) } }),
    ]);

    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }
    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }

    const { rendered, missing } = renderTemplate(template.body, formData as Record<string, string>);
    if (missing.length > 0) {
      res.status(400).json({ success: false, message: `Missing variables: ${missing.join(', ')}` });
      return;
    }

    // Generate PDF into a Buffer (no disk I/O)
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc    = new PDFDocument({ margin: 60, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data',  (chunk) => chunks.push(chunk));
      doc.on('end',   () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fontSize(11).font('Helvetica').text(rendered, { lineGap: 4 });
      doc.end();
    });

    const filename = `${Date.now()}-req${requestId}.pdf`;
    const { url } = await uploadToR2(pdfBuffer, filename, 'application/pdf', 'generated');

    const genDoc = await prisma.generatedDocument.create({
      data: {
        templateId:  parseInt(templateId),
        studentId:   request.studentId,
        generatedBy: req.user!.userId,
        fileUrl:     url,
      },
    });

    res.status(201).json({ success: true, data: genDoc });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/requests/:id/generated-documents
export const getGeneratedDocs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requestId = parseInt(req.params.id);
    const request = await prisma.request.findUnique({ where: { id: requestId } });
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }

    const docs = await prisma.generatedDocument.findMany({
      where:   { studentId: request.studentId },
      include: { template: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: docs });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/generated-documents/:docId
export const getGeneratedDocById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doc = await prisma.generatedDocument.findUnique({
      where:   { id: parseInt(req.params.docId) },
      include: { template: { select: { id: true, name: true } } },
    });
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }
    res.json({ success: true, data: doc });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/generated-documents/:docId/download — redirect to R2 public URL
export const downloadGeneratedDoc = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doc = await prisma.generatedDocument.findUnique({
      where: { id: parseInt(req.params.docId) },
    });
    if (!doc?.fileUrl) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }
    res.redirect(doc.fileUrl);
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/generated-documents/:docId/upload-signed
export const uploadSignedDoc = [
  upload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file provided' });
        return;
      }

      const doc = await prisma.generatedDocument.findUnique({
        where: { id: parseInt(req.params.docId) },
      });
      if (!doc) {
        res.status(404).json({ success: false, message: 'Document not found' });
        return;
      }

      // Delete old signed file if exists
      if (doc.signedFileUrl) {
        await deleteFromR2(keyFromUrl(doc.signedFileUrl)).catch(() => {});
      }

      const { url } = await uploadToR2(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'signed'
      );

      const updated = await prisma.generatedDocument.update({
        where: { id: doc.id },
        data:  { signedFileUrl: url, signedBy: String(req.user!.userId), signedAt: new Date() },
      });

      res.json({ success: true, data: updated });
    } catch {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
];
