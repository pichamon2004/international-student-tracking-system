import prisma from '../utils/prisma';

export interface CreateEmailTemplateDto {
  name:      string;
  subject:   string;
  body:      string;
  variables?: string | null;
}

export interface UpdateEmailTemplateDto {
  name?:      string;
  subject?:   string;
  body?:      string;
  variables?: string;
  isActive?:  boolean;
}

// ── Queries ───────────────────────────────────────────────────────

export const findAll = () =>
  prisma.emailTemplate.findMany({ orderBy: { createdAt: 'desc' } });

export const findById = (id: number) =>
  prisma.emailTemplate.findUnique({ where: { id } });

// ── Mutations ─────────────────────────────────────────────────────

export const create = (dto: CreateEmailTemplateDto) =>
  prisma.emailTemplate.create({
    data: {
      name:      dto.name,
      subject:   dto.subject,
      body:      dto.body,
      variables: dto.variables ?? null,
    },
  });

export const updateById = (id: number, dto: UpdateEmailTemplateDto) =>
  prisma.emailTemplate.update({
    where: { id },
    data: {
      name:      dto.name,
      subject:   dto.subject,
      body:      dto.body,
      variables: dto.variables,
      isActive:  dto.isActive,
    },
  });

export const removeById = (id: number) =>
  prisma.emailTemplate.delete({ where: { id } });
