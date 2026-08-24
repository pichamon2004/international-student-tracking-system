import sanitizeHtml from 'sanitize-html';
import * as documentTemplateRepository from '../../repositories/documentTemplate.repository';

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'h1', 'h2', 'h3', 'u', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['style', 'class'],
    img: ['src', 'alt', 'width', 'height'],
  },
};

export const getTemplates = () =>
  documentTemplateRepository.findAll();

export const createTemplate = (dto: {
  name: string;
  description?: string;
  body: string;
  variables?: unknown;
  isActive?: boolean;
}) => {
  const cleanBody = dto.body ? sanitizeHtml(dto.body, sanitizeOptions) : dto.body;
  return documentTemplateRepository.create({
    name: dto.name,
    description: dto.description,
    body: cleanBody,
    variables: dto.variables ? JSON.stringify(dto.variables) : null,
    isActive: dto.isActive,
  });
};

export const updateTemplate = (id: number, dto: {
  name?: string;
  description?: string;
  body?: string;
  variables?: unknown;
  isActive?: boolean;
}) => {
  const cleanBody = dto.body ? sanitizeHtml(dto.body, sanitizeOptions) : undefined;
  return documentTemplateRepository.updateById(id, {
    name: dto.name,
    description: dto.description,
    ...(cleanBody !== undefined && { body: cleanBody }),
    variables: dto.variables !== undefined ? JSON.stringify(dto.variables) : undefined,
    isActive: dto.isActive,
  });
};

export const deleteTemplate = (id: number) =>
  documentTemplateRepository.removeById(id);
