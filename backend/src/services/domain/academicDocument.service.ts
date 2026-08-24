import * as academicDocumentRepository from '../../repositories/academicDocument.repository';
import { CreateAcademicDocumentDto, UpdateAcademicDocumentDto } from '../../repositories/academicDocument.repository';

export const getAcademicDocuments = (studentId: number) =>
  academicDocumentRepository.findByStudentId(studentId);

export const createAcademicDocument = async (
  studentId: number,
  docType: string,
  institution: string,
  issueDate: string,
  fileUrl?: string,
) => {
  if (!docType || !institution || !issueDate) {
    throw Object.assign(new Error('docType, institution, and issueDate are required'), { statusCode: 400 });
  }

  const dto: CreateAcademicDocumentDto = {
    studentId,
    docType,
    institution,
    issueDate: new Date(issueDate),
    fileUrl,
  };

  return academicDocumentRepository.createForStudent(dto);
};

export const updateAcademicDocument = async (
  docId: number,
  studentId: number,
  dto: UpdateAcademicDocumentDto,
) => {
  const existing = await academicDocumentRepository.findByIdAndStudentId(docId, studentId);
  if (!existing) {
    throw Object.assign(new Error('Academic document not found'), { statusCode: 404 });
  }

  return academicDocumentRepository.updateById(docId, dto);
};

export const deleteAcademicDocument = async (docId: number, studentId: number) => {
  const existing = await academicDocumentRepository.findByIdAndStudentId(docId, studentId);
  if (!existing) {
    throw Object.assign(new Error('Academic document not found'), { statusCode: 404 });
  }

  return academicDocumentRepository.removeById(docId);
};