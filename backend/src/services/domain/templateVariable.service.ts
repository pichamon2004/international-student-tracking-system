import * as repo from '../../repositories/templateVariable.repository';
import type { UpdateTemplateVariableDto } from '../../repositories/templateVariable.repository';

export const getAllVariables = () => repo.findAll();

export const createVariable = async (dto: {
  key: string;
  label: string;
  description?: string;
  inputType?: string;
  options?: unknown[];
}) => {
  const key = dto.key.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
  const existing = await repo.findByKey(key);
  if (existing) {
    throw Object.assign(new Error('Key already exists'), { statusCode: 400 });
  }
  return repo.create({
    key,
    label: dto.label,
    description: dto.description,
    inputType: dto.inputType ?? 'auto',
    options: dto.options ? JSON.stringify(dto.options) : undefined,
  });
};

export const updateVariable = (id: number, dto: UpdateTemplateVariableDto & { options?: unknown[] }) => {
  const { options, ...rest } = dto as any;
  return repo.updateById(id, {
    ...rest,
    ...(options !== undefined ? { options: JSON.stringify(options) } : {}),
  });
};

export const deleteVariable = async (id: number) => {
  const v = await repo.findById(id);
  if (!v) throw Object.assign(new Error('Variable not found'), { statusCode: 404 });
  return repo.removeById(id);
};
