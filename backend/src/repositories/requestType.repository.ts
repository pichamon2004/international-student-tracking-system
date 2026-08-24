import prisma from '../utils/prisma';

export interface CreateRequestTypeDto {
  name:                string;
  description?:        string;
  icon?:               string;
  isActive?:           boolean;
  documentTemplateIds?: number[];
}

export interface UpdateRequestTypeDto {
  name?:               string;
  description?:        string;
  icon?:               string;
  isActive?:           boolean;
  documentTemplateIds?: number[];
}

const TEMPLATE_SELECT = {
  id: true, name: true, description: true, isActive: true, variables: true, body: true,
} as const;

// ── Queries ───────────────────────────────────────────────────────

export const findAll = () =>
  prisma.requestType.findMany({
    orderBy: { id: 'asc' },
    include: { documentTemplates: { select: TEMPLATE_SELECT } },
  });

// ── Mutations ─────────────────────────────────────────────────────

export const create = (dto: CreateRequestTypeDto) =>
  prisma.requestType.create({
    data: {
      name:        dto.name,
      description: dto.description,
      icon:        dto.icon,
      isActive:    dto.isActive ?? true,
      documentTemplates: dto.documentTemplateIds?.length
        ? { connect: dto.documentTemplateIds.map((id) => ({ id })) }
        : undefined,
    },
    include: { documentTemplates: { select: TEMPLATE_SELECT } },
  });

export const updateById = (id: number, dto: UpdateRequestTypeDto) =>
  prisma.requestType.update({
    where: { id },
    data: {
      name:        dto.name,
      description: dto.description,
      icon:        dto.icon,
      isActive:    dto.isActive,
      documentTemplates: dto.documentTemplateIds !== undefined
        ? { set: dto.documentTemplateIds.map((tid) => ({ id: tid })) }
        : undefined,
    },
    include: { documentTemplates: { select: TEMPLATE_SELECT } },
  });

export const removeById = (id: number) =>
  prisma.requestType.delete({ where: { id } });
