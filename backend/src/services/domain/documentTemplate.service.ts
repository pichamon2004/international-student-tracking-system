import sanitizeHtml from 'sanitize-html';
import * as documentTemplateRepository from '../../repositories/documentTemplate.repository';
import * as generatedDocRepository from '../../repositories/generatedDoc.repository';

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'h1', 'h2', 'h3', 'u', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    // 'data-var' tags which {{variable}} a chip represents, and 'contenteditable'
    // keeps chips non-editable when a saved template is reopened — both are relied
    // on by the variable-extraction logic on reload, so they must survive sanitization.
    '*': ['style', 'class', 'data-var', 'contenteditable'],
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
  signingMethod?: string;
}) => {
  const cleanBody = dto.body ? sanitizeHtml(dto.body, sanitizeOptions) : dto.body;
  return documentTemplateRepository.create({
    name: dto.name,
    description: dto.description,
    body: cleanBody,
    variables: dto.variables ? JSON.stringify(dto.variables) : null,
    isActive: dto.isActive,
    signingMethod: dto.signingMethod === 'manual' ? 'manual' : 'digital',
  });
};

export const updateTemplate = (id: number, dto: {
  name?: string;
  description?: string;
  body?: string;
  variables?: unknown;
  isActive?: boolean;
  signingMethod?: string;
}) => {
  const cleanBody = dto.body ? sanitizeHtml(dto.body, sanitizeOptions) : undefined;
  return documentTemplateRepository.updateById(id, {
    name: dto.name,
    description: dto.description,
    ...(cleanBody !== undefined && { body: cleanBody }),
    variables: dto.variables !== undefined ? JSON.stringify(dto.variables) : undefined,
    isActive: dto.isActive,
    signingMethod: dto.signingMethod !== undefined
      ? (dto.signingMethod === 'manual' ? 'manual' : 'digital')
      : undefined,
  });
};

export const deleteTemplate = async (id: number) => {
  // DocumentTemplate -> GeneratedDocument has no onDelete: Cascade, so once a
  // single PDF has ever been generated from this template, a hard delete
  // would violate that foreign key — check first and fail with a message
  // that actually explains why, instead of surfacing a raw constraint error.
  const docCount = await generatedDocRepository.countByTemplateId(id);
  if (docCount > 0) {
    throw Object.assign(
      new Error(`This template has ${docCount} generated document${docCount === 1 ? '' : 's'} and can't be deleted. Deactivate it instead.`),
      { statusCode: 409 }
    );
  }
  return documentTemplateRepository.removeById(id);
};
