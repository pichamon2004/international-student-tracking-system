import { Response } from 'express';
import PDFDocument from 'pdfkit';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

export const getTemplates = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const templates = await prisma.documentTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: templates });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const template = await prisma.documentTemplate.create({ data: req.body });
    res.status(201).json({ success: true, data: template });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const template = await prisma.documentTemplate.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json({ success: true, data: template });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.documentTemplate.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const generatePDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { templateId, studentId } = req.params;
    const [template, student] = await Promise.all([
      prisma.documentTemplate.findUnique({ where: { id: parseInt(templateId) } }),
      prisma.student.findUnique({
        where: { id: parseInt(studentId) },
        include: { passport: true, visas: { where: { status: 'ACTIVE' }, take: 1 } },
      }),
    ]);

    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    // Replace template variables with student data
    let content = template.content;
    const vars: Record<string, string> = {
      '{{studentId}}': student.studentId,
      '{{firstNameEn}}': student.firstNameEn,
      '{{lastNameEn}}': student.lastNameEn,
      '{{firstNameTh}}': student.firstNameTh || '',
      '{{lastNameTh}}': student.lastNameTh || '',
      '{{nationality}}': student.nationality,
      '{{dateOfBirth}}': student.dateOfBirth.toLocaleDateString('th-TH'),
      '{{passportNumber}}': student.passport?.passportNumber || '',
      '{{passportExpiry}}': student.passport?.expiryDate.toLocaleDateString('th-TH') || '',
      '{{visaType}}': student.visas[0]?.visaType || '',
      '{{visaExpiry}}': student.visas[0]?.expiryDate.toLocaleDateString('th-TH') || '',
      '{{program}}': student.program || '',
      '{{faculty}}': student.faculty || '',
      '{{date}}': new Date().toLocaleDateString('th-TH'),
    };
    for (const [key, value] of Object.entries(vars)) {
      content = content.replaceAll(key, value);
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${template.name}-${student.studentId}.pdf"`);
    doc.pipe(res);
    doc.fontSize(12).text(content, { align: 'left' });
    doc.end();
  } catch {
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};
