import PDFDocument from 'pdfkit';
import * as requestRepository from '../../repositories/request.repository';
import * as documentTemplateRepository from '../../repositories/documentTemplate.repository';
import * as generatedDocRepository from '../../repositories/generatedDoc.repository';
import { renderTemplate } from '../../utils/templateRenderer';
import { uploadToR2, deleteFromR2, keyFromUrl } from '../external/r2.service';

export const generatePdf = async (
  requestId: number,
  templateId: number,
  formData: Record<string, string>,
  userId: number
) => {
  const [request, template] = await Promise.all([
    requestRepository.findById(requestId),
    documentTemplateRepository.findById(templateId),
  ]);

  if (!request) {
    throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  }
  if (!template) {
    throw Object.assign(new Error('Template not found'), { statusCode: 404 });
  }

  const { rendered, missing } = renderTemplate(template.body, formData);
  if (missing.length > 0) {
    throw Object.assign(
      new Error(`Missing variables: ${missing.join(', ')}`),
      { statusCode: 400 }
    );
  }

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(11).font('Helvetica').text(rendered, { lineGap: 4 });
    doc.end();
  });

  const filename = `${Date.now()}-req${requestId}.pdf`;
  const { url } = await uploadToR2(pdfBuffer, filename, 'application/pdf', 'generated');

  return generatedDocRepository.create({
    templateId,
    studentId: request.studentId,
    generatedBy: userId,
    fileUrl: url,
  });
};

export const getGeneratedDocs = async (requestId: number) => {
  const request = await requestRepository.findById(requestId);
  if (!request) {
    throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  }
  return generatedDocRepository.findByStudentId(request.studentId);
};

export const getGeneratedDocById = async (docId: number) => {
  const doc = await generatedDocRepository.findById(docId);
  if (!doc) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }
  return doc;
};

export const getGeneratedDocForDownload = async (docId: number): Promise<{ fileUrl: string }> => {
  const doc = await generatedDocRepository.findById(docId);
  if (!doc?.fileUrl) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }
  return { ...doc, fileUrl: doc.fileUrl };
};

export const uploadSignedDoc = async (
  docId: number,
  file: Express.Multer.File,
  userId: number
) => {
  const doc = await generatedDocRepository.findById(docId);
  if (!doc) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }

  if (doc.signedFileUrl) {
    await deleteFromR2(keyFromUrl(doc.signedFileUrl)).catch(() => { });
  }

  const { url } = await uploadToR2(file.buffer, file.originalname, file.mimetype, 'signed');
  return generatedDocRepository.updateSignedFile(doc.id, url, String(userId));
};
