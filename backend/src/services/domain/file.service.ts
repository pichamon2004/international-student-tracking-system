/**
 * The single way files enter and leave the system. Every upload goes through
 * store(); every reference a client sends back goes through claim(); every URL
 * handed out is produced by urlFor(). Rules live in filePolicy.ts.
 */
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Prisma, type File, type FilePurpose } from '@prisma/client';
import prisma from '../../utils/prisma';
import { detectMime, EXTENSION_BY_MIME } from '../../utils/detectMime';
import { putObject, deleteFromR2, downloadFromR2, keyFromUrl, getPresignedUrl } from '../external/r2.service';
import { PURPOSE_POLICY, mimeAllowed, canClaim, type FileSlot, type ClaimTarget, type ClaimActor } from './filePolicy';

type Db = Prisma.TransactionClient | typeof prisma;

type FileOwner =
  | { ownerStudentId: number; ownerUserId?: never }
  | { ownerUserId: number; ownerStudentId?: never };

export type StoreFileInput = {
  originalName?: string;
  purpose: FilePurpose;
  uploadedById: number;     // required for every new upload
} & FileOwner;

export type FileRef = Pick<File, 'id' | 'storageKey'>;

const badFile = (message: string) => Object.assign(new Error(message), { statusCode: 400 });

// One message for every claim failure, so a client can't probe which files exist
const NOT_USABLE = 'This file cannot be used here';

export async function store(buffer: Buffer, input: StoreFileInput): Promise<{ file: File; url: string }> {
  const policy = PURPOSE_POLICY[input.purpose];
  const ownerStudentId = 'ownerStudentId' in input ? input.ownerStudentId ?? null : null;
  const ownerUserId = 'ownerUserId' in input ? input.ownerUserId ?? null : null;

  // Wrong owner kind for the purpose is a bug in the caller, not a client error
  if ((policy.scope === 'student') !== (ownerStudentId !== null) || (ownerStudentId !== null) === (ownerUserId !== null)) {
    throw new Error(`store(${input.purpose}) needs exactly one ${policy.scope} owner`);
  }
  if (buffer.length === 0) throw badFile('The file is empty');
  if (buffer.length > policy.maxBytes) {
    throw badFile(`The file is too large (max ${Math.round(policy.maxBytes / 1024 / 1024)} MB)`);
  }
  const mimeType = detectMime(buffer);
  if (!mimeType || !mimeAllowed(input.purpose, mimeType)) {
    throw badFile(policy.mime === 'pdf' ? 'Only PDF files are allowed'
      : policy.mime === 'image' ? 'Only JPEG, PNG, and WebP images are allowed'
      : 'Only images (JPEG, PNG, WebP) and PDF files are allowed');
  }

  const storageKey = `${policy.folder}/${uuidv4()}.${EXTENSION_BY_MIME[mimeType]}`;
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  await putObject(storageKey, buffer, mimeType);
  try {
    const file = await prisma.file.create({
      data: {
        storageKey,
        originalName: input.originalName?.slice(0, 191) ?? null,
        mimeType,
        sizeBytes: buffer.length,
        checksum,
        uploadedById: input.uploadedById,
        purpose: input.purpose,
        ownerStudentId,
        ownerUserId,
      },
    });
    return { file, url: (await urlFor(file))! };
  } catch (err) {
    // Don't leave an object in the bucket that no row knows about
    await deleteFromR2(storageKey).catch(() => {
      console.warn(`[file.store] could not remove orphaned object after a failed insert: ${storageKey}`);
    });
    throw err;
  }
}

// How long a URL handed to a client stays valid; long enough to view a page, short enough that a leaked link soon dies
const URL_TTL_SECONDS = Number(process.env.FILE_URL_TTL_SECONDS) > 0 ? Number(process.env.FILE_URL_TTL_SECONDS) : 15 * 60;

/**
 * A short-lived signed URL for the file. Not an access check — only call it
 * (via presentFiles/presentFileFields) for records the caller has already been
 * authorised to see, or after fileAccess has said yes.
 */
export async function urlFor(file: FileRef | null | undefined): Promise<string | null> {
  return file ? getPresignedUrl(file.storageKey, URL_TTL_SECONDS) : null;
}

/**
 * Replace file relations on already-authorised rows with the URL fields the API
 * has always returned, e.g. presentFiles(visas, { imageFile: 'imageUrl' }).
 */
export async function presentFiles<T extends object, M extends Partial<Record<keyof T, string>>>(
  rows: T[],
  mapping: M
): Promise<(Omit<T, keyof M> & Record<string, string | null>)[]> {
  return Promise.all(rows.map(async (row) => {
    const out: Record<string, unknown> = { ...(row as Record<string, unknown>) };
    for (const [relation, urlField] of Object.entries(mapping) as [string, string][]) {
      out[urlField] = await urlFor(out[relation] as FileRef | null);
      delete out[relation];
    }
    return out as Omit<T, keyof M> & Record<string, string | null>;
  }));
}

/**
 * Resolve a reference a client sent back (an upload URL or a fileId) to a File
 * that may be attached to `slot` on `target` by `actor`. Returns null only for
 * an empty ref; anything unusable is a 400 with the same message.
 * Pass `db` (a transaction) to lock the file row until the caller commits.
 */
export async function claim(
  ref: string | number | null | undefined,
  opts: { slot: FileSlot; target: ClaimTarget; actor: ClaimActor },
  db?: Prisma.TransactionClient
): Promise<File | null> {
  if (ref === null || ref === undefined || ref === '') return null;
  const client: Db = db ?? prisma;

  let file: File | null = null;
  if (typeof ref === 'number' || /^\d+$/.test(String(ref))) {
    file = await findForClaim(client, { id: Number(ref) }, !!db);
  } else {
    const key = keyFromUrl(String(ref));
    if (key) file = await findForClaim(client, { storageKey: key }, !!db);
  }

  const actor = { ...opts.actor };
  if (actor.activeRole === 'STUDENT' && actor.studentId === undefined) {
    const me = await client.student.findUnique({ where: { userId: actor.userId }, select: { id: true } });
    actor.studentId = me?.id ?? null;
  }

  if (!canClaim(file, opts.slot, opts.target, actor)) throw badFile(NOT_USABLE);
  return file;
}

// Inside a transaction, lock the row so a concurrent soft-delete waits for us
async function findForClaim(client: Db, where: { id: number } | { storageKey: string }, lock: boolean): Promise<File | null> {
  if (lock) {
    const rows = 'id' in where
      ? await client.$queryRaw<{ id: number }[]>`SELECT id FROM files WHERE id = ${where.id} FOR UPDATE`
      : await client.$queryRaw<{ id: number }[]>`SELECT id FROM files WHERE storageKey = ${where.storageKey} FOR UPDATE`;
    if (rows.length === 0) return null;
    return client.file.findUnique({ where: { id: rows[0].id } });
  }
  return client.file.findUnique({ where });
}

export const findRef = (id: number): Promise<FileRef | null> =>
  prisma.file.findUnique({ where: { id }, select: { id: true, storageKey: true } });

export async function readBuffer(file: FileRef): Promise<Buffer> {
  return downloadFromR2(file.storageKey);
}

/** Files are never hard-deleted on request; the object stays until the cleanup job decides. */
export async function softDelete(fileId: number, db?: Prisma.TransactionClient): Promise<void> {
  const client: Db = db ?? prisma;
  await client.$executeRaw`UPDATE files SET deletedAt = NOW(3) WHERE id = ${fileId} AND deletedAt IS NULL`;
}
