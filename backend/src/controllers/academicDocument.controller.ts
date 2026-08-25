import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { uploadToR2 } from '../services/external/r2.service';
import * as academicDocumentService from '../services/domain/academicDocument.service';
import * as changeRequestService from '../services/domain/changeRequest.service';
import prisma from '../utils/prisma';

/* GET /api/students/:id/academic-documents */
export const getAcademicDocuments = async (req: Request, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const docs = await academicDocumentService.getAcademicDocuments(studentId);
  res.json({ success: true, data: docs });
};

/* POST /api/students/:id/academic-documents */
export const createAcademicDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  if (req.user?.activeRole === 'STUDENT') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentId } });
    if (currentStudent?.registrationStatus === 'ACTIVE' && currentStudent.registrationStep === 2) {
      const cr = await changeRequestService.submitChange(studentId, 'ACADEMIC_DOCUMENT', null, 'CREATE', req.body);
      res.status(202).json({ success: true, changeRequest: cr });
      return;
    }
  }
  const { docType, institution, issueDate, fileUrl } = req.body;
  const doc = await academicDocumentService.createAcademicDocument(studentId, docType, institution, issueDate, fileUrl);
  res.status(201).json({ success: true, data: doc });
};

/* PUT /api/students/:id/academic-documents/:docId */
export const updateAcademicDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const docId = parseInt(req.params.docId);
  if (req.user?.activeRole === 'STUDENT') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentId } });
    if (currentStudent?.registrationStatus === 'ACTIVE' && currentStudent.registrationStep === 2) {
      const cr = await changeRequestService.submitChange(studentId, 'ACADEMIC_DOCUMENT', docId, 'UPDATE', req.body);
      res.status(202).json({ success: true, changeRequest: cr });
      return;
    }
  }
  const { docType, institution, issueDate, fileUrl } = req.body;
  const doc = await academicDocumentService.updateAcademicDocument(docId, studentId, {
    docType,
    institution,
    issueDate: issueDate ? new Date(issueDate) : undefined,
    fileUrl,
  });
  res.json({ success: true, data: doc });
};

/* POST /api/students/:id/academic-documents/image — upload document image, return R2 URL */
export const uploadAcademicDocumentImage = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file provided' });
    return;
  }
  const { url } = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'academic-docs');
  res.json({ success: true, data: { url } });
};

/* DELETE /api/students/:id/academic-documents/:docId */
export const deleteAcademicDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const docId = parseInt(req.params.docId);
  if (req.user?.activeRole === 'STUDENT') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentId } });
    if (currentStudent?.registrationStatus === 'ACTIVE' && currentStudent.registrationStep === 2) {
      const cr = await changeRequestService.submitChange(studentId, 'ACADEMIC_DOCUMENT', docId, 'DELETE', {});
      res.status(202).json({ success: true, changeRequest: cr });
      return;
    }
  }
  await academicDocumentService.deleteAcademicDocument(docId, studentId);
  res.json({ success: true, message: 'Deleted' });
};
