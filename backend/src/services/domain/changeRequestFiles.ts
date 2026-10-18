/**
 * File fields inside change-request payloads. On submit, the URLs the forms
 * send are claimed (as the student) and stored as fileIds; on read, the fileIds
 * are presented back under the URL field names the frontend compares against.
 * Entity types not listed here (migrated in later groups) pass through as-is.
 */
import prisma from '../../utils/prisma';
import * as fileService from './file.service';
import type { ClaimActor } from './filePolicy';
import { resolveCardFiles } from './healthInsurance.service';
import { resolvePageFiles } from './academicDocument.service';
import {
  type FileField, DEPENDENT_FILES, PASSPORT_FILES, STUDENT_FILES, VISA_FILES,
  presentPayloadFields, toStoredPayloadFields,
} from './fileFields';

type Payload = Record<string, unknown>;

// Entities whose file fields are declared in fileFields.ts
const FIELD_SPECS: Record<string, readonly FileField[]> = {
  PASSPORT: PASSPORT_FILES,
  VISA: VISA_FILES,
  DEPENDENT: DEPENDENT_FILES,
  STUDENT_PROFILE: STUDENT_FILES,
};

const MIGRATED_ENTITY_TYPES = new Set(['HEALTH_INSURANCE', 'ACADEMIC_DOCUMENT', ...Object.keys(FIELD_SPECS)]);

export const hasFileFields = (entityType: string) => MIGRATED_ENTITY_TYPES.has(entityType);

/** Replace file URLs in a submitted payload with fileIds the student may use. */
export async function toStoredPayload(entityType: string, studentId: number, body: Payload, actor: ClaimActor): Promise<Payload> {
  const spec = FIELD_SPECS[entityType];
  if (spec) return toStoredPayloadFields(body, spec, { kind: 'student', studentId }, actor);
  const out: Payload = { ...body };
  if (entityType === 'HEALTH_INSURANCE') {
    const files = await resolveCardFiles(studentId, body, actor);
    delete out.fileUrl; delete out.backFileUrl;
    if (files.cardFrontFileId !== undefined) out.cardFrontFileId = files.cardFrontFileId;
    if (files.cardBackFileId !== undefined) out.cardBackFileId = files.cardBackFileId;
  } else if (entityType === 'ACADEMIC_DOCUMENT') {
    const pages = await resolvePageFiles(studentId, body, actor);
    delete out.fileUrl; delete out.pageUrls;
    if (pages !== undefined) out.pageFileIds = pages;
  }
  return out;
}

async function urlsById(ids: number[]): Promise<Map<number, string | null>> {
  const files = ids.length ? await prisma.file.findMany({ where: { id: { in: ids } }, select: { id: true, storageKey: true } }) : [];
  return new Map(await Promise.all(files.map(async f => [f.id, await fileService.urlFor(f)] as const)));
}

/**
 * fileIds back to the URL fields the frontend expects. Only for change requests
 * the caller may already see. Payloads stored before the migration still hold URLs and pass through.
 */
export async function presentPayload(entityType: string, payload: unknown): Promise<unknown> {
  if (!hasFileFields(entityType) || !payload || typeof payload !== 'object') return payload;
  const spec = FIELD_SPECS[entityType];
  if (spec) return presentPayloadFields(payload as Payload, spec);
  const p = { ...(payload as Payload) };
  if (entityType === 'HEALTH_INSURANCE') {
    const urls = await urlsById([p.cardFrontFileId, p.cardBackFileId].filter((x): x is number => typeof x === 'number'));
    if ('cardFrontFileId' in p) { p.fileUrl = typeof p.cardFrontFileId === 'number' ? urls.get(p.cardFrontFileId) ?? null : null; delete p.cardFrontFileId; }
    if ('cardBackFileId' in p) { p.backFileUrl = typeof p.cardBackFileId === 'number' ? urls.get(p.cardBackFileId) ?? null : null; delete p.cardBackFileId; }
  } else if (entityType === 'ACADEMIC_DOCUMENT' && Array.isArray(p.pageFileIds)) {
    const ids = p.pageFileIds.filter((x): x is number => typeof x === 'number');
    const map = await urlsById(ids);
    const urls = ids.map(id => map.get(id)).filter((u): u is string => !!u);
    p.fileUrl = urls[0] ?? null;
    p.pageUrls = urls.length ? JSON.stringify(urls) : null;
    delete p.pageFileIds;
  }
  return p;
}

export async function presentChangeRequest<T extends { entityType: string; payload: unknown }>(cr: T): Promise<T>;
export async function presentChangeRequest<T extends { entityType: string; payload: unknown }>(cr: T | null): Promise<T | null>;
export async function presentChangeRequest<T extends { entityType: string; payload: unknown }>(cr: T | null): Promise<T | null> {
  return cr ? { ...cr, payload: await presentPayload(cr.entityType, cr.payload) } : null;
}
