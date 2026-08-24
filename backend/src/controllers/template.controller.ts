import { Request, Response } from 'express';
import * as documentTemplateService from '../services/domain/documentTemplate.service';

// GET /api/templates
export const getTemplates = async (_req: Request, res: Response): Promise<void> => {
  const templates = await documentTemplateService.getTemplates();
  res.json({ success: true, data: templates });
};

// POST /api/templates
export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  const template = await documentTemplateService.createTemplate(req.body);
  res.status(201).json({ success: true, data: template });
};

// PUT /api/templates/:id
export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
  const template = await documentTemplateService.updateTemplate(parseInt(req.params.id), req.body);
  res.json({ success: true, data: template });
};

// DELETE /api/templates/:id
export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  await documentTemplateService.deleteTemplate(parseInt(req.params.id));
  res.json({ success: true, message: 'Template deleted' });
};
