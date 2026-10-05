import PDFDocument from 'pdfkit';
import { PDFDocument as PdfLib } from 'pdf-lib';
import * as requestRepository from '../../repositories/request.repository';
import * as documentTemplateRepository from '../../repositories/documentTemplate.repository';
import * as generatedDocRepository from '../../repositories/generatedDoc.repository';
import { renderTemplate } from '../../utils/templateRenderer';
import { uploadToR2, deleteFromR2, keyFromUrl, downloadFromR2 } from '../external/r2.service';

const A4_HEIGHT_PT = 841.89;

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

  // Find sig_* tokens in template, inject sentinels so renderTemplate won't flag them missing
  const sigPattern = /\{\{(sig_\w+)\}\}/g;
  const sigRoles: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = sigPattern.exec(template.body)) !== null) {
    sigRoles.push(m[1]);
  }

  const augmentedData: Record<string, string> = { ...formData };
  for (const role of sigRoles) {
    augmentedData[role] = `__SIG_${role}__`;
  }

  const { rendered, missing } = renderTemplate(template.body, augmentedData);
  if (missing.length > 0) {
    throw Object.assign(
      new Error(`Missing variables: ${missing.join(', ')}`),
      { statusCode: 400 }
    );
  }

  const sigCoordsMap: Record<string, { page: number; y: number }> = {};

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let currentPage = 0;
    doc.on('pageAdded', () => { currentPage++; });

    doc.fontSize(11).font('Helvetica');

    const placeholderPattern = /__SIG_(sig_\w+)__/g;
    let lastIndex = 0;
    let pm: RegExpExecArray | null;

    while ((pm = placeholderPattern.exec(rendered)) !== null) {
      const textBefore = rendered.slice(lastIndex, pm.index);
      if (textBefore) doc.text(textBefore, { lineGap: 4 });

      sigCoordsMap[pm[1]] = { page: currentPage, y: doc.y };
      // Draw signature line placeholder
      doc.moveDown(0.5);
      doc.moveTo(doc.x, doc.y).lineTo(doc.x + 200, doc.y).stroke();
      doc.moveDown(1);

      lastIndex = pm.index + pm[0].length;
    }

    const remaining = rendered.slice(lastIndex);
    if (remaining) doc.text(remaining, { lineGap: 4 });

    doc.end();
  });

  const filename = `${Date.now()}-req${requestId}.pdf`;
  const { url } = await uploadToR2(pdfBuffer, filename, 'application/pdf', 'generated');

  return generatedDocRepository.create({
    templateId,
    studentId:  request.studentId,
    generatedBy: userId,
    fileUrl:    url,
    requestId,
    sigCoords:  JSON.stringify(sigCoordsMap),
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

export const getSignatures = async (docId: number) => {
  const doc = await generatedDocRepository.findById(docId);
  if (!doc) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }
  return generatedDocRepository.findSignaturesByDocId(docId);
};

export const addDigitalSignature = async (
  docId: number,
  role: string,
  imageDataUrl: string,
  userId: number
) => {
  const doc = await generatedDocRepository.findByIdWithSignatures(docId);
  if (!doc) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }

  const validRoles = ['student', 'ir_staff', 'advisor', 'dean'];
  if (!validRoles.includes(role)) {
    throw Object.assign(new Error('Invalid signature role'), { statusCode: 400 });
  }

  // Decode base64 image and upload to R2
  const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
  const imgBuffer = Buffer.from(base64Data, 'base64');
  const { url: imageUrl } = await uploadToR2(imgBuffer, `sig-${role}.png`, 'image/png', 'signatures');

  await generatedDocRepository.upsertSignature({ docId, role, signerUserId: userId, imageUrl });

  // Check if all required sig roles are now signed
  const sigCoords: Record<string, unknown> = doc.sigCoords ? JSON.parse(doc.sigCoords) : {};
  const requiredRoles = Object.keys(sigCoords).map(k => k.replace('sig_', ''));

  const updatedSignatures = await generatedDocRepository.findSignaturesByDocId(docId);
  const signedRoles = updatedSignatures.map(s => s.role);
  const allSigned = requiredRoles.length > 0 && requiredRoles.every(r => signedRoles.includes(r));

  if (allSigned) {
    await embedAndFinalize(docId);
  }

  return { imageUrl, allSigned };
};

export const embedAndFinalize = async (docId: number) => {
  const doc = await generatedDocRepository.findByIdWithSignatures(docId);
  if (!doc?.fileUrl) {
    throw Object.assign(new Error('Document not found or no PDF generated'), { statusCode: 404 });
  }

  const sigCoords: Record<string, { page: number; y: number }> = doc.sigCoords
    ? JSON.parse(doc.sigCoords)
    : {};

  const signatures = doc.signatures ?? [];
  if (signatures.length === 0) {
    throw Object.assign(new Error('No signatures to embed'), { statusCode: 400 });
  }

  // Download blank PDF from R2
  const pdfKey = keyFromUrl(doc.fileUrl);
  const pdfBuffer = await downloadFromR2(pdfKey);

  const pdfDoc = await PdfLib.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  for (const sig of signatures) {
    const sigKey = `sig_${sig.role}`;
    const coords = sigCoords[sigKey];
    if (!coords) continue;

    const pageIndex = coords.page;
    const page = pages[pageIndex];
    if (!page) continue;

    const { height: pageHeight } = page.getSize();

    // Download signature image from R2
    const imgKey = keyFromUrl(sig.imageUrl);
    const imgBuffer = await downloadFromR2(imgKey);

    let pdfLibImage;
    try {
      pdfLibImage = await pdfDoc.embedPng(imgBuffer);
    } catch {
      pdfLibImage = await pdfDoc.embedJpg(imgBuffer);
    }

    const IMG_W = 150;
    const IMG_H = 50;
    // PDFKit y is top-down; pdf-lib y is bottom-up
    const pdfLibY = pageHeight - coords.y - IMG_H;

    page.drawImage(pdfLibImage, {
      x:      60,
      y:      pdfLibY,
      width:  IMG_W,
      height: IMG_H,
    });
  }

  const finalPdfBytes = await pdfDoc.save();
  const finalBuffer = Buffer.from(finalPdfBytes);

  const filename = `finalized-doc${docId}-${Date.now()}.pdf`;
  const { url: finalUrl } = await uploadToR2(finalBuffer, filename, 'application/pdf', 'finalized');

  return generatedDocRepository.updateFinalizedPdf(docId, finalUrl, 'digital');
};
