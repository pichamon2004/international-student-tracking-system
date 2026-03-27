import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { uploadToR2 } from '../services/r2.service';

/* GET /api/students/:id/academic-documents */
export const getAcademicDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const docs = await prisma.academicDocument.findMany({
      where: { studentId },
      orderBy: { issueDate: 'desc' },
    });
    res.json({ success: true, data: docs });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* POST /api/students/:id/academic-documents */
export const createAcademicDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const { docType, institution, issueDate, fileUrl } = req.body;

    if (!docType || !institution || !issueDate) {
      res.status(400).json({ success: false, message: 'docType, institution, and issueDate are required' });
      return;
    }

    const doc = await prisma.academicDocument.create({
      data: { studentId, docType, institution, issueDate: new Date(issueDate), fileUrl },
    });
    res.status(201).json({ success: true, data: doc });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* PUT /api/students/:id/academic-documents/:docId */
export const updateAcademicDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const docId = parseInt(req.params.docId);
    const { docType, institution, issueDate, fileUrl } = req.body;

    const existing = await prisma.academicDocument.findFirst({ where: { id: docId, studentId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Academic document not found' });
      return;
    }

    const doc = await prisma.academicDocument.update({
      where: { id: docId },
      data: {
        ...(docType !== undefined && { docType }),
        ...(institution !== undefined && { institution }),
        ...(issueDate !== undefined && { issueDate: new Date(issueDate) }),
        ...(fileUrl !== undefined && { fileUrl }),
      },
    });
    res.json({ success: true, data: doc });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* POST /api/students/:id/academic-documents/image — upload document image, return R2 URL */
export const uploadAcademicDocumentImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file provided' });
      return;
    }
    const { url } = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'academic-docs');
    res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('[uploadAcademicDocumentImage] error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload file' });
  }
};

/* DELETE /api/students/:id/academic-documents/:docId */
export const deleteAcademicDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const docId = parseInt(req.params.docId);

    const existing = await prisma.academicDocument.findFirst({ where: { id: docId, studentId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Academic document not found' });
      return;
    }

    await prisma.academicDocument.delete({ where: { id: docId } });
    res.json({ success: true, message: 'Deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
