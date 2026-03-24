import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// GET /api/templates
export const getTemplates = async (_req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.documentTemplate.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: templates });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/templates
export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, body, variables, isActive } = req.body;
    const template = await prisma.documentTemplate.create({
      data: {
        name,
        description,
        body,
        variables: variables ? JSON.stringify(variables) : null,
        isActive: isActive ?? true,
      },
    });
    res.status(201).json({ success: true, data: template });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /api/templates/:id
export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, body, variables, isActive } = req.body;
    const template = await prisma.documentTemplate.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name,
        description,
        body,
        variables: variables !== undefined ? JSON.stringify(variables) : undefined,
        isActive,
      },
    });
    res.json({ success: true, data: template });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/templates/:id
export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.documentTemplate.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Template deleted' });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
