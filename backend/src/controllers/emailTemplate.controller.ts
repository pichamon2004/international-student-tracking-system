import { Request, Response } from 'express';
import sanitizeHtml from 'sanitize-html';
import prisma from '../utils/prisma';
import { sendTemplateEmail } from '../services/email.service';

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'u', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['style', 'class'],
    img: ['src', 'alt', 'width', 'height'],
  },
  // Preserve {{variable}} placeholders
  textFilter: (text) => text,
};

// GET /api/email-templates
export const getEmailTemplates = async (_req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: templates });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/email-templates/:id
export const getEmailTemplateById = async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    res.json({ success: true, data: template });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/email-templates
export const createEmailTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, subject, body, variables } = req.body;
    if (!name || !subject || !body) {
      res.status(400).json({ success: false, message: 'name, subject, and body are required' });
      return;
    }

    const cleanBody = sanitizeHtml(body, sanitizeOptions);

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        body: cleanBody,
        variables: variables ? JSON.stringify(variables) : null,
      },
    });
    res.status(201).json({ success: true, data: template });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /api/email-templates/:id
export const updateEmailTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { name, subject, body, variables, isActive } = req.body;

    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }

    const cleanBody = body ? sanitizeHtml(body, sanitizeOptions) : undefined;

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(subject !== undefined && { subject }),
        ...(cleanBody !== undefined && { body: cleanBody }),
        ...(variables !== undefined && { variables: JSON.stringify(variables) }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json({ success: true, data: template });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/email-templates/:id
export const deleteEmailTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    await prisma.emailTemplate.delete({ where: { id } });
    res.json({ success: true, message: 'Template deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/email-templates/:id/test  — ส่ง test email ไปยัง email ที่ระบุ
export const testEmailTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { to, variables } = req.body;

    if (!to) {
      res.status(400).json({ success: false, message: 'to (email address) is required' });
      return;
    }

    await sendTemplateEmail(to, id, variables || {});
    res.json({ success: true, message: `Test email sent to ${to}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
