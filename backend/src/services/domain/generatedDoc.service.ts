import * as requestRepository from '../../repositories/request.repository';
import * as requestEventRepository from '../../repositories/requestEvent.repository';
import * as documentTemplateRepository from '../../repositories/documentTemplate.repository';
import * as generatedDocRepository from '../../repositories/generatedDoc.repository';
import * as studentRepository from '../../repositories/student.repository';
import * as userRepository from '../../repositories/user.repository';
import * as userService from './user.service';
import * as deanDelegationService from './deanDelegation.service';
import * as fileService from './file.service';
import { assertCanSignAs, assertCanViewStudentRequests } from './requestAccess';
import { GENERATED_DOC_FILES, presentFileFields, presentOne } from './fileFields';
import {
  mergeTemplateToHtml, parseRequiredSigKeys, buildSignatureGridHtml, resolveStaticImages, renderHtmlToPdf,
} from '../../utils/htmlPdf';

// Pre-resolve a display name for each required role, the same sources the
// live preview uses (student/advisor names are filled on the request form;
// IR staff / dean are the system's designated signatories) — queried only
// for roles this template actually requires.
type DocRow = Awaited<ReturnType<typeof generatedDocRepository.findByRequestId>>[number];
type SignatureRow = Awaited<ReturnType<typeof generatedDocRepository.findSignaturesByDocId>>[number];

/** PDFs back as the fileUrl / signedFileUrl the API has always returned. */
const presentDocs = <T extends Pick<DocRow, 'file' | 'signedFile'>>(rows: T[]) =>
  presentFileFields(rows, GENERATED_DOC_FILES);

/** A signature's file — the image (digital) or the signed PDF (manual) — as imageUrl, as before. */
export async function presentSignatures(rows: SignatureRow[]) {
  return Promise.all(rows.map(async ({ imageFile, evidenceFile, ...sig }) => ({
    ...sig,
    imageUrl: await fileService.urlFor(imageFile ?? evidenceFile),
  })));
}

/**
 * The signature image inlined as a data: URI for the PDF renderer, read from
 * storage by the backend — never a URL the renderer would have to fetch, which
 * stops working once the bucket is private. Manual evidence PDFs have no image.
 */
async function signatureImageDataUri(sig: SignatureRow): Promise<string | undefined> {
  if (!sig.imageFile || !sig.imageFile.mimeType.startsWith('image/')) return undefined;
  const buf = await fileService.readBuffer(sig.imageFile);
  return `data:${sig.imageFile.mimeType};base64,${buf.toString('base64')}`;
}

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

  return createDoc(request, template, formData, userId);
};

type RequestForDoc = NonNullable<Awaited<ReturnType<typeof requestRepository.findById>>>;
type TemplateForDoc = { id: number; body: string; variables: string | null; signingMethod: string };

async function createDoc(
  request: RequestForDoc,
  template: TemplateForDoc,
  formData: Record<string, string>,
  userId: number
) {
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

  const { file } = await fileService.store(pdfBuffer, {
    originalName: `req${request.id}.pdf`, purpose: 'GENERATED_PDF', uploadedById: userId, ownerStudentId: request.studentId,
  });

  const doc = await generatedDocRepository.create({
    templateId:  template.id,
    studentId:   request.studentId,
    generatedBy: userId,
    fileId:      file.id,
    requestId:   request.id,
    formData:    JSON.stringify(formData),
  });

  if (template.signingMethod !== 'approval') return presentOne(doc, GENERATED_DOC_FILES);
  await backfillApprovalSignatures(doc.id, request, requiredSigKeys, userId);
  return presentOne((await generatedDocRepository.findById(doc.id)) ?? doc, GENERATED_DOC_FILES);
}

// ── "approval" signing: the approver's name is printed on Approve ────

// Which approval each role's box reflects, derived from where the request is
// in the workflow — so a document generated after some approvals already
// happened (or the student's own, generated on submit) still shows them.
// While a cancellation is pending, the workflow position is the status the
// request had before the student asked.
const STAFF_APPROVED_STATUSES = ['STAFF_APPROVED', 'FORWARDED_TO_ADVISOR', 'ADVISOR_APPROVED', 'ADVISOR_REJECTED', 'FORWARDED_TO_DEAN', 'DEAN_APPROVED', 'DEAN_REJECTED'];
const ADVISOR_APPROVED_STATUSES = ['ADVISOR_APPROVED', 'FORWARDED_TO_DEAN', 'DEAN_APPROVED', 'DEAN_REJECTED'];

async function backfillApprovalSignatures(docId: number, request: RequestForDoc, requiredSigKeys: string[], actorUserId: number) {
  const status = request.status === 'CANCEL_REQUESTED'
    ? (await requestEventRepository.findLatestCancelRequest(request.id))?.fromStatus ?? request.status
    : request.status;
  const approvers = await requestEventRepository.findLatestApprovers(request.id);
  const signers: Record<string, number | null | undefined> = {
    student:  request.student.userId,
    ir_staff: STAFF_APPROVED_STATUSES.includes(status) ? approvers.ir_staff : null,
    advisor:  ADVISOR_APPROVED_STATUSES.includes(status) ? approvers.advisor : null,
    dean:     status === 'DEAN_APPROVED' ? approvers.dean : null,
  };
  let recorded = false;
  for (const key of requiredSigKeys) {
    const role = key.replace('sig_', '');
    const signerUserId = signers[role];
    if (!signerUserId) continue;
    await generatedDocRepository.upsertSignature({ docId, role, signerUserId });
    recorded = true;
  }
  if (recorded) await embedAndFinalize(docId, actorUserId);
}

// Called when a role approves the request — prints that approver's name into
// every "approval" document of the request that has a box for their role,
// generating the document first if nobody has yet.
export const recordApprovalSignature = async (requestId: number, role: string, userId: number) => {
  const request = await requestRepository.findById(requestId);
  if (!request?.requestTypeId) return;

  const templates = (await documentTemplateRepository.findByRequestTypeId(request.requestTypeId))
    .filter(t => t.isActive && t.signingMethod === 'approval');
  if (templates.length === 0) return;

  const docs = await generatedDocRepository.findByRequestId(requestId);
  for (const template of templates) {
    const requiredSigKeys = parseRequiredSigKeys(template.variables);
    if (!requiredSigKeys.includes(`sig_${role}`)) continue;

    const existing = docs.find(d => d.templateId === template.id);
    if (!existing) {
      // Fresh document — backfill already records this approval (the
      // request's status/approver ids were updated before this call).
      const formData: Record<string, string> = request.formData ? JSON.parse(request.formData) : {};
      await createDoc(request, template, formData, userId);
      continue;
    }
    await generatedDocRepository.upsertSignature({ docId: existing.id, role, signerUserId: userId });
    await embedAndFinalize(existing.id, userId);
  }
};

export const getGeneratedDocs = async (requestId: number, userRole?: string, userId?: number) => {
  const request = await requestRepository.findById(requestId);
  if (!request) {
    throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  }
  await assertCanViewStudentRequests(request.studentId, userRole, userId);
  return presentDocs(await generatedDocRepository.findByRequestId(requestId));
};

export const getGeneratedDocById = async (docId: number, userRole?: string, userId?: number) => {
  const doc = await generatedDocRepository.findById(docId);
  if (!doc) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }
  await assertCanViewStudentRequests(doc.studentId, userRole, userId);
  return presentOne(doc, GENERATED_DOC_FILES);
};

// Reads the PDF through the API — the public R2 URL has no CORS headers, so
// the browser can't fetch it from the app to save it as a file.
export const getGeneratedDocForDownload = async (docId: number, userRole?: string, userId?: number): Promise<{ buffer: Buffer }> => {
  const doc = await generatedDocRepository.findById(docId);
  if (doc) await assertCanViewStudentRequests(doc.studentId, userRole, userId);
  // The signed version wins
  const file = doc?.signedFile ?? doc?.file;
  if (!file) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }
  return { buffer: await fileService.readBuffer(file) };
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
    await assertCanSignAs(signerRole, doc.studentId, userId, userRole);
    const requiredRoles = parseRequiredSigKeys(doc.template.variables).map(k => k.replace('sig_', ''));
    if (requiredRoles.length > 0 && !requiredRoles.includes(signerRole)) {
      throw Object.assign(
        new Error(`This document does not require a signature from the ${signerRole} role`),
        { statusCode: 400 }
      );
    }
  }

  const { file: stored } = await fileService.store(file.buffer, {
    originalName: file.originalname, purpose: 'SIGNED_PDF', uploadedById: userId, ownerStudentId: doc.studentId,
  });
  // The previous version is retired only if no earlier signer's turn rests on it —
  // each manual turn's upload is that signer's evidence (deleting it is how three
  // evidence PDFs were lost before the File table existed)
  const previous = doc.signedFileId;
  if (previous && !(await generatedDocRepository.isSignatureEvidence(previous))) {
    await fileService.softDelete(previous).catch(() => { });
  }

  if (signerRole) {
    // No embedded signature image for manual uploads — the uploaded PDF is the proof of signing
    await generatedDocRepository.upsertSignature({ docId, role: signerRole, signerUserId: userId, evidenceFileId: stored.id });
  }

  return presentOne(await generatedDocRepository.updateSignedFile(doc.id, stored.id, String(userId)), GENERATED_DOC_FILES);
};

export const getSignatures = async (docId: number, userRole?: string, userId?: number) => {
  const doc = await generatedDocRepository.findById(docId);
  if (!doc) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }
  await assertCanViewStudentRequests(doc.studentId, userRole, userId);
  return presentSignatures(await generatedDocRepository.findSignaturesByDocId(docId));
};

export const addDigitalSignature = async (
  docId: number,
  role: string,
  imageDataUrl: string,
  userId: number,
  userRole?: string
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

  // Only the person the box stands for may sign it (own student, their advisor, IR staff, acting dean)
  await assertCanSignAs(role, doc.studentId, userId, userRole);

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
  const { url: imageUrl, file: sigFile } = await fileService.store(imgBuffer, {
    originalName: `sig-${role}.png`, purpose: 'SIGNATURE', uploadedById: userId, ownerUserId: userId,
  });

  await generatedDocRepository.upsertSignature({ docId, role, signerUserId: userId, imageFileId: sigFile.id });

  const updatedSignatures = await generatedDocRepository.findSignaturesByDocId(docId);
  const signedRoles = updatedSignatures.map(s => s.role);
  const allSigned = requiredRoles.length > 0 && requiredRoles.every(r => signedRoles.includes(r));

  // Re-embed after every signature (not only once everyone's done) so each
  // signer's mark becomes visible right away — always rebuilt fresh from the
  // template + original form data, so partial and final renders never stack
  // on top of each other.
  await embedAndFinalize(docId, userId);

  return { imageUrl, allSigned };
};

// actorUserId: who caused the re-render (recorded as the PDF's uploader); falls back to whoever generated it
export const embedAndFinalize = async (docId: number, actorUserId?: number) => {
  const doc = await generatedDocRepository.findByIdWithSignatures(docId);
  if (!doc?.file) {
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
  // "approval" documents have no image — the printed name + approval date is
  // the signature itself.
  const isApproval = doc.template.signingMethod === 'approval';
  const entries: Record<string, { name?: string; imageUrl?: string; date?: Date; signatureText?: string }> = {};
  for (const key of requiredSigKeys) {
    const role = key.replace('sig_', '');
    const sig = signatures.find(s => s.role === role);
    if (!sig) continue;
    const signer = await userRepository.findByIdFull(sig.signerUserId);
    entries[key] = {
      name: signer?.name,
      imageUrl: isApproval ? undefined : await signatureImageDataUri(sig),
      ...(isApproval && { date: sig.signedAt, signatureText: signer?.name ?? undefined }),
    };
  }

  const sigGridHtml = buildSignatureGridHtml(requiredSigKeys, entries);
  const fullBodyHtml = resolveStaticImages(mergedHtml + sigGridHtml);
  const pdfBuffer = await renderHtmlToPdf(fullBodyHtml);

  const { file: finalFile } = await fileService.store(pdfBuffer, {
    originalName: `finalized-doc${docId}.pdf`, purpose: 'GENERATED_PDF',
    uploadedById: actorUserId ?? doc.generatedBy, ownerStudentId: doc.studentId,
  });

  return presentOne(await generatedDocRepository.updateFinalizedPdf(docId, finalFile.id, isApproval ? 'approval' : 'digital'), GENERATED_DOC_FILES);
};
