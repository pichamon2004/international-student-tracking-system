/**
 * File fields of business records, declared once per entity and used for
 * reading (include + present), writing (claim) and change-request payloads.
 * The API keeps the URL field names it has always used; storage is the ...FileId relation.
 */
import type { Prisma } from '@prisma/client';
import * as fileService from './file.service';
import type { ClaimActor, ClaimTarget, FileSlot } from './filePolicy';

export interface FileField {
  urlField: string;   // the name the API has always used for this file's URL
  idField: string;    // ...FileId column
  relation: string;   // Prisma relation to File
  slot: FileSlot;
}

// Generic in the relation name so includeFiles() yields a typed Prisma include
const field = <R extends string>(urlField: string, idField: string, relation: R, slot: FileSlot): FileField & { relation: R } =>
  ({ urlField, idField, relation, slot });

export const PASSPORT_FILES = [field('imageUrl', 'imageFileId', 'imageFile', 'passport.image')];
export const VISA_FILES = [
  field('imageUrl', 'imageFileId', 'imageFile', 'visa.image'),
  field('arrivalImageUrl', 'arrivalStampFileId', 'arrivalStampFile', 'visa.arrivalStamp'),
  field('departedImageUrl', 'departureStampFileId', 'departureStampFile', 'visa.departureStamp'),
  field('passportImageUrl', 'passportPageFileId', 'passportPageFile', 'visa.passportPage'),
];
export const DEPENDENT_FILES = [
  field('passportImageUrl', 'passportImageFileId', 'passportImageFile', 'dependent.passportImage'),
  field('visaImageUrl', 'visaImageFileId', 'visaImageFile', 'dependent.visaImage'),
  field('arrivalImageUrl', 'arrivalStampFileId', 'arrivalStampFile', 'dependent.arrivalStamp'),
  field('departedImageUrl', 'departureStampFileId', 'departureStampFile', 'dependent.departureStamp'),
];
export const STUDENT_FILES = [field('photoUrl', 'photoFileId', 'photoFile', 'student.photo')];
export const ADVISOR_FILES = [field('workPermitFileUrl', 'workPermitFileId', 'workPermitFile', 'advisor.workPermit')];
export const GENERATED_DOC_FILES = [
  field('fileUrl', 'fileId', 'file', 'generatedDocument.file'),
  field('signedFileUrl', 'signedFileId', 'signedFile', 'generatedDocument.signedFile'),
];
export const DOCUMENT_FILES = [field('fileUrl', 'fileId', 'file', 'document.file')];
export const DEPENDENT_DOCUMENT_FILES = [field('fileUrl', 'fileId', 'file', 'dependentDocument.file')];

const FILE_REF = { select: { id: true, storageKey: true } } as const;

/** `include` for the file relations of an entity. */
export function includeFiles<const F extends readonly FileField[]>(fields: F): { [K in F[number]['relation']]: typeof FILE_REF } {
  return Object.fromEntries(fields.map(f => [f.relation, FILE_REF])) as never;
}

type Row = Record<string, unknown>;

/**
 * Relations → the URL fields the API has always returned.
 * Only for rows the caller is already allowed to see.
 */
export async function presentFileFields<T extends object>(rows: T[], fields: readonly FileField[]): Promise<T[]> {
  return Promise.all(rows.map(async (row) => {
    const out: Row = { ...(row as Row) };
    for (const f of fields) {
      out[f.urlField] = await fileService.urlFor(out[f.relation] as { id: number; storageKey: string } | null | undefined);
      delete out[f.relation];
    }
    return out as T;
  }));
}

export const presentOne = async <T extends object>(row: T, fields: readonly FileField[]) => (await presentFileFields([row], fields))[0];

/**
 * The file columns to write for whatever file fields `input` carries (URL or
 * fileId), claimed for `target` by `actor`. A field left out is not touched; an
 * empty one clears it.
 */
export async function resolveFileFields(
  input: Row,
  fields: readonly FileField[],
  target: ClaimTarget,
  actor: ClaimActor,
  db?: Prisma.TransactionClient
): Promise<Row> {
  const data: Row = {};
  for (const f of fields) {
    const ref = input[f.idField] !== undefined ? input[f.idField] : input[f.urlField];
    if (ref === undefined) continue;
    const file = await fileService.claim(ref as string | number | null, { slot: f.slot, target, actor }, db);
    data[f.idField] = file?.id ?? null;
  }
  return data;
}

/** The input without its file fields (URL or id), so the rest can be written as plain columns. */
export function withoutFileFields(input: Row, fields: readonly FileField[]): Row {
  const out = { ...input };
  for (const f of fields) { delete out[f.urlField]; delete out[f.idField]; }
  return out;
}

// ── Change-request payloads ──────────────────────────────────────────────────

/** Payload as stored: file URLs replaced by the fileIds they were claimed as. */
export async function toStoredPayloadFields(input: Row, fields: readonly FileField[], target: ClaimTarget, actor: ClaimActor): Promise<Row> {
  const resolved = await resolveFileFields(input, fields, target, actor);
  const out = withoutFileFields(input, fields);
  for (const f of fields) if (f.idField in resolved) out[f.idField] = resolved[f.idField];
  return out;
}

/** Stored payload back to the URL fields the frontend compares against. */
export async function presentPayloadFields(payload: Row, fields: readonly FileField[]): Promise<Row> {
  const out = { ...payload };
  for (const f of fields) {
    if (!(f.idField in out)) continue;
    const id = out[f.idField];
    out[f.urlField] = typeof id === 'number' ? await fileService.urlFor(await fileService.findRef(id)) : null;
    delete out[f.idField];
  }
  return out;
}

// ── User photo ───────────────────────────────────────────────────────────────

// Avatars a sign-in provider gives us; anything else in users.image is not shown
const EXTERNAL_AVATAR_ORIGINS = ['https://lh3.googleusercontent.com'];

/** An uploaded photo first, then the sign-in avatar. */
export async function userPhotoUrl(user: { image: string | null; imageFile?: { id: number; storageKey: string } | null }): Promise<string | null> {
  if (user.imageFile) return fileService.urlFor(user.imageFile);
  if (!user.image) return null;
  try {
    if (EXTERNAL_AVATAR_ORIGINS.includes(new URL(user.image).origin)) return user.image;
  } catch { /* not a URL */ }
  console.warn('[userPhotoUrl] users.image holds a URL from an unexpected origin — not shown');
  return null;
}
