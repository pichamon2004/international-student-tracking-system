import * as repo from '../../repositories/templateVariable.repository';
import type { UpdateTemplateVariableDto } from '../../repositories/templateVariable.repository';

export const getAllVariables = () => repo.findAll();

export const createVariable = async (dto: {
  key: string;
  label: string;
  description?: string;
}) => {
  const key = dto.key.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
  const existing = await repo.findByKey(key);
  if (existing) {
    throw Object.assign(new Error('Key already exists'), { statusCode: 400 });
  }
  return repo.create({ key, label: dto.label, description: dto.description });
};

export const updateVariable = (id: number, dto: UpdateTemplateVariableDto) =>
  repo.updateById(id, dto);

export const deleteVariable = async (id: number) => {
  const v = await repo.findById(id);
  if (!v) throw Object.assign(new Error('Variable not found'), { statusCode: 404 });
  return repo.removeById(id);
};
