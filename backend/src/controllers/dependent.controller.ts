import { Response } from 'express';
import { AuthRequest } from '../types';
import * as dependentService from '../services/domain/dependent.service';
import * as changeRequestService from '../services/domain/changeRequest.service';
import type { FilePurpose } from '@prisma/client';
import * as fileService from '../services/domain/file.service';
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
      const cr = await changeRequestService.submitChange(studentId, 'DEPENDENT', null, 'CREATE', req.body, req.user);
      res.status(202).json({ success: true, changeRequest: cr });
      return;
    }
  }
  const dep = await dependentService.createDependent(studentId, req.body, req.user!);
  res.status(201).json({ success: true, data: dep });
};

// PUT /api/students/:id/dependents/:depId
export const updateDependent = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const depId = parseInt(req.params.depId);
  if (req.user?.activeRole === 'STUDENT') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentId } });
    if (currentStudent?.registrationStatus === 'ACTIVE' && currentStudent.registrationStep === 2) {
      const cr = await changeRequestService.submitChange(studentId, 'DEPENDENT', depId, 'UPDATE', req.body, req.user);
      res.status(202).json({ success: true, changeRequest: cr });
      return;
    }
  }
  const updated = await dependentService.updateDependent(depId, studentId, req.body, req.user!);
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

// The dependent form uploads all four images through one endpoint; `slot` is
// the field the file is for, which fixes the file's purpose.
const DEPENDENT_SLOT_PURPOSE: Record<string, FilePurpose> = {
  passportImageUrl: 'DEPENDENT_PASSPORT_IMAGE',
  visaImageUrl:     'DEPENDENT_VISA_IMAGE',
  arrivalImageUrl:  'DEPENDENT_ARRIVAL_STAMP',
  departedImageUrl: 'DEPENDENT_DEPARTURE_STAMP',
};

// POST /api/students/:id/dependents/image  (multipart: image + slot)
export const uploadDependentImage = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file provided' });
    return;
  }
  const purpose = typeof req.body.slot === 'string' ? DEPENDENT_SLOT_PURPOSE[req.body.slot] : undefined;
  if (!purpose) {
    res.status(400).json({ success: false, message: `slot must be one of: ${Object.keys(DEPENDENT_SLOT_PURPOSE).join(', ')}` });
    return;
  }
  const { url, file } = await fileService.store(req.file.buffer, {
    originalName: req.file.originalname, purpose,
    uploadedById: req.user!.userId, ownerStudentId: parseInt(req.params.id),
  });
  res.json({ success: true, data: { url, fileId: file.id } });
};

// GET /api/students/:id/dependents/:depId/documents
export const getDependentDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  const docs = await dependentService.getDependentDocuments(parseInt(req.params.depId), parseInt(req.params.id));
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
  await dependentService.deleteDependentDocument(parseInt(req.params.docId), parseInt(req.params.depId), parseInt(req.params.id));
  res.json({ success: true, message: 'Document deleted' });
};
