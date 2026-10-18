import type { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import * as academicDocumentRepository from '../../repositories/academicDocument.repository';
import * as fileService from './file.service';
import type { ClaimActor } from './filePolicy';

// What the client sends for the pages: the forms send fileUrl (page 0) and
// pageUrls (JSON string[] of upload URLs); pageFileIds is the fileId form.
export interface PageFileInput {
  fileUrl?: string | null;
  pageUrls?: string | null;
  pageFileIds?: number[] | null;
}

type DocRow = Awaited<ReturnType<typeof academicDocumentRepository.findByStudentId>>[number];

/** Pages back as the fileUrl (thumbnail) and pageUrls JSON the API has always returned. */
export async function presentAcademicDocuments(rows: DocRow[]) {
  return Promise.all(rows.map(async ({ pages, ...doc }) => {
    const urls = (await Promise.all(pages.map(p => fileService.urlFor(p.file)))).filter((u): u is string => !!u);
    return { ...doc, fileUrl: urls[0] ?? null, pageUrls: urls.length ? JSON.stringify(urls) : null };
  }));
}

const bad = (message: string) => Object.assign(new Error(message), { statusCode: 400 });

// The page references in the order sent, or undefined when the request doesn't touch the pages
function pageRefs(dto: PageFileInput): (string | number)[] | undefined {
  if (dto.pageFileIds !== undefined) return dto.pageFileIds ?? [];
  if (dto.pageUrls) {
    let parsed: unknown;
    try { parsed = JSON.parse(dto.pageUrls); } catch { throw bad('pageUrls must be a JSON array of URLs'); }
    if (!Array.isArray(parsed) || !parsed.every(u => typeof u === 'string' && u)) throw bad('pageUrls must be a JSON array of URLs');
    return parsed as string[];
  }
  if (dto.fileUrl !== undefined) return dto.fileUrl ? [dto.fileUrl] : [];
  if (dto.pageUrls === null) return [];
  return undefined;
}

/** fileIds of the pages this student may use, in order; undefined = leave the pages as they are. */
export async function resolvePageFiles(
  studentId: number,
  dto: PageFileInput,
  actor: ClaimActor,
  db?: Prisma.TransactionClient
): Promise<number[] | undefined> {
  const refs = pageRefs(dto);
  if (refs === undefined) return undefined;
  const ids: number[] = [];
  for (const ref of refs) {
    const file = await fileService.claim(ref, { slot: 'academicDocument.page', target: { kind: 'student', studentId }, actor }, db);
    if (file) ids.push(file.id);
  }
  return ids;
}

const inTx = <T>(db: Prisma.TransactionClient | undefined, fn: (tx: Prisma.TransactionClient) => Promise<T>) =>
  db ? fn(db) : prisma.$transaction(fn);

export const getAcademicDocuments = async (studentId: number) =>
  presentAcademicDocuments(await academicDocumentRepository.findByStudentId(studentId));

export const createAcademicDocument = async (
  studentId: number,
  dto: PageFileInput & { docType: string; institution: string; issueDate: string | Date },
  actor: ClaimActor,
  db?: Prisma.TransactionClient
) => {
  if (!dto.docType || !dto.institution || !dto.issueDate) {
    throw Object.assign(new Error('docType, institution, and issueDate are required'), { statusCode: 400 });
  }

  const doc = await inTx(db, async (tx) => {
    const pages = await resolvePageFiles(studentId, dto, actor, tx);
    const created = await academicDocumentRepository.createForStudent({
      studentId,
      docType: dto.docType,
      institution: dto.institution,
      issueDate: new Date(dto.issueDate),
    }, tx);
    if (pages) await academicDocumentRepository.replacePages(created.id, pages, tx);
    return academicDocumentRepository.findWithPages(created.id, tx);
  });
  return (await presentAcademicDocuments([doc]))[0];
};

export const updateAcademicDocument = async (
  docId: number,
  studentId: number,
  dto: PageFileInput & { docType?: string; institution?: string; issueDate?: string | Date },
  actor: ClaimActor,
  db?: Prisma.TransactionClient
) => {
  const doc = await inTx(db, async (tx) => {
    if (!(await academicDocumentRepository.lockByIdAndStudentId(docId, studentId, tx))) {
      throw Object.assign(new Error('Academic document not found'), { statusCode: 404 });
    }
    const pages = await resolvePageFiles(studentId, dto, actor, tx);
    await academicDocumentRepository.updateById(docId, {
      docType: dto.docType,
      institution: dto.institution,
      issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
    }, tx);
    // Replaced page files stay in `files` — the cleanup job decides what is unreferenced
    if (pages) await academicDocumentRepository.replacePages(docId, pages, tx);
    return academicDocumentRepository.findWithPages(docId, tx);
  });
  return (await presentAcademicDocuments([doc]))[0];
};

export const deleteAcademicDocument = async (docId: number, studentId: number, db?: Prisma.TransactionClient) => {
  const existing = await academicDocumentRepository.findByIdAndStudentId(docId, studentId, db);
  if (!existing) {
    throw Object.assign(new Error('Academic document not found'), { statusCode: 404 });
  }

  return academicDocumentRepository.removeById(docId, db);
};
