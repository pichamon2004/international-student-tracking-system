import prisma from '../utils/prisma';

export interface CreateDocumentTemplateDto {
  name:         string;
  description?: string;
  body:         string;
  variables?:   string | null;
  isActive?:    boolean;
}

export interface UpdateDocumentTemplateDto {
  name?:        string;
  description?: string;
  body?:        string;
  variables?:   string;
  isActive?:    boolean;
}

// ── Queries ───────────────────────────────────────────────────────

export const findAll = () =>
  prisma.documentTemplate.findMany({ orderBy: { name: 'asc' } });

export const findById = (id: number) =>
  prisma.documentTemplate.findUnique({ where: { id } });

export const findByRequestTypeId = (requestTypeId: number) =>
  prisma.documentTemplate.findMany({
    where:  { requestTypes: { some: { id: requestTypeId } } },
    select: { id: true, name: true, description: true, variables: true, body: true },
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
    },
  });

export const removeById = (id: number) =>
  prisma.documentTemplate.delete({ where: { id } });
