/**
 * Central file policy — the ONLY place that decides what a file purpose may
 * contain, who it belongs to, and which business slot may point at it.
 * Services never write their own exceptions; they call store()/claim() in
 * file.service, which apply these rules.
 */
import type { FilePurpose } from '@prisma/client';
import type { DetectedMime } from '../../utils/detectMime';

export type MimeGroup = 'image' | 'pdf' | 'imageOrPdf';
export type OwnerScope = 'student' | 'user';

const MB = 1024 * 1024;

const MIME_GROUPS: Record<MimeGroup, DetectedMime[]> = {
  image:      ['image/jpeg', 'image/png', 'image/webp'],
  pdf:        ['application/pdf'],
  imageOrPdf: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
};

export interface PurposePolicy {
  mime: MimeGroup;
  scope: OwnerScope;
  maxBytes: number;   // never above the 20 MB multer ceiling
  folder: string;     // bucket prefix for new objects
}

export const PURPOSE_POLICY: Record<FilePurpose, PurposePolicy> = {
  PASSPORT_IMAGE:            { mime: 'image',      scope: 'student', maxBytes: 5 * MB,  folder: 'passports' },
  VISA_IMAGE:                { mime: 'image',      scope: 'student', maxBytes: 5 * MB,  folder: 'visas' },
  VISA_ARRIVAL_STAMP:        { mime: 'image',      scope: 'student', maxBytes: 5 * MB,  folder: 'visas' },
  VISA_DEPARTURE_STAMP:      { mime: 'image',      scope: 'student', maxBytes: 5 * MB,  folder: 'visas' },
  VISA_PASSPORT_PAGE:        { mime: 'image',      scope: 'student', maxBytes: 5 * MB,  folder: 'visas' },
  INSURANCE_CARD:            { mime: 'image',      scope: 'student', maxBytes: 5 * MB,  folder: 'health-insurance' },
  ACADEMIC_DOCUMENT_PAGE:    { mime: 'imageOrPdf', scope: 'student', maxBytes: 10 * MB, folder: 'academic-docs' },
  DEPENDENT_PASSPORT_IMAGE:  { mime: 'image',      scope: 'student', maxBytes: 5 * MB,  folder: 'dependents' },
  DEPENDENT_VISA_IMAGE:      { mime: 'image',      scope: 'student', maxBytes: 5 * MB,  folder: 'dependents' },
  DEPENDENT_ARRIVAL_STAMP:   { mime: 'image',      scope: 'student', maxBytes: 5 * MB,  folder: 'dependents' },
  DEPENDENT_DEPARTURE_STAMP: { mime: 'image',      scope: 'student', maxBytes: 5 * MB,  folder: 'dependents' },
  DEPENDENT_DOCUMENT:        { mime: 'imageOrPdf', scope: 'student', maxBytes: 10 * MB, folder: 'dependents' },
  STUDENT_PHOTO:             { mime: 'image',      scope: 'student', maxBytes: 5 * MB,  folder: 'photos' },
  USER_PHOTO:                { mime: 'image',      scope: 'user',    maxBytes: 5 * MB,  folder: 'photos' },
  WORK_PERMIT:               { mime: 'imageOrPdf', scope: 'user',    maxBytes: 10 * MB, folder: 'work-permits' },
  GENERAL_DOCUMENT:          { mime: 'imageOrPdf', scope: 'student', maxBytes: 10 * MB, folder: 'documents' },
  REQUEST_ATTACHMENT:        { mime: 'imageOrPdf', scope: 'student', maxBytes: 10 * MB, folder: 'request-attachments' },
  GENERATED_PDF:             { mime: 'pdf',        scope: 'student', maxBytes: 20 * MB, folder: 'generated' },
  SIGNED_PDF:                { mime: 'pdf',        scope: 'student', maxBytes: 20 * MB, folder: 'signed' },
  SIGNATURE:                 { mime: 'image',      scope: 'user',    maxBytes: 5 * MB,  folder: 'signatures' },
};

export const mimeAllowed = (purpose: FilePurpose, mime: string) =>
  (MIME_GROUPS[PURPOSE_POLICY[purpose].mime] as string[]).includes(mime);

// ── Business slots ───────────────────────────────────────────────────────────
// A slot is one file column/relation on a business record. `accepts` is the
// only place a slot may take more than its own purpose; `editPermission` is what
// a non-owner (staff) actor needs to attach a file to it.

export interface SlotPolicy {
  accepts: FilePurpose[];
  scope: OwnerScope;
  editPermission: string;
}

export const SLOT_POLICY = {
  'passport.image':          { accepts: ['PASSPORT_IMAGE'],                      scope: 'student', editPermission: 'PASSPORT_MANAGEMENT.edit' },
  'visa.image':              { accepts: ['VISA_IMAGE'],                          scope: 'student', editPermission: 'VISA_MANAGEMENT.edit' },
  'visa.arrivalStamp':       { accepts: ['VISA_ARRIVAL_STAMP'],                  scope: 'student', editPermission: 'VISA_MANAGEMENT.edit' },
  'visa.departureStamp':     { accepts: ['VISA_DEPARTURE_STAMP'],                scope: 'student', editPermission: 'VISA_MANAGEMENT.edit' },
  // The visa form can reuse the passport photo already on file
  'visa.passportPage':       { accepts: ['VISA_PASSPORT_PAGE', 'PASSPORT_IMAGE'], scope: 'student', editPermission: 'VISA_MANAGEMENT.edit' },
  'insurance.cardFront':     { accepts: ['INSURANCE_CARD'],                      scope: 'student', editPermission: 'HEALTH_INSURANCE_MANAGEMENT.edit' },
  'insurance.cardBack':      { accepts: ['INSURANCE_CARD'],                      scope: 'student', editPermission: 'HEALTH_INSURANCE_MANAGEMENT.edit' },
  'academicDocument.page':   { accepts: ['ACADEMIC_DOCUMENT_PAGE'],              scope: 'student', editPermission: 'STUDENT_MANAGEMENT.edit' },
  'dependent.passportImage': { accepts: ['DEPENDENT_PASSPORT_IMAGE'],            scope: 'student', editPermission: 'STUDENT_MANAGEMENT.edit' },
  'dependent.visaImage':     { accepts: ['DEPENDENT_VISA_IMAGE'],                scope: 'student', editPermission: 'STUDENT_MANAGEMENT.edit' },
  'dependent.arrivalStamp':  { accepts: ['DEPENDENT_ARRIVAL_STAMP'],             scope: 'student', editPermission: 'STUDENT_MANAGEMENT.edit' },
  'dependent.departureStamp':{ accepts: ['DEPENDENT_DEPARTURE_STAMP'],           scope: 'student', editPermission: 'STUDENT_MANAGEMENT.edit' },
  'dependentDocument.file':  { accepts: ['DEPENDENT_DOCUMENT'],                  scope: 'student', editPermission: 'DOCUMENT_MANAGEMENT.edit' },
  'student.photo':           { accepts: ['STUDENT_PHOTO'],                       scope: 'student', editPermission: 'STUDENT_MANAGEMENT.edit' },
  'user.photo':              { accepts: ['USER_PHOTO'],                          scope: 'user',    editPermission: 'USER_MANAGEMENT.edit' },
  'advisor.workPermit':      { accepts: ['WORK_PERMIT'],                         scope: 'user',    editPermission: 'ADVISOR_MANAGEMENT.edit' },
  'document.file':           { accepts: ['GENERAL_DOCUMENT'],                    scope: 'student', editPermission: 'DOCUMENT_MANAGEMENT.edit' },
  'request.attachment':      { accepts: ['REQUEST_ATTACHMENT'],                  scope: 'student', editPermission: 'REQUEST_MANAGEMENT.edit' },
  'generatedDocument.file':  { accepts: ['GENERATED_PDF'],                       scope: 'student', editPermission: 'GENERATED_DOC_MANAGEMENT.edit' },
  // Holds either a hand-signed upload or the system-rendered signed version
  'generatedDocument.signedFile': { accepts: ['SIGNED_PDF', 'GENERATED_PDF'],    scope: 'student', editPermission: 'GENERATED_DOC_MANAGEMENT.edit' },
  'docSignature.image':      { accepts: ['SIGNATURE'],                           scope: 'user',    editPermission: 'GENERATED_DOC_MANAGEMENT.edit' },
  // Manual signing: the uploaded signed PDF is the proof of that signer's turn
  'docSignature.evidence':   { accepts: ['SIGNED_PDF'],                          scope: 'student', editPermission: 'GENERATED_DOC_MANAGEMENT.edit' },
} as const satisfies Record<string, SlotPolicy>;

export type FileSlot = keyof typeof SLOT_POLICY;

// ── Claim rules ──────────────────────────────────────────────────────────────

export type ClaimTarget =
  | { kind: 'student'; studentId: number }
  | { kind: 'user'; userId: number };

export interface ClaimActor {
  userId: number;
  activeRole: string;
  permissions: string[];
  studentId?: number | null;   // resolved by file.service when the actor is a student
}

export interface ClaimableFile {
  purpose: FilePurpose;
  ownerStudentId: number | null;
  ownerUserId: number | null;
  legacyUnowned: boolean;
  deletedAt: Date | null;
  mimeType: string;
}

/** Programmer errors (wrong target kind for a slot) throw; everything a client can cause returns false. */
export function canClaim(file: ClaimableFile | null, slot: FileSlot, target: ClaimTarget, actor: ClaimActor): boolean {
  const policy: SlotPolicy = SLOT_POLICY[slot];
  if (policy.scope !== target.kind) {
    throw new Error(`Slot ${slot} holds ${policy.scope} files but was given a ${target.kind} target`);
  }
  if (!file || file.deletedAt) return false;
  if (file.legacyUnowned) return false;
  if (!policy.accepts.includes(file.purpose)) return false;
  if (!mimeAllowed(file.purpose, file.mimeType)) return false;

  // Owner scope must be exactly the target — never both, never the other kind
  if (target.kind === 'student') {
    if (file.ownerStudentId !== target.studentId || file.ownerUserId !== null) return false;
  } else {
    if (file.ownerUserId !== target.userId || file.ownerStudentId !== null) return false;
  }

  // The actor must be allowed to change the target record; uploading the file is not enough
  if (target.kind === 'student' && actor.activeRole === 'STUDENT') {
    return actor.studentId === target.studentId;
  }
  if (target.kind === 'user' && actor.userId === target.userId) return true;
  return actor.permissions.includes(policy.editPermission);
}
