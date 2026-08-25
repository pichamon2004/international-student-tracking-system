import { Response } from 'express';
import { AuthRequest } from '../types';
import * as dependentService from '../services/domain/dependent.service';
import * as changeRequestService from '../services/domain/changeRequest.service';
import { uploadToR2 } from '../services/external/r2.service';
import prisma from '../utils/prisma';

// GET /api/students/:id/dependents
export const getDependents = async (req: AuthRequest, res: Response): Promise<void> => {
  const dependents = await dependentService.getDependents(parseInt(req.params.id));
  res.json({ success: true, data: dependents });
};

// GET /api/students/:id/dependents/:depId
export const getDependentById = async (req: AuthRequest, res: Response): Promise<void> => {
  const dep = await dependentService.getDependentById(
    parseInt(req.params.depId),
    parseInt(req.params.id)
  );
  res.json({ success: true, data: dep });
};

// POST /api/students/:id/dependents
export const createDependent = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  if (req.user?.activeRole === 'STUDENT') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentId } });
    if (currentStudent?.registrationStatus === 'ACTIVE' && currentStudent.registrationStep === 2) {
      const cr = await changeRequestService.submitChange(studentId, 'DEPENDENT', null, 'CREATE', req.body);
      res.status(202).json({ success: true, changeRequest: cr });
      return;
    }
  }
  const dep = await dependentService.createDependent(studentId, req.body);
  res.status(201).json({ success: true, data: dep });
};

// PUT /api/students/:id/dependents/:depId
export const updateDependent = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const depId = parseInt(req.params.depId);
  if (req.user?.activeRole === 'STUDENT') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentId } });
    if (currentStudent?.registrationStatus === 'ACTIVE' && currentStudent.registrationStep === 2) {
      const cr = await changeRequestService.submitChange(studentId, 'DEPENDENT', depId, 'UPDATE', req.body);
      res.status(202).json({ success: true, changeRequest: cr });
      return;
    }
  }
  const updated = await dependentService.updateDependent(depId, studentId, req.body);
  res.json({ success: true, data: updated });
};

// DELETE /api/students/:id/dependents/:depId
export const deleteDependent = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const depId = parseInt(req.params.depId);
  if (req.user?.activeRole === 'STUDENT') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentId } });
    if (currentStudent?.registrationStatus === 'ACTIVE' && currentStudent.registrationStep === 2) {
      const cr = await changeRequestService.submitChange(studentId, 'DEPENDENT', depId, 'DELETE', {});
      res.status(202).json({ success: true, changeRequest: cr });
      return;
    }
  }
  await dependentService.deleteDependent(depId, studentId);
  res.json({ success: true, message: 'Dependent deleted' });
};

// POST /api/students/:id/dependents/image?type=passport|visa
export const uploadDependentImage = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file provided' });
    return;
  }
  const { url } = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'dependents');
  res.json({ success: true, data: { url } });
};

// GET /api/students/:id/dependents/:depId/documents
export const getDependentDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  const docs = await dependentService.getDependentDocuments(parseInt(req.params.depId));
  res.json({ success: true, data: docs });
};

// POST /api/students/:id/dependents/:depId/documents
export const uploadDependentDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file provided' });
    return;
  }
  const doc = await dependentService.uploadDependentDocument(
    parseInt(req.params.depId),
    parseInt(req.params.id),
    req.file,
    req.body.name,
    req.body.description,
    req.user!.userId
  );
  res.status(201).json({ success: true, data: doc });
};

// DELETE /api/students/:id/dependents/:depId/documents/:docId
export const deleteDependentDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  await dependentService.deleteDependentDocument(parseInt(req.params.docId));
  res.json({ success: true, message: 'Document deleted' });
};
