import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

export const getDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const documents = await prisma.document.findMany({
      where: { studentId: parseInt(req.params.id) },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json({ success: true, data: documents });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file provided' });
      return;
    }
    const document = await prisma.document.create({
      data: {
        studentId: parseInt(req.params.id),
        name: req.body.name || req.file.originalname,
        description: req.body.description,
        fileUrl: `/uploads/${req.file.filename}`,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      },
    });
    res.status(201).json({ success: true, data: document });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: parseInt(req.params.docId) },
    });
    if (!document) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }
    const filePath = path.join(__dirname, '../../', document.fileUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.document.delete({ where: { id: document.id } });
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
