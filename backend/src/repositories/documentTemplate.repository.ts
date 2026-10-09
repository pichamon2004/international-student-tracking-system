import prisma from '../utils/prisma';

export interface CreateDocumentTemplateDto {
  name:         string;
  description?: string;
  body:         string;
  variables?:   string | null;
  isActive?:    boolean;
  signingMethod?: string;
}

export interface UpdateDocumentTemplateDto {
  name?:        string;
  description?: string;
  body?:        string;
  variables?:   string;
  isActive?:    boolean;
  signingMethod?: string;
}

// ── Queries ───────────────────────────────────────────────────────

export const findAll = () =>
  prisma.documentTemplate.findMany({ orderBy: { name: 'asc' } });

export const findById = (id: number) =>
  prisma.documentTemplate.findUnique({ where: { id } });

export const findByRequestTypeId = (requestTypeId: number) =>
  prisma.documentTemplate.findMany({
    where:  { requestTypes: { some: { id: requestTypeId } } },
    select: { id: true, name: true, description: true, variables: true, body: true, signingMethod: true },
  });

// ── Mutations ─────────────────────────────────────────────────────

export const create = (dto: CreateDocumentTemplateDto) =>
  prisma.documentTemplate.create({
    data: {
      name:        dto.name,
      description: dto.description,
      body:        dto.body,
      variables:   dto.variables ?? null,
      isActive:    dto.isActive ?? true,
      signingMethod: dto.signingMethod ?? 'digital',
    },
  });

export const updateById = (id: number, dto: UpdateDocumentTemplateDto) =>
  prisma.documentTemplate.update({
    where: { id },
    data: {
      name:        dto.name,
      description: dto.description,
      body:        dto.body,
      variables:   dto.variables,
      isActive:    dto.isActive,
      signingMethod: dto.signingMethod,
    },
  });

export const removeById = (id: number) =>
  prisma.documentTemplate.delete({ where: { id } });
