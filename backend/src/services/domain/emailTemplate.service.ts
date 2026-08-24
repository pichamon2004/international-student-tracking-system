import sanitizeHtml from 'sanitize-html';
import * as emailTemplateRepository from '../../repositories/emailTemplate.repository';
import { sendEmail, applyTemplateVariables } from '../external/email.service';

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'h1', 'h2', 'h3', 'u', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['style', 'class'],
    img: ['src', 'alt', 'width', 'height'],
  },
  textFilter: (text) => text,
};

export const getEmailTemplates = () =>
  emailTemplateRepository.findAll();

export const getEmailTemplateById = async (id: number) => {
  const template = await emailTemplateRepository.findById(id);
  if (!template) {
    throw Object.assign(new Error('Template not found'), { statusCode: 404 });
  }
  return template;
};

export const createEmailTemplate = (dto: {
  name: string;
  subject: string;
  body: string;
  variables?: unknown;
}) => {
  if (!dto.name || !dto.subject || !dto.body) {
    throw Object.assign(new Error('name, subject, and body are required'), { statusCode: 400 });
  }
  const cleanBody = sanitizeHtml(dto.body, sanitizeOptions);
  return emailTemplateRepository.create({
    name: dto.name,
    subject: dto.subject,
    body: cleanBody,
    variables: dto.variables ? JSON.stringify(dto.variables) : null,
  });
};

export const updateEmailTemplate = async (id: number, dto: {
  name?: string;
  subject?: string;
  body?: string;
  variables?: unknown;
  isActive?: boolean;
}) => {
  const existing = await emailTemplateRepository.findById(id);
  if (!existing) {
    throw Object.assign(new Error('Template not found'), { statusCode: 404 });
  }
  const cleanBody = dto.body ? sanitizeHtml(dto.body, sanitizeOptions) : undefined;
  return emailTemplateRepository.updateById(id, {
    ...(dto.name !== undefined && { name: dto.name }),
    ...(dto.subject !== undefined && { subject: dto.subject }),
    ...(cleanBody !== undefined && { body: cleanBody }),
    ...(dto.variables !== undefined && { variables: JSON.stringify(dto.variables) }),
    ...(dto.isActive !== undefined && { isActive: dto.isActive }),
  });
};

export const deleteEmailTemplate = async (id: number): Promise<void> => {
  const existing = await emailTemplateRepository.findById(id);
  if (!existing) {
    throw Object.assign(new Error('Template not found'), { statusCode: 404 });
  }
  await emailTemplateRepository.removeById(id);
};

export const testEmailTemplate = async (
  id: number,
  to: string,
  variables?: Record<string, string>
): Promise<void> => {
  const template = await emailTemplateRepository.findById(id);
  if (!template || !template.isActive) {
    throw Object.assign(new Error('Template not found or inactive'), { statusCode: 404 });
  }
  const vars: Record<string, string> = variables || {};
  const subject = applyTemplateVariables(template.subject, vars);
  const body = applyTemplateVariables(template.body, vars);
  await sendEmail(to, subject, body);
};
