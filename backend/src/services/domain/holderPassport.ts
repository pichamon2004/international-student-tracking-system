/**
 * The passport a visa is in. The database keeps visas.passportId inside the same
 * account (composite FK on passportId + studentId); that it is the same *person's*
 * passport — the student's own, or that one dependent's — is checked here, on a
 * row locked for the rest of the transaction, so a passport deleted or moved
 * meanwhile can't slip through (the approval sees the data as it is now, not as
 * it was when the request was submitted).
 */
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

const conflict = (message: string) => Object.assign(new Error(message), { statusCode: 409 });

/** Lock a passport and confirm it is this holder's: studentId, and dependentId (null = the student). */
export async function assertHolderPassport(tx: Tx, passportId: number, studentId: number, dependentId: number | null): Promise<void> {
  const rows = await tx.$queryRaw<{ studentId: number; dependentId: number | null }[]>`
    SELECT studentId, dependentId FROM passports WHERE id = ${passportId} FOR UPDATE`;
  if (rows.length === 0) throw conflict('The passport this visa refers to no longer exists');
  if (rows[0].studentId !== studentId || (rows[0].dependentId ?? null) !== dependentId) {
    throw conflict('The passport belongs to someone other than the visa holder');
  }
}

/** The holder's current passport, locked; null when they have none yet. */
export async function currentHolderPassportId(tx: Tx, studentId: number, dependentId: number | null): Promise<number | null> {
  const rows = dependentId === null
    ? await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM passports WHERE studentId = ${studentId} AND dependentId IS NULL AND isCurrent = 1
        ORDER BY createdAt DESC LIMIT 1 FOR UPDATE`
    : await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM passports WHERE studentId = ${studentId} AND dependentId = ${dependentId} AND isCurrent = 1
        ORDER BY createdAt DESC LIMIT 1 FOR UPDATE`;
  return rows[0]?.id ?? null;
}

/**
 * passportId to write for a visa: the requested one if it is the holder's,
 * otherwise (none requested) the holder's current passport. `undefined` on update
 * means leave it as it is.
 */
export async function resolveVisaPassportId(
  tx: Tx,
  studentId: number,
  dependentId: number | null,
  requested: unknown,
  mode: 'create' | 'update'
): Promise<number | null | undefined> {
  if (requested === undefined || requested === '') {
    return mode === 'create' ? currentHolderPassportId(tx, studentId, dependentId) : undefined;
  }
  if (requested === null) return null;
  const id = Number(requested);
  if (!Number.isInteger(id)) throw Object.assign(new Error('passportId must be a passport id'), { statusCode: 400 });
  await assertHolderPassport(tx, id, studentId, dependentId);
  return id;
}

/** A passport still holding visas can't be deleted — they would lose the passport they are in. */
export async function assertPassportUnused(tx: Tx, passportId: number): Promise<void> {
  const rows = await tx.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM visas WHERE passportId = ${passportId}`;
  if (Number(rows[0]?.n ?? 0) > 0) throw conflict('This passport still has visas recorded in it — remove or move those first');
}
