import { Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

export const getPassport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const passport = await prisma.passport.findUnique({
      where: { studentId: parseInt(req.params.id) },
    });
    if (!passport) {
      res.status(404).json({ success: false, message: 'Passport not found' });
      return;
    }
    res.json({ success: true, data: passport });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const upsertPassport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const passport = await prisma.passport.upsert({
      where: { studentId },
      update: req.body,
      create: { ...req.body, studentId },
    });
    res.json({ success: true, data: passport });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const scanPassport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image file provided' });
      return;
    }
    const form = new FormData();
    form.append('image', fs.createReadStream(req.file.path));
    const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
    const response = await axios.post(`${pythonUrl}/scan-passport`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });
    // Clean up temp file
    fs.unlinkSync(req.file.path);
    res.json({ success: true, data: response.data });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Failed to scan passport' });
  }
};
