import { Request, Response } from 'express';
import * as emailTemplateService from '../services/domain/emailTemplate.service';

// GET /api/email-templates
export const getEmailTemplates = async (_req: Request, res: Response): Promise<void> => {
  const templates = await emailTemplateService.getEmailTemplates();
  res.json({ success: true, data: templates });
};

// GET /api/email-templates/:id
export const getEmailTemplateById = async (req: Request, res: Response): Promise<void> => {
  const template = await emailTemplateService.getEmailTemplateById(parseInt(req.params.id));
  res.json({ success: true, data: template });
};

// POST /api/email-templates
export const createEmailTemplate = async (req: Request, res: Response): Promise<void> => {
  const template = await emailTemplateService.createEmailTemplate(req.body);
  res.status(201).json({ success: true, data: template });
};

// PUT /api/email-templates/:id
export const updateEmailTemplate = async (req: Request, res: Response): Promise<void> => {
  const template = await emailTemplateService.updateEmailTemplate(parseInt(req.params.id), req.body);
  res.json({ success: true, data: template });
};

// DELETE /api/email-templates/:id
export const deleteEmailTemplate = async (req: Request, res: Response): Promise<void> => {
  await emailTemplateService.deleteEmailTemplate(parseInt(req.params.id));
  res.json({ success: true, message: 'Template deleted' });
};

// POST /api/email-templates/:id/test
export const testEmailTemplate = async (req: Request, res: Response): Promise<void> => {
  const { to, variables } = req.body;
  if (!to) {
    res.status(400).json({ success: false, message: 'to (email address) is required' });
    return;
  }
  await emailTemplateService.testEmailTemplate(parseInt(req.params.id), to, variables);
  res.json({ success: true, message: `Test email sent to ${to}` });
};
