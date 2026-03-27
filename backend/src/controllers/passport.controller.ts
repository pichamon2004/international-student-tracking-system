import { Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { uploadToR2 } from '../services/r2.service';

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
    const { passportNumber, issuingCountry, issueDate, expiryDate, placeOfIssue, isCurrent, imageUrl } = req.body;
    const passport = await prisma.passport.upsert({
      where:  { studentId },
      update: {
        passportNumber, issuingCountry,
        issueDate:  issueDate  ? new Date(issueDate)  : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        placeOfIssue, isCurrent, imageUrl,
      },
      create: {
        studentId, passportNumber, issuingCountry,
        issueDate:  new Date(issueDate),
        expiryDate: new Date(expiryDate),
        placeOfIssue, isCurrent, imageUrl,
      },
    });
    res.json({ success: true, data: passport });
  } catch (error) {
    console.error('[upsertPassport] error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/students/:id/passport/image — upload passport photo, return R2 URL
export const uploadPassportImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image file provided' });
      return;
    }
    const { url } = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'passports');
    res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('[uploadPassportImage] error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
};

export const scanPassport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image file provided' });
      return;
    }

    // Send in-memory buffer directly to Python OCR service
    const form = new FormData();
    form.append('image', req.file.buffer, {
      filename:    req.file.originalname,
      contentType: req.file.mimetype,
    });

    const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
    const response = await axios.post(`${pythonUrl}/scan-passport`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });

    // Python service returns { success, data: {...} } — unwrap so frontend gets flat object
    const scanResult = response.data?.data ?? response.data;
    res.json({ success: true, data: scanResult });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to scan passport' });
  }
};
