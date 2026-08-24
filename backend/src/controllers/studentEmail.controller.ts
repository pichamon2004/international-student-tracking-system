import { Response } from 'express';
import { AuthRequest } from '../types';
import * as studentEmailService from '../services/domain/studentEmail.service';

export const sendEmailToStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const { templateId, extraVariables } = req.body;

  if (!templateId) {
    res.status(400).json({ success: false, message: 'templateId is required' });
    return;
  }

  const result = await studentEmailService.sendEmailToStudent(
    studentId,
    parseInt(templateId),
    extraVariables,
  );

  res.json({ success: true, message: `Email sent to ${result.recipient}`, data: result });
};

export const sendCustomEmailToStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const { subject, html } = req.body;

  if (!subject || !html) {
    res.status(400).json({ success: false, message: 'subject and html are required' });
    return;
  }

  const result = await studentEmailService.sendCustomEmailToStudent(studentId, subject, html);
  res.json({ success: true, message: `Email sent to ${result.recipient}` });
};

export const getStudentEmailVariables = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);
  const data = await studentEmailService.getStudentEmailVariables(studentId);
  res.json({ success: true, data });
};
