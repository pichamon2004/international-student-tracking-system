import * as requestRepository from '../../repositories/request.repository';
import * as documentTemplateRepository from '../../repositories/documentTemplate.repository';
import * as generatedDocRepository from '../../repositories/generatedDoc.repository';
import * as studentRepository from '../../repositories/student.repository';
import * as userRepository from '../../repositories/user.repository';
import * as userService from './user.service';
import * as deanDelegationService from './deanDelegation.service';
import { uploadToR2, deleteFromR2, keyFromUrl } from '../external/r2.service';
import {
  mergeTemplateToHtml, parseRequiredSigKeys, buildSignatureGridHtml, resolveStaticImages, renderHtmlToPdf,
} from '../../utils/htmlPdf';

// Pre-resolve a display name for each required role, the same sources the
// live preview uses (student/advisor names are filled on the request form;
// IR staff / dean are the system's designated signatories) — queried only
// for roles this template actually requires.
async function resolveSigNames(
  requiredSigKeys: string[],
  formData: Record<string, string>,
  student?: { titleEn: string | null; firstNameEn: string | null; lastNameEn: string | null } | null
): Promise<Record<string, string>> {
  const sigNames: Record<string, string> = {};
  if (requiredSigKeys.includes('sig_student')) {
    sigNames.sig_student = formData.student_name
      || [student?.titleEn, student?.firstNameEn, student?.lastNameEn].filter(Boolean).join(' ');
  }
  if (requiredSigKeys.includes('sig_advisor')) {
    sigNames.sig_advisor = formData.advisor_name || '';
  }
  if (requiredSigKeys.includes('sig_ir_staff')) {
    const staff = await userService.getStaffUsers();
    sigNames.sig_ir_staff = staff[0]?.name ?? '';
  }
  if (requiredSigKeys.includes('sig_dean')) {
    sigNames.sig_dean = await deanDelegationService.getActiveSignatory()
      .then(s => s.name)
      .catch(() => '');
  }
  return sigNames;
}

export const generatePdf = async (
  requestId: number,
  templateId: number,
  formData: Record<string, string>,
  userId: number,
  userRole?: string
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

  // Students can now trigger generation themselves (signing their own
  // document right after submitting a request), so unlike the staff-only
  // path this needs an ownership check — otherwise any student could
  // generate a PDF for another student's request just by knowing its id.
  if (userRole === 'STUDENT') {
    const student = await studentRepository.findByUserId(userId);
    if (!student || request.studentId !== student.id) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
    }
  }

  const requiredSigKeys = parseRequiredSigKeys(template.variables);
  const { html: mergedHtml, missing } = mergeTemplateToHtml(template.body, formData);
  if (missing.length > 0) {
    throw Object.assign(
      new Error(`Missing variables: ${missing.join(', ')}`),
      { statusCode: 400 }
    );
  }

  const sigNames = await resolveSigNames(requiredSigKeys, formData, request.student);
  const sigGridHtml = buildSignatureGridHtml(
    requiredSigKeys,
    Object.fromEntries(requiredSigKeys.map(k => [k, { name: sigNames[k] }]))
  );
  const fullBodyHtml = resolveStaticImages(mergedHtml + sigGridHtml);

  const pdfBuffer = await renderHtmlToPdf(fullBodyHtml);

  const filename = `${Date.now()}-req${requestId}.pdf`;
  const { url } = await uploadToR2(pdfBuffer, filename, 'application/pdf', 'generated');

  return generatedDocRepository.create({
    templateId,
    studentId:  request.studentId,
    generatedBy: userId,
    fileUrl:    url,
    requestId,
    formData:   JSON.stringify(formData),
  });
};

export const getGeneratedDocs = async (requestId: number) => {
  const request = await requestRepository.findById(requestId);
  if (!request) {
    throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  }
  return generatedDocRepository.findByRequestId(requestId);
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
  userId: number,
  userRole?: string,
  signerRole?: string
) => {
  const doc = await generatedDocRepository.findById(docId);
  if (!doc) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }

  // Students can now upload their own manually-signed PDF straight from the
  // sign prompt, so this needs the same ownership check as generatePdf —
  // otherwise any student could overwrite another student's signed file.
  if (userRole === 'STUDENT') {
    const student = await studentRepository.findByUserId(userId);
    if (!student || doc.studentId !== student.id) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
    }
  }

  if (doc.template.signingMethod !== 'manual') {
    throw Object.assign(
      new Error('This document uses digital signing — sign it with the canvas or a signature image instead of uploading a signed file'),
      { statusCode: 400 }
    );
  }

  // Manual signing is still per-role (each required signer prints, signs,
  // and uploads their own turn) — without recording a DocSignature row here,
  // the "who's signed" checklist and the request page's signed/pending state
  // never move off pending, even though a file was uploaded.
  if (signerRole) {
    const validRoles = ['student', 'ir_staff', 'advisor', 'dean'];
    if (!validRoles.includes(signerRole)) {
      throw Object.assign(new Error('Invalid signature role'), { statusCode: 400 });
    }
    const requiredRoles = parseRequiredSigKeys(doc.template.variables).map(k => k.replace('sig_', ''));
    if (requiredRoles.length > 0 && !requiredRoles.includes(signerRole)) {
      throw Object.assign(
        new Error(`This document does not require a signature from the ${signerRole} role`),
        { statusCode: 400 }
      );
    }
  }

  if (doc.signedFileUrl) {
    await deleteFromR2(keyFromUrl(doc.signedFileUrl)).catch(() => { });
  }

  const { url } = await uploadToR2(file.buffer, file.originalname, file.mimetype, 'signed');

  if (signerRole) {
    // No embedded signature image for manual uploads — the uploaded PDF
    // itself is the proof of signing, so its own URL doubles as the
    // (non-null) imageUrl field, purely for traceability.
    await generatedDocRepository.upsertSignature({ docId, role: signerRole, signerUserId: userId, imageUrl: url });
  }

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
  if (doc.template.signingMethod !== 'digital') {
    throw Object.assign(
      new Error('This document uses manual signing — download, sign by hand, and upload the signed PDF instead'),
      { statusCode: 400 }
    );
  }

  const validRoles = ['student', 'ir_staff', 'advisor', 'dean'];
  if (!validRoles.includes(role)) {
    throw Object.assign(new Error('Invalid signature role'), { statusCode: 400 });
  }

  // This document's template may only require a subset of roles (e.g. just
  // student + ir_staff) — signing with a role outside that set would never
  // count toward completion, silently leaving the document un-finalized with
  // no visible embedded signature, so reject it up front instead.
  const requiredRoles = parseRequiredSigKeys(doc.template.variables).map(k => k.replace('sig_', ''));
  if (requiredRoles.length > 0 && !requiredRoles.includes(role)) {
    throw Object.assign(
      new Error(`This document does not require a signature from the ${role} role`),
      { statusCode: 400 }
    );
  }

  // Decode base64 image and upload to R2
  const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
  const imgBuffer = Buffer.from(base64Data, 'base64');
  const { url: imageUrl } = await uploadToR2(imgBuffer, `sig-${role}.png`, 'image/png', 'signatures');

  await generatedDocRepository.upsertSignature({ docId, role, signerUserId: userId, imageUrl });

  const updatedSignatures = await generatedDocRepository.findSignaturesByDocId(docId);
  const signedRoles = updatedSignatures.map(s => s.role);
  const allSigned = requiredRoles.length > 0 && requiredRoles.every(r => signedRoles.includes(r));

  // Re-embed after every signature (not only once everyone's done) so each
  // signer's mark becomes visible right away — always rebuilt fresh from the
  // template + original form data, so partial and final renders never stack
  // on top of each other.
  await embedAndFinalize(docId);

  return { imageUrl, allSigned };
};

export const embedAndFinalize = async (docId: number) => {
  const doc = await generatedDocRepository.findByIdWithSignatures(docId);
  if (!doc?.fileUrl) {
    throw Object.assign(new Error('Document not found or no PDF generated'), { statusCode: 404 });
  }

  const signatures = doc.signatures ?? [];
  if (signatures.length === 0) {
    throw Object.assign(new Error('No signatures to embed'), { statusCode: 400 });
  }

  const requiredSigKeys = parseRequiredSigKeys(doc.template.variables);
  const formData: Record<string, string> = doc.formData ? JSON.parse(doc.formData) : {};
  const { html: mergedHtml } = mergeTemplateToHtml(doc.template.body, formData);

  // For each required role that has signed, show the actual signer's name
  // (not just who was expected to sign) alongside their drawn/uploaded image.
  const entries: Record<string, { name?: string; imageUrl?: string }> = {};
  for (const key of requiredSigKeys) {
    const role = key.replace('sig_', '');
    const sig = signatures.find(s => s.role === role);
    if (!sig) continue;
    const signer = await userRepository.findByIdFull(sig.signerUserId);
    entries[key] = { name: signer?.name, imageUrl: sig.imageUrl };
  }

  const sigGridHtml = buildSignatureGridHtml(requiredSigKeys, entries);
  const fullBodyHtml = resolveStaticImages(mergedHtml + sigGridHtml);
  const pdfBuffer = await renderHtmlToPdf(fullBodyHtml);

  const filename = `finalized-doc${docId}-${Date.now()}.pdf`;
  const { url: finalUrl } = await uploadToR2(pdfBuffer, filename, 'application/pdf', 'finalized');

  return generatedDocRepository.updateFinalizedPdf(docId, finalUrl, 'digital');
};
