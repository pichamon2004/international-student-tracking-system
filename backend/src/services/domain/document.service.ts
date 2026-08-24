import * as documentRepository from '../../repositories/document.repository';
import { uploadToR2, deleteFromR2, keyFromUrl } from '../external/r2.service';

export const getDocuments = (studentId: number) =>
  documentRepository.findByStudentId(studentId);

export const uploadDocument = async (
  studentId: number,
  file: Express.Multer.File,
  name?: string,
  description?: string,
  uploadedBy?: number,
) => {
  const { url } = await uploadToR2(file.buffer, file.originalname, file.mimetype, 'documents');
  return documentRepository.create({
    studentId,
    name: name || file.originalname,
    description,
    fileUrl: url,
    fileType: file.mimetype,
    fileSize: file.size,
    uploadedBy: uploadedBy!,
  });
};

export const deleteDocument = async (docId: number): Promise<void> => {
  const doc = await documentRepository.findById(docId);
  if (!doc) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }
  await deleteFromR2(keyFromUrl(doc.fileUrl));
  await documentRepository.removeById(doc.id);
};
