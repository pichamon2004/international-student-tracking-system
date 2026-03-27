import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { uploadToR2, deleteFromR2, keyFromUrl } from '../services/r2.service';

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

    const { url } = await uploadToR2(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'documents'
    );

    const document = await prisma.document.create({
      data: {
        studentId:   parseInt(req.params.id),
        name:        req.body.name || req.file.originalname,
        description: req.body.description,
        fileUrl:     url,
        fileType:    req.file.mimetype,
        fileSize:    req.file.size,
        uploadedBy:  req.user!.userId,
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

    await deleteFromR2(keyFromUrl(document.fileUrl));
    await prisma.document.delete({ where: { id: document.id } });
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
