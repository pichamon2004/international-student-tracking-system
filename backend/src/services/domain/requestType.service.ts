import * as requestTypeRepository from '../../repositories/requestType.repository';

export const getRequestTypes = () =>
  requestTypeRepository.findAll();

export const createRequestType = (dto: {
  name: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  documentTemplateIds?: number[];
}) => {
  if (!dto.name) {
    throw Object.assign(new Error('name is required'), { statusCode: 400 });
  }
  return requestTypeRepository.create(dto);
};

export const updateRequestType = (id: number, dto: {
  name?: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  documentTemplateIds?: number[];
}) => requestTypeRepository.updateById(id, dto);

export const deleteRequestType = (id: number) =>
  requestTypeRepository.removeById(id);
