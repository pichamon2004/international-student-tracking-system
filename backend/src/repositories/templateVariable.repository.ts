import prisma from '../utils/prisma';

export interface CreateTemplateVariableDto {
  key:          string;
  label:        string;
  description?: string;
}

export interface UpdateTemplateVariableDto {
  label?:       string;
  description?: string;
}

export const findAll = () =>
  prisma.templateVariable.findMany({ orderBy: { label: 'asc' } });

export const findByKey = (key: string) =>
  prisma.templateVariable.findUnique({ where: { key } });

export const findById = (id: number) =>
  prisma.templateVariable.findUnique({ where: { id } });

export const create = (dto: CreateTemplateVariableDto) =>
  prisma.templateVariable.create({ data: dto });

export const updateById = (id: number, dto: UpdateTemplateVariableDto) =>
  prisma.templateVariable.update({ where: { id }, data: dto });

export const removeById = (id: number) =>
  prisma.templateVariable.delete({ where: { id } });
