import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// GET /api/requests  (staff — list all)
export const getRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, studentId } = req.query;
    const requests = await prisma.request.findMany({
      where: {
        ...(status ? { status: status as string } : {}),
        ...(studentId ? { studentId: parseInt(studentId as string) } : {}),
      },
      include: {
        student: {
          select: {
            id: true, studentId: true,
            firstNameEn: true, lastNameEn: true, titleEn: true,
            email: true, program: true, faculty: true,
          },
        },
        requestType: { select: { id: true, name: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: requests });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/requests/:id
export const getRequestById = async (req: Request, res: Response): Promise<void> => {
  try {
    const request = await prisma.request.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        student: true,
        requestType: {
          include: {
            documentTemplates: {
              select: { id: true, name: true, description: true, variables: true, body: true },
            },
          },
        },
      },
    });
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }
    res.json({ success: true, data: request });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/requests  (student submits)
export const createRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, requestTypeId, title, description, formData } = req.body;

    if (!studentId || !title) {
      res.status(400).json({ success: false, message: 'studentId and title are required' });
      return;
    }

    const request = await prisma.request.create({
      data: {
        studentId: parseInt(studentId),
        requestTypeId: requestTypeId ? parseInt(requestTypeId) : null,
        title,
        description,
        formData: formData ? JSON.stringify(formData) : null,
        status: 'PENDING',
      },
      include: {
        requestType: { select: { id: true, name: true, icon: true } },
      },
    });
    res.status(201).json({ success: true, data: request });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /api/requests/:id/status  (staff updates status)
export const updateRequestStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, comment } = req.body;
    const request = await prisma.request.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status,
        staffComment: comment,
        staffAt: new Date(),
      },
    });
    res.json({ success: true, data: request });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
