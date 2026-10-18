import * as documentRepository from '../../repositories/document.repository';
import * as fileService from './file.service';
import { DOCUMENT_FILES, presentFileFields, presentOne } from './fileFields';

export const getDocuments = async (studentId: number) =>
  presentFileFields(await documentRepository.findByStudentId(studentId), DOCUMENT_FILES);

export const uploadDocument = async (
  studentId: number,
  file: Express.Multer.File,
  name?: string,
  description?: string,
  uploadedBy?: number,
) => {
  const { file: stored } = await fileService.store(file.buffer, {
    originalName: file.originalname, purpose: 'GENERAL_DOCUMENT', uploadedById: uploadedBy!, ownerStudentId: studentId,
  });
  const doc = await documentRepository.create({
    studentId,
    name: name || file.originalname,
    description,
    fileId: stored.id,
    fileType: stored.mimeType,
    fileSize: stored.sizeBytes,
    uploadedBy: uploadedBy!,
  });
  return presentOne(doc, DOCUMENT_FILES);
};

export const deleteDocument = async (docId: number, studentId: number): Promise<void> => {
  const doc = await documentRepository.findById(docId);
  if (!doc || doc.studentId !== studentId) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }
  // Keep the object — the file row is soft-deleted and the cleanup job decides later
  if (doc.fileId) await fileService.softDelete(doc.fileId);
  await documentRepository.removeById(doc.id);
};
