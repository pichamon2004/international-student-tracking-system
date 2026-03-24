import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// GET /api/request-types
export const getRequestTypes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const types = await prisma.requestType.findMany({
      orderBy: { id: 'asc' },
      include: {
        documentTemplates: {
          select: { id: true, name: true, description: true, isActive: true, variables: true, body: true },
        },
      },
    });
    res.json({ success: true, data: types });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/request-types
export const createRequestType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, icon, isActive, documentTemplateIds } = req.body;
    const type = await prisma.requestType.create({
      data: {
        name,
        description,
        icon,
        isActive: isActive ?? true,
        documentTemplates: documentTemplateIds?.length
          ? { connect: (documentTemplateIds as number[]).map((id) => ({ id })) }
          : undefined,
      },
      include: {
        documentTemplates: {
          select: { id: true, name: true, description: true, isActive: true, variables: true, body: true },
        },
      },
    });
    res.status(201).json({ success: true, data: type });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /api/request-types/:id
export const updateRequestType = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, icon, isActive, documentTemplateIds } = req.body;

    // Update basic fields + replace template connections
    const type = await prisma.requestType.update({
      where: { id },
      data: {
        name,
        description,
        icon,
        isActive,
        documentTemplates: documentTemplateIds !== undefined
          ? { set: (documentTemplateIds as number[]).map((tid) => ({ id: tid })) }
          : undefined,
      },
      include: {
        documentTemplates: {
          select: { id: true, name: true, description: true, isActive: true, variables: true, body: true },
        },
      },
    });
    res.json({ success: true, data: type });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, message: 'Request type not found' });
      return;
    }
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/request-types/:id
export const deleteRequestType = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.requestType.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Request type deleted' });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, message: 'Request type not found' });
      return;
    }
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
